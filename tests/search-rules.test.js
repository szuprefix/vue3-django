import { expect, it } from 'vitest'
import { searchFields, searchQueries, searchWidth } from '../src/core/search.js'

it('搜索宽度使用原版紧凑规则，并保留显式宽度', () => {
  expect(searchWidth({ name: 'active', label: '启用', widget: 'boolean' })).toBe('8rem')
  expect(searchWidth({ name: 'category', label: '课程类别', widget: 'modelselect' })).toBe('9rem')
  expect(searchWidth({ widget: 'input' })).toBe('10rem')
  expect(searchWidth({ widget: 'numberrange' })).toBe('16rem')
  expect(searchWidth({ widget: 'daterange', type: 'date' })).toBe('20rem')
  expect(searchWidth({ width: 240 })).toBe('240px')
})

it('对齐原版搜索 widget 推导、排序、固定查询排除和配置覆盖', () => {
  const metadata = {
    name: { type: 'string' },
    text: { type: 'string', lookups: ['exact'] },
    ids: { type: 'integer', lookups: ['in'] },
    date: { type: 'date', lookups: ['range'] },
    budget: { type: 'decimal', lookups: ['range'] },
    parent: { model: 'demo.project' },
    active: { type: 'boolean' },
    hidden: { type: 'boolean' },
  }
  const fields = searchFields(
    Object.keys(metadata),
    metadata,
    { hidden: { hidden: true } },
    { parent: 1 },
  )
  expect(fields.map((field) => field.name)).toEqual(['active', 'text', 'ids', 'budget', 'date'])
  expect(
    searchFields(['name'], metadata, { name: { widget: 'input' } }).map((field) => field.name),
  ).toEqual(['name'])
  expect(
    searchFields(['active', 'text'], metadata, {}, ['active']).map((field) => field.name),
  ).toEqual(['text'])
})

it('范围和批量值序列化为原版 lookup 查询，保留 false 和零', () => {
  const fields = [
    { name: 'ids', widget: 'array' },
    { name: 'budget', widget: 'numberrange' },
    { name: 'date', widget: 'daterange' },
  ]
  expect(
    searchQueries(
      { ids: '1, 2\n3', budget: [0, 10], date: ['2026-01-01', '2026-02-01'], active: false },
      fields,
    ),
  ).toEqual({
    ids__in: '1,2,3',
    budget__range: '0,10',
    date__range: '2026-01-01,2026-02-01',
    active: false,
  })
  expect(searchQueries({ ids: '', budget: [null, null], date: [] }, fields)).toEqual({})
})
