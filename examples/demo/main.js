import { createApp, reactive } from 'vue'
import 'element-plus/dist/index.css'
import 'vant/lib/index.css'
import {
  createHttp,
  createRegistry,
  createDjango,
  createAuth,
  createDjangoRouter,
  genModelRouters,
  createViewsConfigLoader,
} from '../../src/index.js'
import { demoAdapter } from './mock.js'
import App from './App.vue'
import Root from './Root.vue'
import Login from './Login.vue'
import { apiApps, mockApps } from './apps.js'
const realApi = import.meta.env.VITE_REAL_API === 'true'
const apps = realApi ? apiApps : mockApps
const registry = createRegistry({
  http: realApi ? createHttp() : createHttp({ adapter: demoAdapter }),
  apps,
  loadViewsConfig: createViewsConfigLoader(import.meta.glob('./views/**/config.js')),
})
const auth = realApi ? createAuth({ http: registry.http }) : undefined
const modelPath = realApi ? '/course/category/' : '/demo/project/'
const router = createDjangoRouter({
  auth,
  routes: [
    { path: '/', redirect: modelPath },
    realApi
      ? {
          path: '/auth/login/',
          component: Login,
          meta: { loginRequired: false, layout: 'main', title: '登录' },
        }
      : { path: '/auth/login/', redirect: modelPath },
    ...genModelRouters(apps, { list: App, create: App, edit: App }),
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
createApp(Root)
  .use(createDjango({ registry, auth, apps, revisions: reactive({}) }))
  .use(router)
  .mount('#app')
