import { it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Excel from 'exceljs'
import { excelFormat, writeExcel, fetchExcelRows } from '../src/core/excel.js'
import Table from '../src/components/table/Table.vue'
import RemoteTable from '../src/components/table/RemoteTable.vue'

it('导出按列顺序、标签、formatter 和 choices，保留数字布尔及空值', () => {
  expect(
    excelFormat(
      [{ id: 0, yes: false, name: '=SUM(A1)', status: 1 }],
      [
        { name: 'id', label: '编号' },
        { name: 'yes' },
        { name: 'name' },
        { name: 'status', choices: [{ value: 1, display_name: '启用' }] },
        { name: 'missing' },
      ],
    ),
  ).toEqual([
    ['编号', 'yes', 'name', 'status', 'missing'],
    [0, false, '=SUM(A1)', '启用', null],
  ])
  expect(excelFormat([], [{ name: 'id' }])).toEqual([['id']])
  expect(excelFormat([{ a: 1 }, { a: 2, b: 3 }], [{ name: '__dump_all__' }])).toEqual([
    ['a', 'b'],
    [1, null],
    [2, 3],
  ])
})

it('生成可读取的 XLSX，文本不是公式，对象不能注入公式', async () => {
  let bytes
  const blob = await writeExcel(
    [
      ['文字', '数值'],
      ['=1+1', 0],
      [{ formula: '1+1' }, false],
    ],
    {
      title: '../报表',
      save: async (blob, name) => {
        expect(name).toBe('报表.xlsx')
        bytes = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsArrayBuffer(blob)
        })
      },
    },
  )
  expect(blob.type).toContain('spreadsheetml')
  const workbook = new Excel.Workbook()
  await workbook.xlsx.load(bytes)
  expect(workbook.worksheets[0].getCell('A2').value).toBe('=1+1')
  expect(workbook.worksheets[0].getCell('A3').value).toBe('{"formula":"1+1"}')
  expect(workbook.worksheets[0].getCell('B2').value).toBe(0)
})

it('远程导出顺序抓取全量，处理后端页大小限制，并保留筛选排序', async () => {
  const request = vi.fn(async ({ page }) => ({
    count: 3,
    results: page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }],
  }))
  const queries = { search: '名字', ordering: '-id' }
  expect(await fetchExcelRows(request, queries, { pageSize: 1000 })).toHaveLength(3)
  expect(request.mock.calls[1][0]).toEqual({ ...queries, page: 2, page_size: 1000 })
  expect(queries).toEqual({ search: '名字', ordering: '-id' })
  const changed = vi
    .fn()
    .mockResolvedValueOnce({ count: 2, results: [{ id: 1 }] })
    .mockResolvedValueOnce({ count: 3, results: [{ id: 2 }] })
  await expect(fetchExcelRows(changed, {})).rejects.toThrow('变化')
  const controller = new AbortController()
  controller.abort()
  await expect(fetchExcelRows(request, {}, { signal: controller.signal })).rejects.toMatchObject({
    name: 'AbortError',
  })
})

it('Table 默认下载动作导出当前数据，自定义 writer 和 format 可覆盖', async () => {
  const writer = vi.fn()
  const wrapper = mount(Table, {
    props: { rows: [{ id: 1 }], fields: [{ name: 'id' }], title: '项目', excelWriter: writer },
  })
  await flushPromises()
  await wrapper.find('[aria-label="导出 Excel"]').trigger('click')
  await flushPromises()
  expect(writer).toHaveBeenCalledWith([['id'], [1]], {
    title: '项目',
    signal: expect.any(AbortSignal),
  })
  wrapper.unmount()
})

it('RemoteTable 全量导出不改当前页和数据，保留查询', async () => {
  const request = vi.fn(async ({ page }) => ({ count: 2, results: [{ id: page }] }))
  const writer = vi.fn()
  const wrapper = mount(RemoteTable, {
    props: {
      request,
      fields: [{ name: 'id' }],
      baseQueries: { active: true },
      excelWriter: writer,
    },
  })
  await flushPromises()
  await wrapper.vm.changePage(2)
  await wrapper.vm.dumpExcelData()
  expect(writer.mock.calls[0][0]).toEqual([['id'], [1], [2]])
  expect(wrapper.vm.page).toBe(2)
  expect(wrapper.vm.rows).toEqual([{ id: 2 }])
  expect(request.mock.calls.at(-1)[0].active).toBe(true)
  wrapper.unmount()
})
