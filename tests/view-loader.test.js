import { expect, it, vi } from 'vitest'
import { import_or_use_template, genModelRouters } from '../src/router/index.js'

it('优先加载宿主模型视图，缺失时动态加载内置模板', async () => {
  const custom = { name: 'CustomList' }
  const load = vi.fn().mockResolvedValue({ default: custom })
  const modules = { './views/demo/project/list.vue': load }
  const routes = genModelRouters({ demo: { models: { project: {} } } }, { modules })
  expect(load).not.toHaveBeenCalled()
  expect(await routes[0].component()).toBe(custom)
  expect((await routes[2].component()).__name).toBe('edit')
})

it('已有视图加载失败不会回退，缺失模板与无效路径明确报错', async () => {
  const failure = new Error('view failed')
  await expect(
    import_or_use_template('demo/project/list', 'list', {
      './views/demo/project/list.vue': () => Promise.reject(failure),
    })(),
  ).rejects.toBe(failure)
  await expect(import_or_use_template('demo/project/missing', 'missing')()).rejects.toThrow(
    '均未找到',
  )
  expect(() => import_or_use_template('../private', 'edit')).toThrow('路径无效')
})
