import { describe, it, expect, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAuth } from '../src/core/auth.js'
import { createDjangoRouter, genModelRouters, safeRedirect } from '../src/router/index.js'
describe('认证与路由兼容', () => {
  it('模型路由保留旧编辑路径，新增地址优先于主键匹配', () => {
    const component = { template: '<div />' }
    const router = createDjangoRouter({ history: createMemoryHistory(), routes: genModelRouters({ course: { models: { category: { verbose_name: '类别' } } } }, { list: component, create: component, edit: component }) })
    expect(router.resolve('/course/category/').name).toBe('course-category-list')
    expect(router.resolve('/course/category/add/').name).toBe('course-category-add')
    const edit = router.resolve('/course/category/0/')
    expect(edit.name).toBe('course-category-edit')
    expect(edit.params.id).toBe('0')
    expect(edit.matched[0].props.default(edit)).toEqual({ appModel: 'course.category', mode: 'edit', id: '0' })
  })
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
