import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import Table from '../src/components/model/Table.vue'
import { DjangoKey } from '../src/composables/context.js'

function setup(props = {}) {
  const open = vi.fn().mockResolvedValue(undefined)
  const query = vi.fn().mockResolvedValue({ count: 0, results: [] })
  const model = {
    fields: async () => ({ name: { name: 'name', type: 'string' } }),
    loadViewsConfig: async () => ({}),
    query,
  }
  const drawer = defineComponent({
    setup(_, { expose }) {
      expose({ open })
      return () => null
    },
  })
  const wrapper = mount(Table, {
    props: {
      appModel: 'demo.project',
      baseQueries: { category: 1 },
      createDefaults: { name: '默认' },
      ...props,
    },
    global: {
      provide: {
        [DjangoKey]: {
          registry: { get: () => model, getConfig: () => ({ verbose_name: '项目' }) },
        },
      },
      stubs: { Drawer: drawer, ModelSearch: true, ElTable: true, ElPagination: true },
    },
  })
  return { wrapper, open, query }
}

it('列表新增打开抽屉并传默认值，保存后刷新且不触发编辑', async () => {
  const { wrapper, open, query } = setup()
  await flushPromises()
  await wrapper.find('button').trigger('click')
  const options = open.mock.calls[0][0]
  expect(options.title).toBe('创建项目')
  expect(options.size).toBe('66%')
  expect(options.context.defaults).toEqual({ category: 1, name: '默认' })
  const before = query.mock.calls.length
  await options.onDone({ data: { id: 1 } })
  expect(query).toHaveBeenCalledTimes(before + 1)
  expect(wrapper.emitted('created')[0]).toEqual([{ data: { id: 1 } }])
  expect(wrapper.emitted('edit')).toBeUndefined()
  wrapper.unmount()
})

it('event 模式保留宿主新建处理，不同时打开内置抽屉', async () => {
  const { wrapper, open } = setup({ createMode: 'event' })
  await flushPromises()
  await wrapper.find('button').trigger('click')
  expect(wrapper.emitted('create')).toHaveLength(1)
  expect(open).not.toHaveBeenCalled()
  wrapper.unmount()
})
