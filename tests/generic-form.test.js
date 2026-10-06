import { it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Form from '../src/components/form/Form.vue'
import { DjangoKey } from '../src/composables/context.js'

it('通用表单校验阻止请求，提交事件与 DRF 字段错误兼容', async () => {
  const request = vi.fn().mockResolvedValue({ data: { id: 1 } })
  const wrapper = mount(Form, {
    props: { modelValue: { name: '' }, items: [{ name: 'name', required: true }], url: 'custom/' },
    global: { provide: { [DjangoKey]: { registry: { http: { request } } } } },
  })
  await flushPromises()
  await wrapper.vm.onSubmit()
  expect(request).not.toHaveBeenCalled()
  await wrapper.find('input').setValue('测试')
  await wrapper.vm.onSubmit()
  expect(request).toHaveBeenCalledWith({ url: 'custom/', method: 'post', data: { name: '测试' } })
  expect(wrapper.emitted('form-posted')[0]).toEqual([{ id: 1 }])
  request.mockRejectedValue({ code: 400, msg: { name: ['已存在'] } })
  await wrapper.vm.onSubmit()
  await new Promise((resolve) => setTimeout(resolve, 120))
  await flushPromises()
  expect(wrapper.text()).toContain('已存在')
  wrapper.unmount()
})

it('自定义提交接收旧表单上下文，false 不触发成功事件', async () => {
  const submit = vi.fn().mockResolvedValue(false)
  const wrapper = mount(Form, { props: { value: { name: 'A' }, items: ['name'], submit } })
  await wrapper.vm.onSubmit()
  expect(submit.mock.calls[0][0].formValue).toEqual({ name: 'A' })
  expect(wrapper.emitted('form-posted')).toBeUndefined()
  expect(wrapper.vm.loading).toBe(false)
  wrapper.unmount()
})
