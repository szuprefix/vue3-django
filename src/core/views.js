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
