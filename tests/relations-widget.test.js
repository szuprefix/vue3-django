import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import Relations from '../src/components/model/Relations.vue'
import { DjangoKey } from '../src/composables/context.js'

it('用可搜索表格选择已有记录，按自定义主键合并关联，并在翻页后清空计数', async () => {
  const patch = vi.fn().mockResolvedValue({ data: { papers: [2, 3] } })
  const models = {
    'course.course': {
      config: {},
      fields: async () => ({ papers: { name: 'papers', model: 'exam.paper', multiple: true } }),
      loadOptions: async () => ({}),
      loadViewsConfig: async () => ({ relations: ['exam.paper'] }),
      getDetailUrl: (id) => `/course/${id}/`,
    },
    'exam.paper': {
      config: { idField: 'pk', verbose_name: '试卷' },
      fields: async () => ({}),
      loadOptions: async () => ({}),
    },
  }
  const table = defineComponent({
    name: 'ModelTable',
    props: ['appModel', 'selection', 'baseQueries', 'rowActions', 'topActions', 'batchActions'],
    emits: ['selection-change', 'loaded'],
    template: '<div />',
  })
  const slots = { template: '<div><slot /><slot name="footer" /></div>' }
  const wrapper = mount(Relations, {
    props: { parent: { appModel: 'course.course', id: 7, data: { papers: [2] } } },
    global: {
      provide: { [DjangoKey]: { registry: { get: (name) => models[name], http: { patch } } } },
      stubs: {
        ModelTable: table,
        ModelForm: true,
        ElTabs: slots,
        ElTabPane: slots,
        ElDialog: slots,
        ElDrawer: true,
        ElButton: { template: '<button :disabled="$attrs.disabled"><slot /></button>' },
        ElAlert: true,
      },
    },
  })
  await flushPromises()
  const relationActions = wrapper.findComponent(table).props('rowActions')
  expect(relationActions[0]).toBe('edit')
  expect(relationActions[1][0]).toMatchObject({
    name: 'remove-relation',
    label: '移除',
    icon: 'trash',
  })
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '添加已有试卷')
    .trigger('click')
  const picker = wrapper
    .findAllComponents(table)
    .find((item) => item.props('selection') !== undefined)
  expect(picker.props('baseQueries')).toEqual({})
  expect(picker.props('rowActions')).toEqual([])
  expect(picker.props('batchActions')[0].label).toBe('添加关联')
  const initialQueries = picker.props('baseQueries')
  picker.vm.$emit('selection-change', [{ pk: 3 }])
  await flushPromises()
  expect(wrapper.text()).toContain('已选 1 条')
  expect(picker.props('baseQueries')).toBe(initialQueries)
  picker.vm.$emit('loaded', {})
  await flushPromises()
  expect(wrapper.text()).toContain('已选 0 条')
  expect(picker.props('baseQueries')).toBe(initialQueries)
  picker.vm.$emit('selection-change', [{ pk: 2 }, { pk: 3 }])
  await flushPromises()
  const resolveSelection = vi.fn().mockResolvedValue([{ pk: 2 }, { pk: 3 }])
  await picker.props('batchActions')[0].do({ table: { resolveSelection }, scope: 'all' })
  expect(resolveSelection).toHaveBeenCalledWith('all')
  await flushPromises()
  expect(patch).toHaveBeenCalledWith('/course/7/', { papers: [2, 3] })
  expect(wrapper.emitted('parent-updated')[0][0]).toEqual({ papers: [2, 3] })
  wrapper.unmount()
})
