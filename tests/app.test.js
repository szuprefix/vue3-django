import { expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createDjangoApp } from '../src/app/index.js'
import { demoAdapter } from '../examples/demo/mock.js'
import { mockApps } from '../examples/demo/apps.js'
import { createHttp } from '../src/core/http.js'

it('默认应用挂载布局和 welcome 首页，保留可覆盖的底层实例', async () => {
  const application = createDjangoApp({
    apps: mockApps,
    auth: false,
    title: '测试工作台',
    history: createMemoryHistory(),
    http: createHttp({ adapter: demoAdapter }),
  })
  const target = document.createElement('div')
  document.body.append(target)
  application.mount(target)
  await application.router.isReady()
  expect(application.router.currentRoute.value.path).toBe('/home/')
  expect(target.textContent).toContain('Welcome')
  expect(target.textContent).toContain('测试工作台')
  expect(target.querySelector('.viewtabs')).not.toBeNull()
  expect(application.registry.get('demo.project')).toBeDefined()
  expect(application.auth).toBeUndefined()
  application.app.unmount()
  target.remove()
})

it('默认认证守卫将未登录用户带到内置登录页', async () => {
  const auth = {
    state: { user: null },
    getUserInfo: vi.fn().mockRejectedValue({ code: 401 }),
    removeToken: vi.fn(),
  }
  const application = createDjangoApp({ apps: mockApps, auth, history: createMemoryHistory() })
  await application.router.push('/demo/project/')
  expect(application.router.currentRoute.value.path).toBe('/auth/login/')
  expect(application.router.currentRoute.value.query.redirect).toBe('/demo/project/')
  expect(auth.removeToken).toHaveBeenCalledOnce()
  const target = document.createElement('div')
  document.body.append(target)
  application.mount(target)
  await application.router.isReady()
  expect(target.textContent).toContain('登录 vue3-django')
  expect(target.querySelector('input[type="password"]')).not.toBeNull()
  expect(target.querySelector('.viewtabs')).toBeNull()
  application.app.unmount()
  target.remove()
})

it('业务视图优先，配置模块进入 registry，布局与语言可覆盖', async () => {
  const custom = { render: () => null }
  const application = createDjangoApp({
    apps: mockApps,
    auth: false,
    history: createMemoryHistory(),
    components: { layout: custom },
    viewModules: { './views/demo/project/list.vue': async () => ({ default: custom }) },
    configModules: { './views/demo/project/config.js': { default: { list: { items: ['name'] } } } },
  })
  const route = application.router.getRoutes().find((item) => item.name === 'demo-project-list')
  expect(await route.components.default()).toBe(custom)
  expect((await application.registry.get('demo.project').loadViewsConfig()).list.items).toEqual([
    'name',
  ])
  expect(application.router.resolve('/').matched[0].components.default).toBe(custom)
})

it('空 apps 使用欢迎页而非重定向循环', async () => {
  const application = createDjangoApp({ auth: false, history: createMemoryHistory() })
  await application.router.push('/')
  expect(application.router.currentRoute.value.path).toBe('/home/')
  expect(() => createDjangoApp({ homePath: '/', history: createMemoryHistory() })).toThrow(
    'homePath',
  )
})

it('首页组件可替换，显式 homePath 保持优先，welcome 地址兼容', async () => {
  const home = { render: () => null }
  const application = createDjangoApp({
    apps: mockApps,
    auth: false,
    history: createMemoryHistory(),
    homePath: '/demo/project/',
    components: { home },
  })
  await application.router.push('/')
  expect(application.router.currentRoute.value.path).toBe('/demo/project/')
  expect(application.router.resolve('/welcome/').matched.at(-1).components.default).toBe(home)
})
