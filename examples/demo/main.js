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
const realApi = import.meta.env.VITE_REAL_API === 'true'
const apps = realApi
  ? {
      course: {
        verbose_name: '课程管理',
        models: { category: { verbose_name: '课程类别' }, course: { verbose_name: '课程' } },
      },
      school: {
        verbose_name: '学校管理',
        models: { grade: { verbose_name: '年级' }, college: { verbose_name: '学院' } },
      },
    }
  : {
      demo: {
        verbose_name: '项目管理',
        models: { project: { verbose_name: '项目' }, task: { verbose_name: '任务' } },
      },
      crm: {
        verbose_name: '客户管理',
        models: { customer: { verbose_name: '客户' }, contact: { verbose_name: '联系人' } },
      },
    }
const registry = createRegistry(
  realApi
    ? {
        loadViewsConfig: createViewsConfigLoader(import.meta.glob('./views/**/config.js')),
        http: createHttp(),
        apps,
        views: {
          'course.category': {
            list: { items: ['id', 'name', 'code', 'create_time', 'update_time'] },
            form: { items: ['name', 'code'] },
          },
        },
      }
    : {
        http: createHttp({ adapter: demoAdapter }),
        apps,
        views: {
          'demo.project': {
            list: {
              items: ['id', 'name', 'status', 'budget', 'enabled'],
              options: {
                remoteTable: { rowActions: [{ name: 'pause', label: '暂停', api: 'pause' }] },
              },
            },
            form: { items: ['name', 'status', 'budget', 'enabled'] },
          },
        },
      },
)
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
