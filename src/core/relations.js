import qs from 'qs'

export function relationIds(value) {
  const ids = typeof value === 'string' ? JSON.parse(value) : (value ?? [])
  if (!Array.isArray(ids)) throw new Error('多对多关联字段必须是主键数组')
  return ids
}

export async function resolveRelation(item, parent, registry) {
  const definition = typeof item === 'string' ? { name: item } : item
  if (!definition?.name) throw new Error('关联配置缺少模型 name')
  const colon = definition.name.indexOf(':')
  const name = colon < 0 ? definition.name : definition.name.slice(0, colon)
  const query = colon < 0 ? undefined : definition.name.slice(colon + 1)
  const model = registry.get(name),
    parentModel = registry.get(parent.appModel)
  const [fields, parentFields, options, parentOptions] = await Promise.all([
    model.fields(),
    parentModel.fields(),
    model.loadOptions(),
    parentModel.loadOptions(),
  ])
  const parentId = parent.id ?? parent.data?.[parentModel.config.idField || 'id']
  if (parentId == null) throw new Error('关联列表需要已保存的父记录')
  let filters = definition.parentRelationQuery,
    defaults = {},
    multipleField
  if (query !== undefined)
    filters = Object.fromEntries(
      Object.entries(qs.parse(query)).map(([key, source]) => {
        const value = source === '' || source === 'id' ? parentId : parent.data?.[source]
        if (value == null) throw new Error(`关联查询 ${key} 缺少父字段 ${source || 'id'}`)
        return [key, value]
      }),
    )
  if (!filters) {
    multipleField = definition.parentMultipleRelationFieldName
      ? parentFields[definition.parentMultipleRelationFieldName]
      : Object.values(parentFields).find((field) => field.model === name && field.multiple)
    if (multipleField) {
      if (!multipleField.multiple || multipleField.model !== name)
        throw new Error('指定的父字段不是此模型的多对多关联')
      const ids = relationIds(parent.data?.[multipleField.name])
      filters = { [`${model.config.idField || 'id'}__in`]: ids.length ? ids : [0] }
    } else {
      const field = Object.values(fields).find(
        (field) => field.model === parent.appModel && !field.multiple,
      )
      if (field) filters = { [field.name]: parentId }
      else if (options.generic_foreign_key) {
        const { ct_field, fk_field } = options.generic_foreign_key
        if (!fields[fk_field] || parentOptions.content_type_id == null)
          throw new Error('通用外键缺少 fk_field 或父模型 content_type_id')
        filters = { [ct_field]: parentOptions.content_type_id, [fk_field]: parentId }
      } else throw new Error(`无法确定 ${name} 的关联字段，请显式配置 ${name}:字段=id`)
    }
  }
  if (!multipleField)
    defaults = Object.fromEntries(
      Object.entries(filters).filter(
        ([key]) => fields[key] && !fields[key].read_only && !key.includes('__'),
      ),
    )
  return {
    ...definition,
    name,
    model,
    multipleField,
    defaults: { ...defaults, ...definition.defaults },
    label: definition.label || model.config.verbose_name || name,
    icon: definition.icon || model.config.icon,
    baseQueries: { ...definition.baseQueries, ...filters },
  }
}
