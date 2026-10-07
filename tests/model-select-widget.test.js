import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Field from '../src/components/form/Field.vue'
import Select from '../src/components/model/Select.vue'
import { DjangoKey } from '../src/composables/context.js'

it.each([Select, 'ModelSelect', 'model-select', undefined])(
  'Model Select widget 支持显式与自动配置：%s',
  async (widget) => {
    const query = vi.fn(async (params) =>
      params.id__in
        ? { results: [{ id: 0, code: '已选' }] }
        : { results: [{ id: 1, code: '候选' }] },
    )
    const wrapper = mount(Field, {
      props: {
        modelValue: 0,
        field: {
          name: 'category',
          model: 'course.category',
          widget,
          selectOptionsFields: ['code'],
        },
      },
      global: {
        provide: { [DjangoKey]: { registry: { get: () => ({ query }), getConfig: () => ({}) } } },
      },
    })
    await flushPromises()
    const select = wrapper.findComponent(Select)
    expect(select.exists()).toBe(true)
    expect(select.props('appModel')).toBe('course.category')
    expect(query.mock.calls[1][0].id__in).toEqual([0])
    expect(
      wrapper.findAllComponents({ name: 'ElOption' }).map((option) => option.props('label')),
    ).toEqual(['已选', '候选'])
    select.vm.$emit('update:modelValue', 1)
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([1])
    wrapper.unmount()
  },
)

it('多选加载已选记录，使用模型 title_field 并保留主键数组', async () => {
  const query = vi.fn(async () => [{ id: 'a', title: '试卷 A' }])
  const wrapper = mount(Field, {
    props: {
      modelValue: ['a'],
      field: { name: 'papers', widget: 'ModelSelect', appModel: 'exam.paper', multiple: true },
    },
    global: {
      provide: {
        [DjangoKey]: {
          registry: { get: () => ({ query }), getConfig: () => ({ title_field: 'title' }) },
        },
      },
    },
  })
  await flushPromises()
  expect(query.mock.calls[1][0].id__in).toEqual(['a'])
  expect(wrapper.findComponent({ name: 'ElOption' }).props('label')).toBe('试卷 A')
  wrapper.findComponent(Select).vm.$emit('update:modelValue', [])
  expect(wrapper.emitted('update:modelValue')[0]).toEqual([[]])
  wrapper.unmount()
})
