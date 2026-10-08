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

function dateObject(value, timestamp) {
  const numeric = timestamp || typeof value === 'number' || /^\d+$/.test(String(value))
  let time = numeric ? Number(value) * (Math.abs(Number(value)) < 1e10 ? 1000 : 1) : value
  // Legacy Django naive datetimes are Beijing time; preserve explicit Z/offsets.
  if (
    typeof time === 'string' &&
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(time)
  ) {
    time = `${time.replace(' ', 'T')}+08:00`
  }
  return new Date(time)
}

export function tableDate(value, timestamp = false, dateOnly = false) {
  if (value == null || value === '') return ''
  if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value)
  const date = dateObject(value, timestamp)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN')
}

export function tableRelativeDate(value, timestamp = false, now = new Date()) {
  if (value == null || value === '') return ''
  const date = dateObject(value, timestamp)
  if (Number.isNaN(date.getTime())) return String(value)
  const diff = (now - date) / 1000
  if (diff >= 0) {
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    if (diff < 172800) return '1天前'
  }
  if (date.getFullYear() !== now.getFullYear()) {
    const pad = (number) => String(number).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  return `${date.getMonth() + 1}月${date.getDate()}日${date.getHours()}时${date.getMinutes()}分`
}
