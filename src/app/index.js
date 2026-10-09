import { createApp, h, reactive } from 'vue'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from './App.vue'
import Root from './Root.vue'
import Login from './Login.vue'
import Home from './Home.vue'
import { createHttp } from '../core/http.js'
import { createRegistry } from '../core/registry.js'
import { createAuth } from '../core/auth.js'
import { createDjangoStore } from '../store/index.js'
import { createViewsConfigLoader } from '../core/views.js'
import { createRelationViewLoader } from '../core/views.js'
import { createDrawerViewLoader } from '../composables/drawer.js'
import { createDjango } from '../composables/context.js'
import { createDjangoRouter, genModelRouters } from '../router/index.js'

export function createDjangoApp(options = {}) {
  const apps = options.apps ?? {}
  const viewModules = options.viewModules ?? {}
  const registry =
    options.registry ??
    createRegistry({
      apps,
      http: options.http ?? createHttp({ baseURL: options.apiBaseURL ?? '/api/' }),
      loadViewsConfig:
        options.loadViewsConfig ?? createViewsConfigLoader(options.configModules ?? {}),
    })
  const auth =
    options.auth === false
      ? undefined
      : options.auth && typeof options.auth === 'object'
        ? options.auth
        : createAuth({ ...options.authOptions, http: registry.http })
  const modelRoutes = genModelRouters(
    apps,
    options.modelViews ?? { modules: viewModules, templates: options.templates },
  )
  const homePath = options.homePath ?? '/home/'
  const loginPath = options.loginPath ?? '/auth/login/'
  if (homePath === '/' || homePath === loginPath) throw new Error('homePath 不能指向根路径或登录页')
  const application = reactive({
    title: options.title ?? 'vue3-django',
    homePath,
    loginPath,
    menus: options.menus,
    layoutProps: {
      loadDrawerView: createDrawerViewLoader(viewModules),
      ...options.layoutProps,
    },
  })
  const router =
    options.router ??
    createDjangoRouter({
      auth,
      history: options.history,
      loginPath,
      routes: [
        {
          path: '/',
          component: options.components?.layout ?? Root,
          children: [
            { path: '', redirect: homePath },
            {
              path: '/home/',
              alias: '/welcome/',
              name: 'django-home',
              component: options.components?.home ?? Home,
              meta: { title: '欢迎', icon: 'home' },
            },
            ...modelRoutes,
            ...(options.routes ?? []),
          ],
        },
        auth
          ? {
              path: loginPath,
              component: options.components?.login ?? Login,
              meta: { loginRequired: false, layout: 'main' },
            }
          : { path: loginPath, redirect: homePath },
        { path: '/:pathMatch(.*)*', redirect: homePath },
      ],
    })
  const store =
    options.store ??
    createDjangoStore({
      apps,
      application,
      auth,
      http: registry.http,
      revisions: options.context?.revisions,
      ...options.storeOptions,
    })
  if (store.auth !== auth) throw new Error('store 与应用必须使用同一个 auth 实例')
  const context = {
    ...options.context,
    apps,
    auth,
    application,
    store,
    revisions: store.state.revisions,
    loadRelationView: options.context?.loadRelationView ?? createRelationViewLoader(viewModules),
  }
  const app = createApp({
    render: () =>
      h(
        ElConfigProvider,
        { locale: options.locale ?? zhCn, size: options.size },
        { default: () => h(options.components?.app ?? App) },
      ),
  })
  app
    .use(store)
    .use(createDjango({ registry, ...context }))
    .use(router)
  return { app, router, registry, auth, store, mount: (target = '#app') => app.mount(target) }
}
