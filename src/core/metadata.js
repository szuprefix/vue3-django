export function normalizeItems(items = 'all', templates = {}, normalize = (value) => value) {
  const names = items === 'all' ? Object.keys(templates) : items
  return names.map((item) => {
    const name = typeof item === 'string' ? item : item.name
    return normalize({ ...templates[name], ...(typeof item === 'string' ? {} : item), name })
  })
}
export function fieldsFromOptions(options = {}, method = 'POST') {
  const actions = options.actions ?? {}
  return Object.fromEntries(
    Object.entries({ ...actions.LIST, ...(actions[method] ?? actions.POST) }).map(
      ([name, field]) => [name, { ...field, name }],
    ),
  )
}
export function emptyData(fields, defaults = {}) {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, f]) => !f.read_only)
      .map(([name, f]) => {
        const value = Object.hasOwn(defaults, name)
          ? defaults[name]
          : f.default !== undefined
            ? f.default
            : f.multiple
              ? []
              : f.type === 'boolean'
                ? true
                : f.type === 'string'
                  ? ''
                  : f.type === 'nested object'
                    ? {}
                    : null
        return [name, structuredClone(value)]
      }),
  )
}
export function writableData(data, fields) {
  return Object.fromEntries(
    Object.entries(data).filter(([name]) => fields[name] && !fields[name].read_only),
  )
}
export function displayValue(field, value) {
  const one = (value) => field.choices?.find((c) => c.value === value)?.display_name ?? value
  if (Array.isArray(value)) return value.map(one).join('、')
  if (value == null) return '—'
  if (field.choices) return one(value)
  if (typeof value === 'boolean') return value ? '是' : '否'
  return typeof value === 'object' ? JSON.stringify(value) : value
}
