import { effectScope } from 'vue'
import { expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { useRemoteTable } from '../src/composables/remote-table.js'
import RemoteTable from '../src/components/table/RemoteTable.vue'
import Table from '../src/components/table/Table.vue'

it('分页沿用原版完整布局，切换每页条数重置页码且只发一次请求', async () => {
  const request = vi.fn().mockResolvedValue({ count: 200, results: [] })
  const wrapper = mount(RemoteTable, { props: { request, pageSize: 15 } })
  await flushPromises()
  const pager = wrapper.findComponent({ name: 'ElPagination' })
  expect(pager.props('layout')).toBe('total, sizes, prev, pager, next, jumper')
  expect(pager.props('background')).toBe(true)
  expect(pager.props('pageSizes')).toContain(15)
  pager.vm.$emit('update:current-page', 3)
  await flushPromises()
  const previous = request.mock.calls.length
  pager.vm.$emit('update:page-size', 20)
  pager.vm.$emit('update:current-page', 1)
  await flushPromises()
  expect(request).toHaveBeenCalledTimes(previous + 1)
  expect(request.mock.calls.at(-1)[0]).toMatchObject({ page: 1, page_size: 20 })
  await wrapper.setProps({ pageSize: 50 })
  await flushPromises()
  expect(request.mock.calls.at(-1)[0].page_size).toBe(50)
  wrapper.unmount()
})

it('通用请求状态管理分页、搜索和排序，固定查询优先且清除排序有效', async () => {
  const request = vi.fn().mockResolvedValue({ count: 1, results: [{ id: 1 }] })
  const scope = effectScope()
  const state = scope.run(() => useRemoteTable({ request, baseQueries: () => ({ owner: 2 }) }))
  await state.changePage(3)
  await state.search({ search: 'A', owner: 9 })
  expect(request.mock.calls.at(-1)[0]).toMatchObject({ page: 1, owner: 2, search: 'A' })
  await state.sort({ prop: 'name', order: 'descending' })
  expect(request.mock.calls.at(-1)[0].ordering).toBe('-name')
  await state.sort({ prop: 'name', order: null })
  expect(request.mock.calls.at(-1)[0].ordering).toBeUndefined()
  expect(state.count.value).toBe(1)
  scope.stop()
})

it('迟到响应不覆盖新请求，失败释放 loading，销毁后不再更新', async () => {
  let resolve
  const request = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    .mockResolvedValueOnce([{ id: 2 }])
    .mockRejectedValueOnce(new Error('offline'))
  const scope = effectScope()
  const state = scope.run(() => useRemoteTable({ request }))
  const old = state.load()
  await state.load()
  resolve([{ id: 1 }])
  await old
  expect(state.rows.value).toEqual([{ id: 2 }])
  await state.load()
  expect(state.loading.value).toBe(false)
  expect(state.error.value).toBe('offline')
  scope.stop()
})

it('RemoteTable 不依赖模型，使用 URL/http 获取数据并转发列插槽', async () => {
  const get = vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'A' }] })
  const wrapper = mount(RemoteTable, {
    props: { url: '/custom/', http: { get }, fields: [{ name: 'name' }], mobile: true },
    slots: { 'column-name': ({ row }) => `定制 ${row.name}` },
  })
  await flushPromises()
  expect(get.mock.calls[0][0]).toBe('/custom/')
  expect(wrapper.text()).toContain('定制 A')
  expect(wrapper.text()).not.toContain('编辑')
  expect(wrapper.emitted('loaded')[0]).toEqual([[{ id: 1, name: 'A' }]])
  wrapper.findComponent(Table).vm.$emit('row-dblclick', { id: 1 }, {}, {})
  expect(wrapper.emitted('row-dblclick')).toHaveLength(1)
  wrapper.unmount()
})
