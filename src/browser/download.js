export function safeFileName(value = 'download') {
  return (
    String(value)
      .split(/[\\/]/)
      .at(-1)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim() || 'download'
  )
}

export function saveBlob(
  blob,
  fileName = 'download',
  { document: target = globalThis.document, url = globalThis.URL } = {},
) {
  if (!target?.body || !url?.createObjectURL) throw new Error('保存文件需要浏览器环境')
  const objectUrl = url.createObjectURL(blob)
  const anchor = target.createElement('a')
  try {
    anchor.href = objectUrl
    anchor.download = safeFileName(fileName)
    anchor.hidden = true
    target.body.append(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    // Let the browser consume the object URL before releasing it.
    setTimeout(() => url.revokeObjectURL(objectUrl), 0)
  }
}
