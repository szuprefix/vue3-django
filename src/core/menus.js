const hidden = value => value === true || value === 'true'

// Keep the original app selection, model.menu grouping and permission-key convention.
export function genMenusFromApps(apps, menus, modelPermissions) {
  const selected = Array.isArray(menus) ? menus : menus ? Object.keys(menus) : Object.keys(apps)
  const groups = {}
  for (const key of selected) {
    const app = apps[key]
    if (!app || hidden(app.hidden)) continue
    const selection = !Array.isArray(menus) && menus?.[key]
    const names = typeof selection === 'string' ? selection.split(',').map(s => s.trim()) : selection || Object.keys(app.models ?? {})
    const groupName = app.verbose_name || key
    const items = []
    if (app.home_page && !hidden(app.home_page.hidden)) items.push({ url: `/${key}/index/`, ...app.home_page })
    for (const name of names) {
      const model = app.models?.[name]
      if (!model) continue
      const isHidden = model.hidden !== undefined ? hidden(model.hidden) : modelPermissions != null && !Object.hasOwn(modelPermissions, `${key}.${name}`)
      if (isHidden) continue
      const item = { name: model.verbose_name || name, icon: model.icon, url: `/${key}/${name}/` }
      if (model.menu) {
        groups[model.menu] ??= { name: model.menu, items: [] }
        groups[model.menu].items.push(item)
      } else items.push(item)
    }
    if (items.length) {
      groups[groupName] ??= { name: groupName, icon: app.icon, items: [] }
      groups[groupName].items.push(...items)
    }
  }
  return groups
}
