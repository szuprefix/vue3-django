import { expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Search from '../src/components/model/Search.vue'
import ModelTable from '../src/components/model/Table.vue'
import { vi } from 'vitest'
import { DjangoKey } from '../src/composables/context.js'

it('搜索无操作按钮，值变化自动查询，保留 placeholder、false 和清空', async () => {
  const model = {
    loadOptions: async () => ({
      actions: { SEARCH: { search_fields: ['名称'], filter_fields: ['name', 'enabled'] } },
    }),
    fields: async () => ({
      name: { label: '名称', type: 'string', lookups: ['exact'] },
      enabled: { label: '启用', type: 'boolean' },
    }),
    loadViewsConfig: async () => ({ search: { name: { width: 240 } } }),
  }
  const wrapper = mount(Search, {
    props: { appModel: 'demo.project' },
    global: { provide: { [DjangoKey]: { registry: { get: () => model } } } },
  })
  await flushPromises()
  expect(wrapper.find('.vd-search-actions').exists()).toBe(false)
  expect(wrapper.findAll('.vd-search-field')[2].attributes('style')).toContain('240px')
  expect(wrapper.find('input[placeholder="请输入名称"]').exists()).toBe(true)
  await wrapper.find('input[placeholder="请输入名称"]').setValue('项目')
  expect(wrapper.emitted('change')[0]).toEqual([{ name: '项目' }])
  wrapper.findComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', false)
  expect(wrapper.emitted('change').at(-1)).toEqual([{ name: '项目', enabled: false }])
  await wrapper.find('form').trigger('submit')
  expect(wrapper.emitted('change')).toHaveLength(2)
  await wrapper.vm.reset()
  expect(wrapper.emitted('change').at(-1)).toEqual([{}])
  wrapper.unmount()
})

it('隐藏指向未注册模型的搜索字段，保留已注册的关联字段', async () => {
  const model = {
    loadOptions: async () => ({ actions: { SEARCH: { filter_fields: ['user', 'category'] } } }),
    fields: async () => ({
      user: { label: '用户', model: 'auth.user' },
      category: { label: '类别', model: 'course.category' },
    }),
    loadViewsConfig: async () => ({}),
    query: async () => [],
  }
  const wrapper = mount(Search, {
    props: { appModel: 'course.course' },
    global: {
      provide: {
        [DjangoKey]: {
          registry: {
            get: () => model,
            getConfig: (name) => {
              if (name === 'auth.user') throw new Error('model auth.user not found!')
              return {}
            },
          },
        },
      },
    },
  })
  await flushPromises()
  expect(wrapper.findAll('.vd-search-field')).toHaveLength(1)
  expect(wrapper.findComponent({ name: 'ElSelect' }).props('placeholder')).toBe('请选择类别')
  expect(wrapper.text()).not.toContain('not found')
  wrapper.unmount()
})

it('刷新 exclude/字段配置保留输入和查询去重，切换模型才清空', async () => {
  const model = {
    loadOptions: async () => ({
      actions: { SEARCH: { search_fields: ['名称'], filter_fields: ['name'] } },
    }),
    fields: async () => ({ name: { label: '名称', type: 'string', lookups: ['exact'] } }),
    loadViewsConfig: async () => ({}),
  }
  const wrapper = mount(Search, {
    props: { appModel: 'demo.project', exclude: {} },
    global: { provide: { [DjangoKey]: { registry: { get: () => model } } } },
  })
  await flushPromises()
  await wrapper.find('input[placeholder="请输入名称"]').setValue('项目')
  const previous = wrapper.emitted('change').length
  await wrapper.setProps({ exclude: {} })
  await flushPromises()
  expect(wrapper.find('input[placeholder="请输入名称"]').element.value).toBe('项目')
  await wrapper.setProps({ items: ['name'] })
  await flushPromises()
  expect(wrapper.find('input[placeholder="请输入名称"]').element.value).toBe('项目')
  await wrapper.find('form').trigger('submit')
  expect(wrapper.emitted('change')).toHaveLength(previous)
  await wrapper.setProps({ appModel: 'demo.task' })
  await flushPromises()
  expect(wrapper.find('input[placeholder="请输入名称"]').element.value).toBe('')
  wrapper.unmount()
})

it('ModelTable 查询和刷新后，搜索控件仍回显当前条件', async () => {
  const query = vi.fn().mockResolvedValue({ count: 0, results: [] })
  const model = {
    loadOptions: async () => ({
      actions: { SEARCH: { search_fields: ['名称'], filter_fields: ['name'] } },
    }),
    fields: async () => ({ name: { label: '名称', type: 'string', lookups: ['exact'] } }),
    loadViewsConfig: async () => ({ list: { baseQueries: { active: true } } }),
    query,
  }
  const wrapper = mount(ModelTable, {
    props: { appModel: 'demo.project' },
    global: {
      provide: { [DjangoKey]: { registry: { get: () => model, getConfig: () => ({}) } } },
      stubs: { ElTable: true, ElPagination: true, Drawer: true },
    },
  })
  await flushPromises()
  await wrapper.find('input[placeholder="请输入名称"]').setValue('项目')
  await flushPromises()
  expect(query.mock.calls.at(-1)[0]).toMatchObject({ name: '项目', active: true })
  expect(wrapper.find('input[placeholder="请输入名称"]').element.value).toBe('项目')
  await wrapper.vm.refresh()
  await flushPromises()
  expect(wrapper.find('input[placeholder="请输入名称"]').element.value).toBe('项目')
  wrapper.unmount()
})
