import { createRouter, createWebHashHistory } from 'vue-router'

export function safeRedirect(value, fallback = '/') {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !value.startsWith('/auth/login') ? value : fallback
}

export function createDjangoRouter({ routes = [], auth, history = createWebHashHistory(), loginPath = '/auth/login/' }) {
  const router = createRouter({ history, routes })
  if (auth) router.beforeEach(async to => {
    if (to.path.replace(/\/$/, '') === loginPath.replace(/\/$/, '') || to.meta.loginRequired === false) return true
    if (!auth.state.user) {
      try { await auth.getUserInfo() } catch (error) {
        if (![401, 403].includes(error.code ?? error.response?.status)) throw error
        auth.removeToken()
        return { path: loginPath, query: { redirect: to.fullPath } }
      }
    }
    return true
  })
  return router
}

export function genModelRouters(apps, component) {
  return Object.entries(apps).flatMap(([app, definition]) => definition.hidden === true || definition.hidden === 'true' ? [] :
    Object.entries(definition.models ?? {}).map(([name, model]) => ({
      path: `/${app}/${name}/`, name: `${app}-${name}-list`, component,
      props: { appModel: `${app}.${name}` }, meta: { title: `${model.verbose_name ?? name}列表`, model },
    })))
}
