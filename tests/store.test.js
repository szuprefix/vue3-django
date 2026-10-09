import { it, expect, vi } from 'vitest'
import { reactive } from 'vue'
import { createDjangoStore } from '../src/store/index.js'

const apps = { demo: { models: { project: { verbose_name: '项目' }, task: {} } } }

it('store 复用认证状态，集中计算菜单权限，应用实例相互隔离', () => {
  const auth = { state: reactive({ user: null, ready: false }) }
  const a = createDjangoStore({ auth, apps })
  const b = createDjangoStore({ apps })
  auth.state.user = { id: 1, model_permissions: { 'demo.project': ['update'] } }
  expect(a.user.value).toBe(auth.state.user)
  expect(a.can('update', 'demo.project')).toBe(true)
  expect(a.can(['update', 'destroy'], 'demo.project')).toBe(false)
  expect(a.menus.value.demo.items.map((item) => item.url)).toEqual(['/demo/project/'])
  a.invalidate('demo.project')
  expect(a.state.revisions['demo.project']).toBe(1)
  expect(b.state.revisions['demo.project']).toBeUndefined()
  auth.state.user = { id: 1, is_superuser: true, model_permissions: {} }
  expect(a.can('destroy', 'demo.project')).toBe(true)
  expect(a.menus.value.demo.items).toHaveLength(2)
  a.dispose()
  b.dispose()
})

it('用户切换清除租户和刷新状态，订阅可取消，退出委托认证', async () => {
  const auth = {
    state: reactive({ user: { id: 1 }, ready: true }),
    logout: vi.fn(async () => {
      auth.state.user = null
    }),
  }
  const http = { get: vi.fn().mockResolvedValue({ data: { name: '租户' } }) }
  const store = createDjangoStore({ auth, http })
  const listener = vi.fn()
  const unsubscribe = store.subscribe(listener)
  await Promise.all([store.getPartyInfo(), store.getPartyInfo()])
  expect(http.get).toHaveBeenCalledTimes(1)
  expect(store.state.party.name).toBe('租户')
  store.invalidate('demo.project')
  auth.state.user = { id: 2 }
  expect(store.state.party).toBeNull()
  expect(store.state.revisions).toEqual({})
  expect(listener).toHaveBeenCalledWith({ type: 'user-ready', payload: auth.state.user }, store)
  unsubscribe()
  const count = listener.mock.calls.length
  await store.logout()
  expect(auth.logout).toHaveBeenCalledTimes(1)
  expect(listener).toHaveBeenCalledTimes(count)
  store.dispose()
})

it('退出后的旧租户请求不会恢复状态，失败可重试', async () => {
  let resolve
  const http = {
    get: vi.fn(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    ),
  }
  const store = createDjangoStore({ http })
  const pending = store.getPartyInfo()
  await store.logout()
  resolve({ data: { name: '过期租户' } })
  await pending
  expect(store.state.party).toBeNull()
  http.get.mockRejectedValueOnce(new Error('offline'))
  await expect(store.getPartyInfo()).rejects.toThrow('offline')
  http.get.mockResolvedValueOnce({ data: { name: '新租户' } })
  await store.getPartyInfo()
  expect(store.state.party.name).toBe('新租户')
  store.dispose()
})
