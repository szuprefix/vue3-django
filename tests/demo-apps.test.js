import { expect, it } from 'vitest'
import { apiApps, mockApps } from '../examples/dashboard/apps.js'
import { createRegistry } from '../src/core/registry.js'
import { genMenusFromApps } from '../src/core/menus.js'
import { genModelRouters } from '../src/router/index.js'

it('原 dashboard apps 配置注册完整模型并保留菜单和路由元数据', () => {
  const registry = createRegistry({ apps: apiApps })
  const count = Object.values(apiApps).reduce(
    (total, app) => total + Object.keys(app.models).length,
    0,
  )
  expect(Object.keys(apiApps)).toHaveLength(14)
  expect(count).toBe(39)
  expect(Object.keys(registry.configs)).toHaveLength(count)
  expect(registry.getConfig('exam.paper').title_field).toBe('title')
  expect(registry.getConfig('school.student').actions[0].name).toBe('import')
  expect(registry.getConfig('course.course').itemActions[0].name).toBe('get_outline_url')
  const menus = genMenusFromApps(apiApps)
  expect(menus['测验'].items.map((item) => item.url)).toContain('/exam/paper/')
  expect(menus['学校'].items.map((item) => item.url)).not.toContain('/school/grade/')
  expect(menus['内容分类']).toBeUndefined()
  expect(menus['课程'].icon).toBe('book')
  const routes = genModelRouters(apiApps, {})
  const routableCount = Object.values(apiApps)
    .filter((app) => !app.hidden)
    .reduce((total, app) => total + Object.keys(app.models).length, 0)
  expect(routes).toHaveLength(routableCount * 3)
  expect(routes.some((route) => route.path === '/clockin/membership/')).toBe(true)
  expect(Object.keys(mockApps)).toEqual(['demo', 'crm'])
})

it('重考动作兼容新 AppModel，不调用旧版 emitPosted', async () => {
  const calls = []
  const result = await apiApps.exam.models.performance.itemActions[0].do({
    model: {
      config: {},
      doAction: (...args) => {
        calls.push(args)
        return Promise.resolve('ok')
      },
    },
    row: { id: 2 },
  })
  expect(result).toBe('ok')
  expect(calls).toEqual([['erase', {}, 'delete', 2]])
})
