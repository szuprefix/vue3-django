import { createApp } from 'vue'
import 'element-plus/dist/index.css'
import 'vant/lib/index.css'
import { createHttp, createRegistry, createDjango, createAuth, createDjangoRouter } from '../../src/index.js'
import { demoAdapter } from './mock.js'
import App from './App.vue'
import Root from './Root.vue'
import Login from './Login.vue'
const realApi = import.meta.env.VITE_REAL_API === 'true'
const registry = createRegistry(realApi ? {
  http: createHttp(),
  apps: { course: { verbose_name: '课程', models: { category: { verbose_name: '课程类别', title_field: 'name' } } } },
  views: { 'course.category': {
    list: { items: ['id', 'name', 'code', 'create_time', 'update_time'] },
    form: { items: ['name', 'code'] },
  } },
} : {
  http: createHttp({ adapter: demoAdapter }),
  apps: { demo: { verbose_name: '演示', models: { project: { verbose_name: '项目', title_field: 'name' } } } },
  views: { 'demo.project': {
    list: { items: ['id', 'name', 'status', 'budget', 'enabled'], options: { remoteTable: { rowActions: [{ name: 'pause', label: '暂停', api: 'pause' }] } } },
    form: { items: ['name', 'status', 'budget', 'enabled'] },
  } },
})
const auth = realApi ? createAuth({ http: registry.http }) : undefined
const modelPath = realApi ? '/course/category/' : '/demo/project/'
const router = createDjangoRouter({ auth, routes: [
  { path: '/', redirect: modelPath },
  realApi ? { path: '/auth/login/', component: Login, meta: { loginRequired: false, layout: 'main', title: '登录' } } : { path: '/auth/login/', redirect: modelPath },
  { path: modelPath, component: App, meta: { loginRequired: realApi, title: realApi ? '课程类别列表' : '项目列表' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
] })
createApp(Root).use(createDjango({ registry, auth })).use(router).mount('#app')
