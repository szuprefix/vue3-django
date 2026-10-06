export function defaultRuleType(field) {
  if (field.multiple) return 'array'
  if (field.choices?.length) return typeof field.choices[0].value
  if (field.model || ['integer', 'decimal', 'float', 'number'].includes(field.type)) return 'number'
  return field.type === 'boolean' ? 'boolean' : 'string'
}

export function defaultRules(field) {
  const rules = []
  if (field.required)
    rules.push({ required: true, type: defaultRuleType(field), message: '不能为空' })
  if (field.min_length != null)
    rules.push({ min: field.min_length, message: `长度最小为${field.min_length}` })
  if (field.max_length != null)
    rules.push({ max: field.max_length, message: `长度最大为${field.max_length}` })
  return rules
}

export function normalizeItems(items = []) {
  return items.map((item) => {
    const field = typeof item === 'string' ? { name: item } : { ...item }
    const span =
      typeof field.span === 'number'
        ? { xs: field.span, sm: field.span, md: field.span, lg: field.span, xl: field.span }
        : field.span || {}
    return {
      type: 'string',
      ...field,
      label: field.label ?? field.name,
      rules: field.rules ?? defaultRules(field),
      span: {
        xs: 24,
        sm: 24,
        md: field.widget === 'textarea' ? 24 : 12,
        lg: field.widget === 'textarea' ? 24 : 12,
        xl: field.widget === 'textarea' ? 24 : 8,
        ...span,
      },
    }
  })
}

export function getItemRules(items) {
  return Object.fromEntries(
    items
      .filter((field) => !field.hidden && !field.read_only && field.widget !== 'hidden')
      .map((field) => [field.name, field.rules]),
  )
}
