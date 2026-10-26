import { fetchExcelRows } from './excel.js'

// Resolve all/exclude against the current filtered result, never just the visible page.
export async function resolveSelection({
  scope = 'select',
  selection,
  model,
  queries,
  pageSize = 1000,
}) {
  const selected = [...selection]
  if (scope === 'select') return selected
  if (!['all', 'exclude'].includes(scope)) throw new Error(`未知选择范围：${scope}`)
  const idField = model.config.idField ?? 'id'
  const excluded = new Set(selected.map((row) => String(row[idField])))
  const rows = await fetchExcelRows((params) => model.query(params), queries, { pageSize })
  return scope === 'exclude' ? rows.filter((row) => !excluded.has(String(row[idField]))) : rows
}
