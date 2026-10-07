import { onScopeDispose, ref } from 'vue'

export function useRemoteTable({
  request,
  baseQueries = () => ({}),
  pageSize = () => 10,
  onLoaded,
  onError,
}) {
  const rows = ref([])
  const count = ref(0)
  const page = ref(1)
  const queries = ref({})
  const ordering = ref()
  const loading = ref(false)
  const error = ref('')
  let generation = 0

  async function load() {
    const current = ++generation
    loading.value = true
    error.value = ''
    try {
      const result = await request({
        ...queries.value,
        ordering: ordering.value,
        page: page.value,
        page_size: pageSize(),
        ...baseQueries(),
      })
      if (current !== generation) return
      const data = Array.isArray(result) ? result : result?.results
      const total = Array.isArray(result) ? result.length : result?.count
      if (!Array.isArray(data) || !Number.isFinite(total))
        throw new Error('列表需要 count/results 分页响应或数组响应')
      rows.value = data
      count.value = total
      onLoaded?.(result)
      return result
    } catch (cause) {
      if (current !== generation) return
      rows.value = []
      count.value = 0
      error.value = cause.message
      onError?.(cause)
    } finally {
      if (current === generation) loading.value = false
    }
  }
  function search(value) {
    queries.value = { ...value }
    page.value = 1
    return load()
  }
  function changePage(value) {
    page.value = value
    return load()
  }
  function sort({ prop, order }) {
    ordering.value = order && prop ? `${order === 'descending' ? '-' : ''}${prop}` : undefined
    page.value = 1
    return load()
  }
  onScopeDispose(() => {
    generation++
  })
  return {
    rows,
    count,
    page,
    queries,
    loading,
    error,
    load,
    refresh: load,
    search,
    changePage,
    sort,
  }
}
