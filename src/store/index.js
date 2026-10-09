import { computed, inject, reactive, watch } from 'vue'
import { genMenusFromApps } from '../core/menus.js'

export const StoreKey = Symbol('vue3-django-store')

export function createDjangoStore({
  auth,
  http,
  apps = {},
  application = {},
  revisions = reactive({}),
  partyUrl = 'saas/party/current/',
} = {}) {
  const state = reactive({ apps, application, party: null, partyReady: false, revisions })
  const user = computed(() => auth?.state.user ?? null)
  const ready = computed(() => auth?.state.ready ?? !auth)
  const menus = computed(
    () =>
      state.application.menus ??
      genMenusFromApps(
        state.apps,
        undefined,
        user.value?.is_superuser ? undefined : user.value?.model_permissions,
      ),
  )
  const listeners = new Set()
  let partyGeneration = 0
  let pendingParty
  function notify(type, payload) {
    for (const listener of listeners) {
      try {
        listener({ type, payload }, store)
      } catch (error) {
        console.error(error)
      }
    }
  }
  function reset() {
    partyGeneration++
    pendingParty = undefined
    state.party = null
    state.partyReady = false
    for (const key of Object.keys(state.revisions)) delete state.revisions[key]
  }
  const stop = watch(
    () => user.value,
    (current, previous) => {
      if (!current || !previous || current.id !== previous.id) reset()
      notify(user.value ? 'user-ready' : 'user-logout', user.value)
    },
    { flush: 'sync' },
  )
  function can(permission, appModel) {
    if (!auth || user.value?.is_superuser) return true
    const permissions = user.value?.model_permissions?.[appModel] ?? []
    return (Array.isArray(permission) ? permission : [permission]).every((name) =>
      permissions.includes(name),
    )
  }
  function invalidate(appModel) {
    state.revisions[appModel] = (state.revisions[appModel] ?? 0) + 1
    notify('model-changed', appModel)
  }
  async function getPartyInfo() {
    if (!http) throw new Error('租户信息需要配置 HTTP 客户端')
    if (!pendingParty) {
      const generation = partyGeneration
      const request = http
        .get(partyUrl)
        .then(({ data }) => {
          if (generation === partyGeneration) {
            state.party = data
            state.partyReady = true
            notify('party-ready', data)
          }
          return data
        })
        .finally(() => {
          if (pendingParty === request) pendingParty = undefined
        })
      pendingParty = request
    }
    return pendingParty
  }
  const store = {
    state,
    user,
    ready,
    menus,
    auth,
    can,
    invalidate,
    getPartyInfo,
    getUserInfo: () => auth?.getUserInfo(),
    login: (...args) => {
      if (!auth) throw new Error('未启用认证')
      return auth.login(...args)
    },
    async logout() {
      const result = await auth?.logout()
      reset()
      return result
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    dispose() {
      stop()
      reset()
      listeners.clear()
    },
    install(app) {
      app.provide(StoreKey, store)
      app.config.globalProperties.$store = store
      app.onUnmount(() => store.dispose())
    },
  }
  return store
}

export function useDjangoStore() {
  const store = inject(StoreKey, undefined)
  if (!store) throw new Error('useDjangoStore 需要安装 createDjangoStore 或使用 createDjangoApp')
  return store
}
