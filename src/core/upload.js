// Object-storage requests deliberately bypass the application's authenticated HTTP client.
export function storageUpload({ file, plan, signal, onProgress }) {
  return new Promise((resolve, reject) => {
    const target = new URL(plan.url, location.origin)
    if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password)
      return reject(new Error('上传地址无效'))
    if (location.protocol === 'https:' && target.protocol !== 'https:')
      return reject(new Error('HTTPS 页面不能使用 HTTP 上传地址'))
    if (!['PUT', 'POST'].includes(plan.method)) return reject(new Error('仅支持 PUT/POST 上传'))
    const xhr = new XMLHttpRequest()
    const abort = () => xhr.abort()
    const finish = (error) => {
      signal?.removeEventListener('abort', abort)
      if (error) reject(error)
      else resolve()
    }
    if (signal?.aborted) return reject(new DOMException('已取消上传', 'AbortError'))
    xhr.open(plan.method, target.href)
    xhr.withCredentials = false
    xhr.timeout = plan.timeout ?? 120000
    for (const [key, value] of Object.entries(plan.headers ?? {})) {
      if (/^(authorization|cookie|x-csrftoken)$/i.test(key))
        return reject(new Error('直传不能携带应用认证请求头'))
      if (plan.method === 'POST' && key.toLowerCase() === 'content-type')
        return reject(new Error('表单上传的 Content-Type 必须由浏览器生成'))
      xhr.setRequestHeader(key, value)
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () =>
      finish(
        xhr.status >= 200 && xhr.status < 300
          ? undefined
          : new Error(`对象上传失败（${xhr.status}）`),
      )
    xhr.onerror = () => finish(new Error('对象上传网络错误，请检查存储 CORS 配置'))
    xhr.ontimeout = () => finish(new Error('对象上传超时'))
    xhr.onabort = () => finish(new DOMException('已取消上传', 'AbortError'))
    signal?.addEventListener('abort', abort, { once: true })
    let body = file
    if (plan.method === 'POST') {
      body = new FormData()
      for (const [key, value] of Object.entries(plan.fields ?? {})) body.append(key, value)
      body.append(plan.fileField ?? 'file', file)
    }
    xhr.send(body)
  })
}

export function createUploadService({
  http,
  initUrl = 'media/upload/init/',
  completeUrl = 'media/upload/complete/',
  transport = storageUpload,
}) {
  if (!http) throw new Error('上传服务需要业务 HTTP 客户端')
  return {
    async upload(file, { purpose, context = {}, signal, onProgress } = {}) {
      const { data: plan } = await http.post(
        initUrl,
        {
          name: file.name,
          size: file.size,
          contentType: file.type,
          purpose,
          context,
        },
        { signal },
      )
      if (!plan?.uploadId || !plan.url) throw new Error('上传初始化响应缺少 uploadId/url')
      await transport({
        file,
        plan: { ...plan, method: String(plan.method ?? 'PUT').toUpperCase() },
        signal,
        onProgress: (percent) => onProgress?.(Math.min(95, percent)),
      })
      if (signal?.aborted) throw new DOMException('已取消上传', 'AbortError')
      const { data: result } = await http.post(completeUrl, { uploadId: plan.uploadId }, { signal })
      if (!result?.url || typeof result.url !== 'string')
        throw new Error('上传确认响应缺少稳定 url')
      onProgress?.(100)
      return result
    },
  }
}
