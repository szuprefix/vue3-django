import { inject } from 'vue'

export const TabKey = Symbol('vue3-django-tab')

export function useViewTab() {
  return inject(TabKey, null)
}
