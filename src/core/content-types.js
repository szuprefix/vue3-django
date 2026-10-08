// Cache per registry so separate applications never share backend mappings.
const caches = new WeakMap()

export function loadContentTypes(registry) {
  if (caches.has(registry)) return caches.get(registry)
  const pending = (async () => {
    const model = registry.get('contenttypes.contenttype')
    let url = `${model.getListUrl()}all/`
    const rows = []
    const visited = new Set()
    while (url && !visited.has(url)) {
      visited.add(url)
      const { data } = await registry.http.get(url, {
        params: visited.size === 1 ? { page_size: 1000 } : undefined,
      })
      rows.push(...(Array.isArray(data) ? data : (data.results ?? [])))
      url = Array.isArray(data) ? null : data.next
    }
    return Object.fromEntries(rows.map((row) => [row.id, `${row.app_label}.${row.model}`]))
  })()
  caches.set(registry, pending)
  pending.catch(() => {
    if (caches.get(registry) === pending) caches.delete(registry)
  })
  return pending
}
