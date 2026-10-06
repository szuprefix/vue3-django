import { AxiosError } from 'axios'
const fields = {
  id: { type: 'integer', label: '编号', read_only: true },
  name: { type: 'string', label: '项目名称', required: true, max_length: 80 },
  status: { type: 'choice', label: '状态', default: 'active', choices: [{ value: 'active', display_name: '进行中' }, { value: 'paused', display_name: '已暂停' }] },
  budget: { type: 'integer', label: '预算', default: 0 },
  enabled: { type: 'boolean', label: '启用', default: false },
}
let rows = Array.from({ length: 23 }, (_, i) => ({ id: i + 1, name: ['企业客户门户', '订单管理系统', '服务运营平台'][i % 3] + ` ${i + 1}`, status: i % 4 ? 'active' : 'paused', budget: 10000 * (i + 1), enabled: i % 3 !== 0 }))
let nextId = 24
export async function demoAdapter(config) {
  await new Promise(resolve => setTimeout(resolve, 120))
  const method = config.method.toLowerCase()
  const id = config.url.match(/project\/(\d+)\//)?.[1]
  const input = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
  const respond = (data, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config })
  const reject = (status, data) => { throw new AxiosError('请求失败', 'ERR_BAD_REQUEST', config, null, respond(data, status)) }
  if (method === 'options') return respond({ name: '项目', actions: { LIST: fields, POST: fields, PATCH: fields } })
  if (method === 'get' && !id) {
    const params = config.params ?? {}
    const matches = rows.filter(r => !params.search || r.name.includes(params.search))
    const size = Number(params.page_size ?? 10), page = Number(params.page ?? 1)
    return respond({ count: matches.length, results: matches.slice((page - 1) * size, page * size), next: null, previous: null })
  }
  const row = rows.find(r => r.id === Number(id))
  if (id && !row) return reject(404, { detail: '记录不存在' })
  if (method === 'get') return respond({ ...row })
  if (config.url.endsWith('pause/')) { row.status = 'paused'; return respond({ ...row }) }
  if (method === 'post' || method === 'patch') {
    if (!input.name?.trim()) return reject(400, { name: ['项目名称不能为空'] })
    if (rows.some(r => r.name === input.name && r.id !== Number(id))) return reject(400, { name: ['项目名称已存在，请修改'] })
    if (method === 'post') { const created = { ...input, id: nextId++ }; rows.push(created); return respond(created, 201) }
    Object.assign(row, input); return respond({ ...row })
  }
  if (method === 'delete') { rows = rows.filter(r => r !== row); return respond(null, 204) }
  return reject(405, { detail: '不支持的演示请求' })
}
