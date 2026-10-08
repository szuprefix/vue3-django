import { createRouter, createWebHashHistory } from 'vue-router'
import ModelListView from '../views/model/list.vue'
import ModelEditView from '../views/model/edit.vue'

export function safeRedirect(value, fallback = '/') {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !value.startsWith('/auth/login')
    ? value
    : fallback
}

export function createDjangoRouter({
  routes = [],
  auth,
  history = createWebHashHistory(),
  loginPath = '/auth/login/',
}) {
  const router = createRouter({ history, routes })
  if (auth)
    router.beforeEach(async (to) => {
      if (
        to.path.replace(/\/$/, '') === loginPath.replace(/\/$/, '') ||
        to.meta.loginRequired === false
      )
        return true
      if (!auth.state.user) {
        try {
          await auth.getUserInfo()
        } catch (error) {
          if (![401, 403].includes(error.code ?? error.response?.status)) throw error
          auth.removeToken()
          return { path: loginPath, query: { redirect: to.fullPath } }
        }
      }
      return true
    })
  return router
}

export function genModelRouters(
  apps,
  components = {
    list: ModelListView,
    create: ModelEditView,
    edit: ModelEditView,
  },
) {
  const views =
    typeof components === 'object' && components.list
      ? components
      : { list: components, create: components, edit: components }
  return Object.entries(apps).flatMap(([app, definition]) =>
    definition.hidden === true || definition.hidden === 'true'
      ? []
      : Object.entries(definition.models ?? {}).flatMap(([name, model]) => {
          const path = `/${app}/${name}/`,
            appModel = `${app}.${name}`,
            title = model.verbose_name ?? name
          return [
            {
              path,
              name: `${app}-${name}-list`,
              component: views.list,
              props: { appModel, mode: 'list' },
              meta: { title: `${title}列表`, model },
            },
            {
              path: `${path}add/`,
              name: `${app}-${name}-add`,
              component: views.create ?? views.edit,
              props: { appModel, mode: 'create' },
              meta: { title: `新增${title}`, model },
            },
            {
              path: `${path}:id/`,
              name: `${app}-${name}-edit`,
              component: views.edit,
              props: (route) => ({ appModel, mode: 'edit', id: route.params.id }),
              meta: { title: `编辑${title}`, model },
            },
          ]
        }),
  )
}
