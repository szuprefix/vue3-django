import { inject } from 'vue'

export const DrawerKey = Symbol('vue3-django-drawer')

export function useDrawer() {
  return inject(DrawerKey, undefined)
}

// The host supplies an explicit Vite glob; no arbitrary dynamic import paths.
export function createDrawerViewLoader(modules) {
  return async (path) => {
    if (!/^[\w-]+(?:\/[\w-]+)*$/.test(path)) throw new Error('抽屉视图路径无效')
    const matches = Object.entries(modules).filter(([key]) => key.endsWith(`/views/${path}.vue`))
    if (matches.length !== 1) throw new Error(`抽屉视图 ${path} 未找到或重复`)
    const entry = matches[0][1]
    const module = typeof entry === 'function' ? await entry() : entry
    return module.default ?? module
  }
}
