import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ModelForm from '../src/components/model/Form.vue'
import ModelTable from '../src/components/model/Table.vue'
import { createRegistry } from '../src/core/registry.js'
import { DjangoKey } from '../src/composables/context.js'
import { DrfError } from '../src/core/http.js'
const fields = {
  name: { type: 'string', label: '名称', required: true },
  enabled: { type: 'boolean', default: false },
}
function registry(http) {
  return createRegistry({
    http,
    apps: { demo: { models: { project: { rest_options: { actions: { POST: fields } } } } } },
  })
}
function mountForm(http, mobile = false) {
  return mount(ModelForm, {
    props: { appModel: 'demo.project', mobile },
    global: { provide: { [DjangoKey]: { registry: registry(http) } } },
  })
}
describe('同一模型的桌面和移动表单', () => {
  it('ModelForm 复用通用 Form 并透传字段与提交插槽', async () => {
    const http = {
      post: vi.fn().mockResolvedValue({ data: { id: 3, name: '插槽值', enabled: false } }),
    }
    const wrapper = mount(ModelForm, {
      props: { appModel: 'demo.project' },
      slots: {
        'field-name':
          '<template #field-name="{ update }"><button type="button" class="custom-field" @click="update(\'插槽值\')">自定义字段</button></template>',
        submit:
          '<template #submit="{ submit }"><button type="button" class="custom-submit" @click="submit">自定义保存</button></template>',
      },
      global: { provide: { [DjangoKey]: { registry: registry(http) } } },
    })
    await flushPromises()
    await wrapper.find('.custom-field').trigger('click')
    await wrapper.find('.custom-submit').trigger('click')
    await flushPromises()
    expect(http.post).toHaveBeenCalledWith('demo/project/', { name: '插槽值', enabled: false })
    expect(wrapper.emitted('form-posted')[0][0].intent).toBe('save')
    wrapper.unmount()
  })
  for (const mobile of [false, true]) {
    it(`${mobile ? 'Vant' : 'Element Plus'} 保存并回显 DRF 错误`, async () => {
      const http = {
        post: vi
          .fn()
          .mockRejectedValueOnce(
            new DrfError({ response: { status: 400, data: { name: ['名称已存在'] } } }),
          )
          .mockResolvedValue({ data: { id: 1, name: '新名称', enabled: false } }),
      }
      const wrapper = mountForm(http, mobile)
      await flushPromises()
      wrapper.vm.data.name = '重复名称'
      await wrapper.vm.submit()
      await flushPromises()
      // Element Plus delays error text by 100ms to avoid validation flicker.
      if (!mobile) {
        await new Promise((resolve) => setTimeout(resolve, 120))
        await flushPromises()
      }
      expect(wrapper.text()).toContain('名称已存在')
      wrapper.vm.data.name = '新名称'
      await wrapper.vm.submit()
      await flushPromises()
      expect(wrapper.emitted('form-posted')[0][0].data.id).toBe(1)
      expect(http.post).toHaveBeenLastCalledWith('demo/project/', {
        name: '新名称',
        enabled: false,
      })
      wrapper.unmount()
    })
  }
  it('必填校验阻止空请求，允许布尔 false', async () => {
    const http = { post: vi.fn() }
    const wrapper = mountForm(http)
    await flushPromises()
    await wrapper.vm.submit()
    expect(wrapper.vm.errors.name).toBe('不能为空')
    expect(http.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('查询列表并传递编辑行', async () => {
    const http = {
      get: vi
        .fn()
        .mockResolvedValue({ data: { count: 1, results: [{ id: 0, name: '测试项目' }] } }),
    }
    const wrapper = mount(ModelTable, {
      props: { appModel: 'demo.project' },
      global: { provide: { [DjangoKey]: { registry: registry(http) } } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('测试项目')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '编辑')
      .trigger('click')
    expect(wrapper.emitted('edit')[0][0].id).toBe(0)
    wrapper.unmount()
  })
})

it('后发查询完成后，较早的慢请求不能覆盖列表', async () => {
  let finishOld
  const old = new Promise((resolve) => {
    finishOld = resolve
  })
  const http = {
    get: vi
      .fn()
      .mockReturnValueOnce(old)
      .mockResolvedValueOnce({ data: { count: 1, results: [{ id: 2, name: '最新结果' }] } }),
  }
  const wrapper = mount(ModelTable, {
    props: { appModel: 'demo.project' },
    global: { provide: { [DjangoKey]: { registry: registry(http) } } },
  })
  await wrapper.vm.refresh()
  await flushPromises()
  finishOld({ data: { count: 1, results: [{ id: 1, name: '过期结果' }] } })
  await flushPromises()
  expect(wrapper.text()).toContain('最新结果')
  expect(wrapper.text()).not.toContain('过期结果')
  wrapper.unmount()
})
