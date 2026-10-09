// Browser storage is accessed only when an operation is called, never on import.
export function createStorage({
  storage,
  namespace = 'vue3-django',
  tenantId = null,
  userId = null,
  now = Date.now,
  onError = () => {},
} = {}) {
  const prefix = `${JSON.stringify([namespace, tenantId, userId])}:`
  const backend = () => storage ?? globalThis.localStorage
  const report = (error, operation, key) => onError(error, { operation, key })
  return {
    get(key, fallback = null) {
      try {
        const raw = backend().getItem(prefix + key)
        if (raw == null) return fallback
        const entry = JSON.parse(raw)
        if (entry?.version !== 1 || !Object.hasOwn(entry, 'value')) throw new Error('缓存格式无效')
        if (entry.expiresAt != null && entry.expiresAt <= now()) {
          backend().removeItem(prefix + key)
          return fallback
        }
        return entry.value
      } catch (error) {
        report(error, 'get', key)
        return fallback
      }
    },
    set(key, value, { ttl } = {}) {
      try {
        if (value === undefined) throw new TypeError('缓存值不能为 undefined')
        if (ttl != null && (!Number.isFinite(ttl) || ttl < 0))
          throw new TypeError('ttl 必须为非负毫秒数')
        const serialized = JSON.stringify({
          version: 1,
          value,
          expiresAt: ttl == null ? null : now() + ttl,
        })
        if (!Object.hasOwn(JSON.parse(serialized), 'value'))
          throw new TypeError('缓存值必须可 JSON 序列化')
        backend().setItem(prefix + key, serialized)
        return true
      } catch (error) {
        report(error, 'set', key)
        return false
      }
    },
    remove(key) {
      try {
        backend().removeItem(prefix + key)
        return true
      } catch (error) {
        report(error, 'remove', key)
        return false
      }
    },
    clear() {
      try {
        const target = backend()
        const keys = Array.from({ length: target.length }, (_, index) => target.key(index))
        for (const key of keys) if (key?.startsWith(prefix)) target.removeItem(key)
        return true
      } catch (error) {
        report(error, 'clear')
        return false
      }
    },
  }
}
