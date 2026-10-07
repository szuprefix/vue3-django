import { normalizeItems } from './metadata.js'

const order = [
  'boolean',
  'radio',
  'select',
  'modelselect',
  'input',
  'array',
  'numberrange',
  'daterange',
]

export function searchWidth(field) {
  if (field.width != null) return typeof field.width === 'number' ? `${field.width}px` : field.width
  if (['input', 'array'].includes(field.widget)) return '10rem'
  if (field.widget === 'numberrange') return '16rem'
  if (field.widget === 'daterange') return field.type === 'datetime' ? '26rem' : '20rem'
  return `${Math.max(8, (field.label || field.name || '').length + 5)}rem`
}

export function searchWidget(field) {
  if (field.type === 'boolean') return 'boolean'
  if (field.model || field.relateModel || field.appModel) return 'modelselect'
  if (field.choices) return 'select'
  if (['date', 'datetime'].includes(field.type) && field.lookups?.includes('range'))
    return 'daterange'
  if (
    ['number', 'integer', 'decimal', 'float'].includes(field.type) &&
    field.lookups?.includes('range')
  )
    return 'numberrange'
  if (['string', 'integer'].includes(field.type) && field.lookups?.includes('in')) return 'array'
  if (['string', 'integer'].includes(field.type) && field.lookups?.includes('exact')) return 'input'
}

export function searchFields(items, metadata, config = {}, exclude = {}) {
  const excluded = new Set(Array.isArray(exclude) ? exclude : Object.keys(exclude ?? {}))
  return normalizeItems(items, metadata)
    .map((field) => {
      const configured = {
        widget: searchWidget(field),
        ...field,
        multiple: false,
        ...config[field.name],
      }
      if (typeof configured.widget === 'string')
        configured.widget = configured.widget.replace(/[-_ ]/g, '').toLowerCase()
      return {
        ...configured,
        placeholder:
          configured.placeholder ??
          `${['boolean', 'radio', 'select', 'modelselect'].includes(configured.widget) ? '请选择' : '请输入'}${configured.label || configured.name}`,
        read_only: false,
        required: false,
      }
    })
    .filter((field) => !excluded.has(field.name) && !field.hidden && order.includes(field.widget))
    .sort((a, b) => order.indexOf(a.widget) - order.indexOf(b.widget))
}

export function searchQueries(form, fields) {
  const queries = { ...form }
  for (const field of fields) {
    const value = form[field.name]
    if (['daterange', 'numberrange', 'array'].includes(field.widget)) {
      delete queries[field.name]
      if (field.widget === 'array') {
        const values = String(value ?? '')
          .split(/[\s,，]+/)
          .filter(Boolean)
        if (values.length) queries[`${field.name}__in`] = values.join(',')
      } else if (Array.isArray(value) && value.some((item) => item != null && item !== '')) {
        queries[`${field.name}__range`] =
          field.widget === 'numberrange'
            ? `${value[0] ?? 0},${value[1] ?? 999999}`
            : value.join(',')
      }
    }
  }
  return Object.fromEntries(
    Object.entries(queries).filter(
      ([, value]) => value !== '' && value != null && (!Array.isArray(value) || value.length),
    ),
  )
}
