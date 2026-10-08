import { createRouter, createWebHashHistory } from 'vue-router'

const modelTemplates = import.meta.glob('../views/model/*.vue')

// Vite must discover host views at build time; pass the host's import.meta.glob map.
export function import_or_use_template(path, template, modules = {}, templates = {}) {
  if (!/^[\w-]+(?:\/[\w-]+)*$/.test(path) || !/^[\w-]+$/.test(template)) {
    throw new Error('模型视图路径无效')
  }
  const suffix = `/views/${path}.vue`
  const matches = Object.entries(modules).filter(([key]) => key.endsWith(suffix))
  if (matches.length > 1) throw new Error(`模型视图 ${path} 重复`)
  return async () => {
    const loader =
      matches[0]?.[1] ?? templates[template] ?? modelTemplates[`../views/model/${template}.vue`]
    if (!loader) throw new Error(`模型视图 ${path} 与模板 ${template} 均未找到`)
    // An existing view's runtime/import error must not be swallowed by a fallback.
    const module = typeof loader === 'function' ? await loader() : loader
    return module.default ?? module
  }
}

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

export function genModelRouters(apps, components) {
  const options = components?.modules || components?.templates ? components : {}
  const views =
    options === components || !components
      ? {}
      : typeof components === 'object' && components.list
        ? components
        : { list: components, create: components, edit: components }
  return Object.entries(apps).flatMap(([app, definition]) =>
    definition.hidden === true || definition.hidden === 'true'
      ? []
      : Object.entries(definition.models ?? {}).flatMap(([name, model]) => {
          const path = `/${app}/${name}/`,
            appModel = `${app}.${name}`,
            title = model.verbose_name ?? name
          const resolveView = (view, template = view) =>
            views[view] ??
            import_or_use_template(
              `${app}/${name}/${view}`,
              template,
              options.modules,
              options.templates,
            )
          return [
            {
              path,
              name: `${app}-${name}-list`,
              component: resolveView('list'),
              props: { appModel, mode: 'list' },
              meta: { title: `${title}列表`, model },
            },
            {
              path: `${path}add/`,
              name: `${app}-${name}-add`,
              component: views.create ?? views.edit ?? resolveView('edit'),
              props: { appModel, mode: 'create' },
              meta: { title: `新增${title}`, model },
            },
            {
              path: `${path}:id/`,
              name: `${app}-${name}-edit`,
              component: resolveView('edit'),
              props: (route) => ({ appModel, mode: 'edit', id: route.params.id }),
              meta: { title: `编辑${title}`, model },
            },
          ]
        }),
  )
}
