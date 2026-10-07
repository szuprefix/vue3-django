import { displayValue } from './metadata.js'

export function fieldValue(row, name) {
  return String(name)
    .split('.')
    .reduce((value, key) => value?.[key], row)
}

export function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const url = value.trim()
  if (/^(https?:|mailto:|tel:)/i.test(url) || /^(\/[^/]|\.\.?\/)/.test(url)) return url
  return undefined
}

export function tableDisplay(field, row) {
  const value = fieldValue(row, field.name)
  if (field.formatter) return field.formatter(row, field.name, value)
  if (value == null || value === '') return '—'
  if (field.choices) return displayValue(field, value)
  if (['integer', 'decimal', 'float', 'number', 'percent'].includes(field.type)) {
    const number = Number(value)
    if (!Number.isFinite(number)) return String(value)
    if (field.type === 'percent') return `${Number((number * 100).toFixed(2))}%`
    return number.toLocaleString('zh-CN', { maximumFractionDigits: 20 })
  }
  if (field.child && Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null || typeof item !== 'object') return displayValue(field.child, item)
        return (
          Object.entries(field.child.children ?? {})
            .map(([name, child]) => displayValue(child, item[name]))
            .join('，') || JSON.stringify(item)
        )
      })
      .join('\n')
  }
  return displayValue(field, value)
}

export function tableDate(value, timestamp = false) {
  if (value == null || value === '') return ''
  const numeric = timestamp || typeof value === 'number' || /^\d+$/.test(String(value))
  const time = numeric ? Number(value) * (Number(value) < 1e10 ? 1000 : 1) : value
  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN')
}
