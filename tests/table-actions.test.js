import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Table from '../src/components/table/Table.vue'
import ModelTable from '../src/components/model/Table.vue'
import Actions from '../src/components/layout/Actions.vue'
import { DjangoKey } from '../src/composables/context.js'

it('桌面行操作采用紧凑按钮组和悬停类，更多入口只显示箭头', async () => {
  const wrapper = mount(Table, {
    props: {
      rows: [{ id: 1 }],
      rowActions: ['edit', ['delete']],
      actionMap: {
        edit: { label: '编辑', icon: 'edit', do: vi.fn() },
        delete: { label: '删除', do: vi.fn() },
      },
    },
  })
  await flushPromises()
  const actions = wrapper.find('.vd-row-actions')
  expect(actions.classes()).toContain('hover-show')
  expect(actions.classes()).toContain('is-compact')
  expect(actions.find('[aria-label="更多操作"]').text()).toBe('▾')
  expect(actions.findAll('button')[0].attributes('title')).toBeUndefined()
  const tooltip = wrapper
    .findAllComponents({ name: 'ElTooltip' })
    .find((item) => item.props('content') === '编辑')
  expect(tooltip.props('showAfter')).toBe(100)
  expect(tooltip.props('hideAfter')).toBe(0)
  expect(tooltip.props('enterable')).toBe(false)
  const editButton = actions.findAll('button')[0]
  await editButton.trigger('mouseenter')
  expect(tooltip.props('visible')).toBe(true)
  await editButton.trigger('mouseleave')
  expect(tooltip.props('visible')).toBe(false)
  await editButton.trigger('focus')
  expect(tooltip.props('visible')).toBe(false)
  expect(actions.findAll('button')[0].attributes('aria-label')).toBe('编辑')
  expect(actions.text()).not.toContain('编辑')
  await wrapper.setProps({ actionIconOnly: false })
  expect(wrapper.find('.vd-row-actions').text()).toContain('编辑')
  await wrapper.setProps({ hoverShow: false, actionsColumnWidth: 200 })
  expect(wrapper.find('.vd-row-actions').classes()).not.toContain('hover-show')
  wrapper.unmount()
})

it('行操作传递记录上下文，并保留旧 actions 事件', async () => {
  const row = { id: 7 }
  const run = vi.fn()
  const wrapper = mount(Table, {
    props: {
      mobile: true,
      rows: [row],
      rowActions: ['run', 'hidden'],
      actionMap: { run: { title: '执行', do: run }, hidden: { permission: 'deny' } },
      rowActionContext: { parent: { id: 2 } },
      permissionFunction: () => false,
    },
  })
  expect(wrapper.text()).not.toContain('hidden')
  await wrapper.find('button').trigger('click')
  expect(run).toHaveBeenCalledWith({ row, parent: { id: 2 }, $index: undefined })
  await wrapper.setProps({ rowActions: undefined, actions: [{ name: 'legacy', label: '旧操作' }] })
  await wrapper.find('button').trigger('click')
  expect(wrapper.emitted('row-action')[0][1]).toEqual(row)
  wrapper.unmount()
})

it('模型采用旧版嵌套 table 配置，执行后刷新，双击使用当前记录', async () => {
  const run = vi.fn().mockResolvedValue('ok')
  const query = vi.fn().mockResolvedValue({ count: 1, results: [{ id: 7 }] })
  const model = {
    config: { app: 'demo', name: 'project' },
    query,
    fields: async () => ({}),
    loadViewsConfig: async () => ({
      list: {
        options: {
          remoteTable: {
            table: {
              topActions: [],
              rowActions: ['run'],
              avairableActions: { run: { title: '执行', do: run } },
            },
          },
        },
      },
    }),
  }
  const wrapper = mount(ModelTable, {
    props: { appModel: 'demo.project', showSearch: false, dblClickAction: 'run' },
    global: {
      provide: { [DjangoKey]: { registry: { get: () => model, getConfig: () => ({}) } } },
      stubs: { Drawer: true },
    },
  })
  await flushPromises()
  expect(wrapper.text()).not.toContain('新增')
  const action = wrapper
    .findAllComponents(Actions)
    .find((component) => component.props('items').includes('run'))
  await action.vm.handleCommand({ name: 'run', do: run })
  expect(run.mock.calls[0][0].row.id).toBe(7)
  expect(run.mock.calls[0][0].model).toBe(model)
  expect(query).toHaveBeenCalledTimes(2)
  wrapper.findComponent(Table).vm.$emit('row-dblclick', { id: 9 })
  await flushPromises()
  expect(run.mock.calls.at(-1)[0].row.id).toBe(9)
  wrapper.unmount()
})
