import { expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Widget from '../src/components/table/Widget.vue'
import { tableDate, tableRelativeDate } from '../src/core/table.js'

it('日期相对显示遵循旧版时间边界', () => {
  const now = new Date('2026-10-08T12:00:00Z')
  const ago = (seconds) => new Date(now - seconds * 1000).toISOString()
  expect(tableRelativeDate(ago(59), false, now)).toBe('刚刚')
  expect(tableRelativeDate(ago(60), false, now)).toBe('1分钟前')
  expect(tableRelativeDate(ago(3600), false, now)).toBe('1小时前')
  expect(tableRelativeDate(ago(86400), false, now)).toBe('1天前')
  expect(tableRelativeDate('2025-01-01T12:00:00Z', false, now)).toMatch(/^2025-01-01 \d{2}:00$/)
  expect(tableRelativeDate(ago(-3600), false, now)).toContain('月')
})

it('无时区时间沿用北京时间，已有偏移不重复追加，支持秒和毫秒', () => {
  expect(tableDate('2026-10-08T20:00:00')).toBe(tableDate('2026-10-08T12:00:00Z'))
  expect(tableDate('2026-10-08T20:00:00+08:00')).toBe(tableDate('2026-10-08T12:00:00Z'))
  expect(tableDate(1700000000, true)).toBe(tableDate(1700000000000, true))
  expect(tableRelativeDate('invalid')).toBe('invalid')
  expect(tableRelativeDate(null)).toBe('')
  expect(tableDate('2026-10-08', false, true)).toBe('2026-10-08')
})

it('datetime 默认简短显示并保留完整 title，date 不附加时间', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-08T12:00:00Z'))
  try {
    const wrapper = mount(Widget, {
      props: { value: { at: '2026-10-08T11:55:00Z' }, field: { name: 'at', type: 'datetime' } },
    })
    expect(wrapper.text()).toBe('5分钟前')
    expect(wrapper.find('span').attributes('title')).toBe(tableDate('2026-10-08T11:55:00Z'))
    wrapper.unmount()
    const date = mount(Widget, {
      props: { value: { at: '2026-10-08' }, field: { name: 'at', type: 'date' } },
    })
    expect(date.text()).toBe('2026-10-08')
    date.unmount()
  } finally {
    vi.useRealTimers()
  }
})
