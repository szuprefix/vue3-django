import { describe, it, expect, vi } from 'vitest'
import { createHttp, DrfError } from '../src/core/http.js'
import { createRegistry } from '../src/core/registry.js'
import { emptyData, fieldsFromOptions, normalizeItems } from '../src/core/metadata.js'
const metadata = { actions: { LIST: { id: { read_only: true } }, POST: { name: { type: 'string' }, enabled: { type: 'boolean', default: true }, budget: { type: 'integer', default: 8 } } } }
function setup(http, config = {}) {
  return createRegistry({ http, apps: { crm: { models: { project: config } } } }).get('crm.project')
}
describe('旧框架与 DRF 协议', () => {
  it('保留 app.model、字段覆盖和 falsy 默认值，排除只读字段', () => {
    const fields = fieldsFromOptions(metadata)
    expect(emptyData(fields, { enabled: false, budget: 0 })).toEqual({ name: '', enabled: false, budget: 0 })
    expect(normalizeItems(['name', { name: 'budget', label: '额度' }], fields)[1]).toMatchObject({ type: 'integer', label: '额度' })
  })
  it('元数据并发去重，失败允许重试', async () => {
    const http = { options: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: metadata }) }
    const model = setup(http)
    await expect(model.loadOptions()).rejects.toThrow('offline')
    await Promise.all([model.loadOptions(), model.loadOptions()])
    await model.loadOptions()
    expect(http.options).toHaveBeenCalledTimes(2)
  })
  it('新增 POST、编辑 PATCH，id=0 是有效主键且过滤只读/未知字段', async () => {
    const http = { post: vi.fn().mockResolvedValue({ data: { id: 0 } }), patch: vi.fn().mockResolvedValue({ data: { id: 0 } }) }
    const model = setup(http, { rest_options: metadata })
    await model.save({ id: 8, name: 'A', unknown: 'x' })
    expect(http.post).toHaveBeenCalledWith('crm/project/', { name: 'A' })
    await model.save({ id: 0, enabled: false, budget: 0 }, 0)
    expect(http.patch).toHaveBeenCalledWith('crm/project/0/', { enabled: false, budget: 0 })
  })
  it('空 OPTIONS 响应显式失败，恢复后可重新加载中文标签和必填规则', async () => {
    const realMetadata = { actions: { POST: { name: { type: 'string', label: '名称', required: true } } } }
    const http = { options: vi.fn().mockResolvedValueOnce({ status: 204, data: '' }).mockResolvedValue({ data: realMetadata }) }
    const model = setup(http)
    await expect(model.fields()).rejects.toThrow('OPTIONS 返回空或无效元数据')
    expect(model.config.rest_options).toBeUndefined()
    await expect(model.fields()).resolves.toMatchObject({ name: { label: '名称', required: true } })
    expect(http.options).toHaveBeenCalledTimes(2)
  })
  it('保持尾斜杠、集合/详情动作、GET 参数位置', async () => {
    const http = { request: vi.fn().mockResolvedValue({ data: {} }) }
    const model = setup(http)
    await model.doAction('batch_disable', { ids: [0, 1] })
    expect(http.request).toHaveBeenLastCalledWith({ url: 'crm/project/batch_disable/', method: 'post', data: { ids: [0, 1] } })
    await model.doAction('preview', { mode: 'full' }, 'get', 0)
    expect(http.request).toHaveBeenLastCalledWith({ url: 'crm/project/0/preview/', method: 'get', params: { mode: 'full' } })
    expect(() => model.getDetailUrl()).toThrow('主键')
  })
  it('请求保持部署前缀、逗号数组、Token 设置与清除', () => {
    const http = createHttp({ baseURL: '/tenant/api/' })
    expect(http.getUri({ url: 'crm/project/', params: { id__in: [1, 2], active: false, budget: 0 } })).toBe('/tenant/api/crm/project/?id__in=1%2C2&active=false&budget=0')
    expect(http.defaults.xsrfCookieName).toBe('csrftoken')
    http.setAuthToken('abc'); expect(http.defaults.headers.common.Authorization).toBe('Token abc')
    http.setAuthToken(null); expect(http.defaults.headers.common.Authorization).toBeUndefined()
  })
  it('兼容 code/msg，字段/非字段/网络错误可用', () => {
    const error = new DrfError({ response: { status: 400, data: { name: ['已存在'], non_field_errors: ['冲突'] } } })
    expect(error.code).toBe(400); expect(error.fields).toEqual({ name: '已存在', non_field_errors: '冲突' })
    expect(new DrfError({ message: 'offline' }).code).toBe(-1)
  })
  it('注册表实例隔离，缺失模型显式失败', () => {
    const a = createRegistry({ apps: { crm: { models: { project: {} } } } }), b = createRegistry()
    expect(a.get('crm.project')).toBe(a.get('crm.project'))
    expect(() => b.get('crm.project')).toThrow('not found')
  })
})
