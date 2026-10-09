import { safeFileName, saveBlob } from '../browser/download.js'

export function responseFileName(disposition) {
  if (!disposition) return undefined
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition)?.[1]
  if (encoded) {
    try {
      return safeFileName(decodeURIComponent(encoded.trim()))
    } catch {
      /* Fall back to filename. */
    }
  }
  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;]*))/i.exec(disposition)
  return plain ? safeFileName(plain[1] ?? plain[2]) : undefined
}

export function createDownloadService({ http, save = saveBlob, allowExternal = false } = {}) {
  if (!http) throw new Error('下载服务需要 HTTP 客户端')
  return {
    async download(endpoint, { fileName, params, signal } = {}) {
      if (
        typeof endpoint !== 'string' ||
        !endpoint ||
        /^[\s\\]/.test(endpoint) ||
        endpoint.startsWith('//')
      )
        throw new Error('下载地址无效')
      if (
        /^[a-z][a-z\d+.-]*:/i.test(endpoint) &&
        (!allowExternal || !/^https?:\/\//i.test(endpoint))
      )
        throw new Error('下载服务默认只允许相对接口地址')
      const response = await http.get(endpoint, { responseType: 'blob', params, signal })
      if (signal?.aborted) throw signal.reason ?? new DOMException('已取消', 'AbortError')
      if (response.status != null && (response.status < 200 || response.status >= 300))
        throw new Error(`下载失败（${response.status}）`)
      if (!(response.data instanceof Blob)) throw new Error('下载响应必须为 Blob')
      const disposition =
        response.headers?.get?.('content-disposition') ?? response.headers?.['content-disposition']
      const name = safeFileName(fileName ?? responseFileName(disposition) ?? 'download')
      await save(response.data, name)
      return { blob: response.data, fileName: name }
    },
  }
}
