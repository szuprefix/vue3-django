import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import Widget from '../src/components/table/Widget.vue'
import { fieldValue, safeUrl, tableDisplay, tableDate } from '../src/core/table.js'

it('表格格式化保留 falsy 值，支持嵌套路径、数字、choices 和数组子字段', () => {
  expect(fieldValue({ profile: { id: 0 } }, 'profile.id')).toBe(0)
  for (const value of [0, false, '']) {
    expect(tableDisplay({ name: 'n', formatter: () => value }, { n: 1 })).toBe(value)
  }
  expect(tableDisplay({ name: 'n', type: 'decimal' }, { n: '1234.50' })).toBe('1,234.5')
  expect(tableDisplay({ name: 'n', type: 'percent' }, { n: 0.25 })).toBe('25%')
  expect(tableDisplay({ name: 'n', choices: [{ value: 0, display_name: '零' }] }, { n: 0 })).toBe(
    '零',
  )
  expect(
    tableDisplay(
      { name: 'n', child: { children: { name: {} } } },
      { n: [{ name: 'A' }, { name: 'B' }] },
    ),
  ).toBe('A\nB')
  expect(tableDate(null)).toBe('')
  expect(tableDate('invalid')).toBe('invalid')
  expect(tableDate(1700000000)).toBe(tableDate(1700000000000))
})

it('HTML 与旧函数 widget 清理脚本，链接拒绝危险协议', () => {
  const wrapper = mount(Widget, {
    props: {
      value: { name: 'A' },
      field: {
        name: 'name',
        widget: () => '<b>A</b><img src=x onerror="alert(1)"><script>alert(1)</script>',
      },
    },
  })
  expect(wrapper.find('b').text()).toBe('A')
  expect(wrapper.find('script').exists()).toBe(false)
  expect(wrapper.find('img').attributes('onerror')).toBeUndefined()
  expect(safeUrl('javascript:alert(1)')).toBeUndefined()
  expect(safeUrl('//other.test')).toBeUndefined()
  expect(safeUrl('/media/a.png')).toBe('/media/a.png')
  wrapper.unmount()
})

it('组件 widget 接收原版 row/field/context，表单控件仅发 change 不直接修改记录', async () => {
  const custom = defineComponent({
    props: ['value', 'field', 'context'],
    template: '<b>{{ value.name }}:{{ context.$index }}</b>',
  })
  const row = { name: 'A' }
  const wrapper = mount(Widget, {
    props: { value: row, field: { name: 'name', widget: custom }, context: { $index: 2 } },
  })
  expect(wrapper.text()).toBe('A:2')
  wrapper.unmount()
  const form = mount(Widget, {
    props: { value: row, field: { name: 'name', useFormWidget: true } },
  })
  await form.find('input').setValue('B')
  expect(form.emitted('change')[0]).toEqual(['B'])
  expect(row.name).toBe('A')
  form.unmount()
})
