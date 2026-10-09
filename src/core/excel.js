import { fieldValue } from './table.js'
import { displayValue } from './metadata.js'
import { saveBlob, safeFileName } from '../browser/download.js'

function cell(value) {
  if (value == null) return null
  if (value instanceof Date) return value
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

export function excelFormat(rows, fields) {
  const all = fields.some((field) => field.name === '__dump_all__')
  const columns = all
    ? [...new Set(rows.flatMap((row) => Object.keys(row)))].map((name) => ({ name }))
    : fields
        .filter((field) => field.export !== false && field.type !== 'selection')
        .flatMap((field) =>
          field.items
            ? field.items.map((item) => ({ ...item, name: `${field.name}.${item.name}` }))
            : [field],
        )
  return [
    columns.map((field) => field.label ?? field.name),
    ...rows.map((row) =>
      columns.map((field) => {
        const raw = fieldValue(row, field.name)
        const value = field.exportFormatter
          ? field.exportFormatter(row, field.name, raw)
          : field.formatter
            ? field.formatter(row, field.name, raw)
            : field.choices
              ? displayValue(field, raw)
              : raw
        return cell(value)
      }),
    ),
  ]
}

export async function writeExcel(data, { title = '导出数据', save = saveBlob, signal } = {}) {
  const module = await import('exceljs')
  const Excel = module.default ?? module
  const workbook = new Excel.Workbook()
  const sheet = workbook.addWorksheet('Sheet 1')
  // Normalize object values: never interpret untrusted records as Excel formulas.
  sheet.addRows(data.map((row) => row.map(cell)))
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  if (signal?.aborted) throw signal.reason ?? new DOMException('已取消', 'AbortError')
  await save(blob, `${safeFileName(title).replace(/\.xlsx$/i, '')}.xlsx`)
  return blob
}

export async function fetchExcelRows(
  request,
  queries,
  { pageSize = 1000, signal, onProgress } = {},
) {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('导出 pageSize 必须为正整数')
  const snapshot = JSON.parse(JSON.stringify(queries))
  const rows = []
  let total
  let pages = 1
  for (let page = 1; page <= pages; page++) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('已取消', 'AbortError')
    const data = await request({ ...snapshot, page, page_size: pageSize }, { signal })
    if (signal?.aborted) throw signal.reason ?? new DOMException('已取消', 'AbortError')
    if (Array.isArray(data)) return data
    if (!Array.isArray(data?.results) || !Number.isInteger(data.count) || data.count < 0)
      throw new Error('导出需要 count/results 或数组响应')
    if (page === 1) {
      total = data.count
      pages = total ? Math.ceil(total / (data.results.length || pageSize)) : 1
    }
    if (data.count !== total || (rows.length < total && !data.results.length))
      throw new Error('导出期间数据发生变化或分页不完整，请重试')
    rows.push(...data.results)
    onProgress?.({ page, pages, completed: rows.length, total })
  }
  if (rows.length !== total) throw new Error('导出分页记录数不一致，请重试')
  return rows
}
