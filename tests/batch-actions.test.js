import { it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BatchActions from '../src/components/layout/BatchActions.vue'
import ModelTable from '../src/components/model/Table.vue'
import Table from '../src/components/table/Table.vue'
import { DjangoKey } from '../src/composables/context.js'
import { ElMessage } from 'element-plus'
import Actions from '../src/components/layout/Actions.vue'

it.each([
  [{ rows: 3 }, '操作成功3条记录.'],
  [{ rows: 0 }, '操作成功0条记录.'],
  [{ data: { rows: 2 } }, '操作成功2条记录.'],
  [{}, '操作成功.'],
  [{ rows: -1 }, '操作成功.'],
])('批量操作完成后提示成功和返回条数 %j', (result, message) => {
  const success = vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  const wrapper = mount(BatchActions, { props: { context: { selection: [], count: 0 } } })
  const action = { name: 'run' }
  wrapper.findComponent(Actions).vm.$emit('done', result, action)
  expect(success).toHaveBeenCalledWith(message)
  expect(wrapper.emitted('done')).toEqual([[result, action]])
  wrapper.unmount()
  success.mockRestore()
})

it('批量操作未选择禁用，并支持选中、全部和其余范围', async () => {
  const execute = vi.fn()
  const wrapper = mount(BatchActions, {
    props: {
      items: [{ name: 'run', label: '执行', confirm: false }],
      context: { selection: [], count: 8 },
      execute,
    },
  })
  expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  await wrapper.setProps({ context: { selection: [{ id: 2 }], count: 8 } })
  wrapper.findComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', 'exclude')
  await flushPromises()
  await wrapper.find('button').trigger('click')
  await flushPromises()
  expect(execute.mock.calls[0][1]).toMatchObject({
    scope: 'exclude',
    scopeInfo: { count: 7 },
    selection: [{ id: 2 }],
  })
  await wrapper.setProps({ context: { selection: [], count: 8 } })
  expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  wrapper.unmount()
})

it('模型批量操作携带自定义主键、筛选条件和范围，成功后刷新清除选择', async () => {
  const post = vi.fn().mockResolvedValue({ data: { rows: 1 } })
  const query = vi.fn().mockResolvedValue({ count: 5, results: [{ uuid: 'a' }] })
  const model = {
    config: { idField: 'uuid' },
    getListUrl: () => 'demo/project/',
    query,
    fields: async () => ({}),
    loadViewsConfig: async () => ({
      list: {
        baseQueries: { active: true },
        batchActions: [
          {
            name: 'disable',
            api: 'batch_disable',
            label: '禁用',
            confirm: false,
            context: { enable_flag: false },
          },
        ],
      },
    }),
  }
  const wrapper = mount(ModelTable, {
    props: { appModel: 'demo.project', showSearch: false, baseQueries: { owner: 9 } },
    global: {
      provide: {
        [DjangoKey]: {
          registry: { http: { post }, get: () => model, getConfig: () => model.config },
        },
      },
      stubs: { Drawer: true },
    },
  })
  await flushPromises()
  expect(wrapper.findComponent(Table).props('selection')).toBe(true)
  wrapper.findComponent(Table).vm.$emit('selection-change', [{ uuid: 'a' }])
  await flushPromises()
  await wrapper.findComponent(BatchActions).find('button').trigger('click')
  await flushPromises()
  expect(post).toHaveBeenCalledWith(
    'demo/project/batch_disable/',
    { batch_action_ids: ['a'], enable_flag: false, scope: 'select' },
    { params: { active: true, owner: 9 } },
  )
  expect(query).toHaveBeenCalledTimes(2)
  expect(wrapper.findComponent(BatchActions).props('context').selection).toEqual([])
  wrapper.unmount()
})
