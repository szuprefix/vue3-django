import { inject } from 'vue'
import { Register } from '../core/registry.js'
export const DjangoKey = Symbol('vue3-django')
export function useDjango() {
  return inject(DjangoKey, { registry: Register })
}
export function createDjango({ registry, ...options }) {
  return {
    install(app) {
      const context = { registry, ...options }
      app.provide(DjangoKey, context)
      app.config.globalProperties.$http = registry.http
      app.config.globalProperties.$django = context
    },
  }
}
