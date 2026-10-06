// Pass import.meta.glob('./views/**/config.js') from the consuming Vite app.
export function createViewsConfigLoader(modules) {
  return async (fullName) => {
    const suffix = `/views/${fullName.replace('.', '/')}/config.js`
    const entries = Object.entries(modules).filter(([path]) => path.endsWith(suffix))
    if (!entries.length) return {}
    if (entries.length > 1) throw new Error(`模型 ${fullName} 有多个视图配置文件`)
    const entry = entries[0][1]
    const module = typeof entry === 'function' ? await entry() : entry
    return module.default ?? module
  }
}

export function createRelationViewLoader(modules) {
  return async (appModel, view) => {
    if (!/^[\w-]+(?:\/[\w-]+)*$/.test(view)) throw new Error('关联视图路径无效')
    const suffix = `/views/${appModel.replace('.', '/')}/${view}.vue`
    const entries = Object.entries(modules).filter(([path]) => path.endsWith(suffix))
    if (entries.length !== 1) throw new Error(`关联视图 ${appModel}/${view} 未找到或重复`)
    const entry = entries[0][1]
    return typeof entry === 'function' ? entry() : entry
  }
}
