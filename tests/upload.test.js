import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createUploadService, storageUpload } from '../src/core/upload.js'
import FileUpload from '../src/components/media/FileUpload.vue'
import Form from '../src/components/form/Form.vue'
import { DjangoKey } from '../src/composables/context.js'

afterEach(() => vi.unstubAllGlobals())

it('申请、直传、确认分离，只有确认成功返回稳定 URL', async () => {
  const post = vi
    .fn()
    .mockResolvedValueOnce({
      data: { uploadId: 'u1', method: 'put', url: 'https://storage.test/signed' },
    })
    .mockResolvedValueOnce({ data: { url: '/media/stable.jpg', id: 1 } })
  const progress = vi.fn()
  const transport = vi.fn(async ({ onProgress }) => onProgress(100))
  const service = createUploadService({ http: { post }, transport })
  const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
  expect(await service.upload(file, { purpose: 'cover', onProgress: progress })).toEqual({
    url: '/media/stable.jpg',
    id: 1,
  })
  expect(post.mock.calls[0][1]).toMatchObject({ name: 'a.jpg', size: 1, purpose: 'cover' })
  expect(post.mock.calls[1][1]).toEqual({ uploadId: 'u1' })
  expect(transport.mock.calls[0][0].plan.method).toBe('PUT')
  expect(progress.mock.calls.map(([value]) => value)).toEqual([95, 100])
})

it('直传失败不确认、不发布 URL，取消也不确认', async () => {
  const post = vi.fn().mockResolvedValue({ data: { uploadId: 'u1', url: 'https://storage.test/' } })
  const file = new File(['x'], 'a.txt')
  const service = createUploadService({
    http: { post },
    transport: async () => {
      throw new Error('failed')
    },
  })
  await expect(service.upload(file)).rejects.toThrow('failed')
  expect(post).toHaveBeenCalledTimes(1)
  const controller = new AbortController()
  const cancelled = createUploadService({
    http: { post },
    transport: async () => controller.abort(),
  })
  await expect(cancelled.upload(file, { signal: controller.signal })).rejects.toMatchObject({
    name: 'AbortError',
  })
  expect(post).toHaveBeenCalledTimes(2)
})

it('对象存储请求不携带认证，支持 PUT 和 POST 表单字段', async () => {
  const instances = []
  class XHR {
    upload = {}
    status = 204
    headers = {}
    constructor() {
      instances.push(this)
    }
    open(method, url) {
      this.method = method
      this.url = url
    }
    setRequestHeader(key, value) {
      this.headers[key] = value
    }
    send(body) {
      this.body = body
      this.onload()
    }
  }
  vi.stubGlobal('XMLHttpRequest', XHR)
  const file = new File(['x'], 'a.jpg')
  await storageUpload({
    file,
    plan: {
      url: 'https://storage.test/',
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
    },
  })
  expect(instances[0].withCredentials).toBe(false)
  expect(instances[0].body).toBe(file)
  await storageUpload({
    file,
    plan: { url: 'https://storage.test/', method: 'POST', fields: { policy: 'signed' } },
  })
  expect(instances[1].body.get('policy')).toBe('signed')
  expect(instances[1].body.get('file').name).toBe('a.jpg')
  await expect(
    storageUpload({
      file,
      plan: { url: 'https://storage.test/', method: 'PUT', headers: { Authorization: 'secret' } },
    }),
  ).rejects.toThrow('认证')
})

it('控件上传确认后更新 URL，移除只更新表单不删除存储对象', async () => {
  const upload = vi.fn().mockResolvedValue({ url: '/media/a.txt' })
  const wrapper = mount(FileUpload, { props: { service: { upload }, field: { multiple: true } } })
  const input = wrapper.find('input')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['x'], 'a.txt')],
    configurable: true,
  })
  await input.trigger('change')
  await flushPromises()
  expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([['/media/a.txt']])
  expect(wrapper.emitted('uploading').map(([value]) => value)).toEqual([true, false])
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '移除')
    .trigger('click')
  expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([[]])
  wrapper.unmount()
})

it('表单在上传期间阻止保存', async () => {
  const submit = vi.fn()
  const wrapper = mount(Form, {
    props: { modelValue: { file: null }, items: [{ name: 'file', widget: 'FileUpload' }], submit },
    global: { provide: { [DjangoKey]: { registry: {} } } },
  })
  wrapper.findComponent(FileUpload).vm.$emit('uploading', true)
  await wrapper.vm.onSubmit()
  expect(submit).not.toHaveBeenCalled()
  wrapper.unmount()
})

it('失败保留重试入口，不发布值；重试成功后发布值', async () => {
  const upload = vi
    .fn()
    .mockRejectedValueOnce(new Error('网络中断'))
    .mockResolvedValueOnce({ url: '/media/a.txt' })
  const wrapper = mount(FileUpload, { props: { service: { upload } } })
  const input = wrapper.find('input')
  Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'a.txt')] })
  await input.trigger('change')
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(wrapper.find('[role="alert"]').text()).toBe('网络中断')
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '重试')
    .trigger('click')
  await flushPromises()
  expect(wrapper.emitted('update:modelValue').at(-1)).toEqual(['/media/a.txt'])
  wrapper.unmount()
})
