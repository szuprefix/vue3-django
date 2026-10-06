import { createHttp } from './http.js'
import { fieldsFromOptions, emptyData, writableData } from './metadata.js'

export function createRegistry({ http = createHttp(), apps = {}, views = {}, loadViewsConfig } = {}) {
  const configs = Object.create(null)
  const models = new Map()
  const registry = {
    http, configs,
    register(apps) {
      for (const [app, definition] of Object.entries(apps)) {
        for (const [name, model] of Object.entries(definition.models ?? {})) {
          const fullName = `${app}.${name}`
          configs[fullName] = { ...model, app, name, fullName }
          models.delete(fullName)
        }
      }
      return registry
    },
    getConfig(name) {
      if (!configs[name]) throw new Error(`model ${name} not found!`)
      return configs[name]
    },
    get(name) {
      if (!models.has(name)) models.set(name, AppModel(registry.getConfig(name), { http, views, loadViewsConfig }))
      return models.get(name)
    },
  }
  return registry.register(apps)
}

export function AppModel(config, { http = createHttp(), views = {}, loadViewsConfig } = {}) {
  const fullName = config.fullName ?? `${config.app}.${config.name}`
  // Relative URL preserves deployment prefixes such as /tenant/api/.
  const listUrl = config.url ?? `${config.app}/${config.name}/`
  let pendingOptions
  let pendingViews
  const model = {
    config, name: config.name, fullName, appModel: fullName, listUrl,
    verboseName: config.verbose_name ?? config.name, title_field: config.title_field ?? 'name',
    getListUrl: () => listUrl,
    getDetailUrl(id) {
      if (id == null || id === '') throw new Error('详情请求需要主键')
      return `${listUrl}${encodeURIComponent(id)}/`
    },
    loadOptions() {
      if (config.rest_options) return Promise.resolve(config.rest_options)
      if (!pendingOptions) pendingOptions = http.options(listUrl).then(({ data }) => {
        if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) {
          throw new Error(`模型 ${fullName} 的 OPTIONS 返回空或无效元数据，请检查 API 代理是否拦截了 OPTIONS 请求`)
        }
        config.rest_options = data
        return data
      }).finally(() => { pendingOptions = undefined })
      return pendingOptions
    },
    loadViewsConfig() {
      if (!pendingViews) pendingViews = Promise.resolve().then(() =>
        views[fullName] ?? (loadViewsConfig ? loadViewsConfig(fullName) : {}),
      ).catch(error => { pendingViews = undefined; throw error })
      return pendingViews
    },
    async fields(method = 'POST') { return fieldsFromOptions(await model.loadOptions(), method) },
    loadObject(id) { return http.get(model.getDetailUrl(id)).then(r => r.data) },
    query(params = {}, url = listUrl) { return http.get(url, { params }).then(r => r.data) },
    async save(data, id, defaults = {}) {
      const fields = await model.fields(id == null ? 'POST' : 'PATCH')
      const payload = writableData({ ...defaults, ...data }, fields)
      const response = id == null ? await http.post(listUrl, payload) : await http.patch(model.getDetailUrl(id), payload)
      return response.data
    },
    destroy(id) { return http.delete(model.getDetailUrl(id)).then(r => r.data) },
    doAction(action, data = {}, method = 'post', id) {
      if (!/^[\w-]+$/.test(action)) throw new Error('动作名只能包含字母、数字、下划线和连字符')
      const url = `${id == null ? listUrl : model.getDetailUrl(id)}${action}/`
      return http.request({ url, method, ...(['get', 'head'].includes(method.toLowerCase()) ? { params: data } : { data }) }).then(r => r.data)
    },
    genEmptyDataFromRestOptions: emptyData,
  }
  return model
}
export const Register = createRegistry()
