import { describe, it, expect, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAuth } from '../src/core/auth.js'
import { createDjangoRouter, safeRedirect } from '../src/router/index.js'
describe('认证与路由兼容', () => {
  it('沿用 JWT 登录协议，读取用户后返回，并清理退出状态', async () => {
    const http = { defaults: { headers: { common: {} } }, post: vi.fn().mockResolvedValue({ data: { token: { access: 'test' } } }), get: vi.fn().mockResolvedValue({ data: { id: 1, username: 'admin' } }) }
    const auth = createAuth({ http })
    await auth.login('admin', 'temporary')
    expect(http.post).toHaveBeenCalledWith('auth/user/login/', { username: 'admin', password: 'temporary' })
    expect(http.defaults.headers.common.Authorization).toBe('Bearer test')
    expect(auth.state.user.id).toBe(1)
    await auth.logout()
    expect(auth.state.user).toBeNull()
    expect(http.defaults.headers.common.Authorization).toBeUndefined()
  })
  it('未登录跳转并保留原地址，网络故障不伪装为登录失效', async () => {
    const component = { template: '<div />' }
    const auth = { state: { user: null }, getUserInfo: vi.fn().mockRejectedValue({ code: 403 }), removeToken: vi.fn() }
    const router = createDjangoRouter({ history: createMemoryHistory(), auth, routes: [{ path: '/course/category/', component }, { path: '/auth/login/', component, meta: { loginRequired: false } }] })
    await router.push('/course/category/?page=2')
    expect(router.currentRoute.value.path).toBe('/auth/login/')
    expect(router.currentRoute.value.query.redirect).toBe('/course/category/?page=2')
    auth.getUserInfo.mockRejectedValue(new Error('offline'))
    router.onError(() => {})
    await expect(router.push('/course/category/')).rejects.toThrow('offline')
  })
  it('禁止外部登录回跳地址', () => {
    expect(safeRedirect('//evil.example')).toBe('/')
    expect(safeRedirect('/course/category/?page=2')).toBe('/course/category/?page=2')
  })
})
