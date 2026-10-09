export async function mapConcurrent(
  items,
  concurrency,
  handler,
  { signal, settled = false, onProgress } = {},
) {
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new RangeError('concurrency 必须为正整数')
  if (typeof handler !== 'function') throw new TypeError('handler 必须为函数')
  const input = Array.from(items)
  const results = new Array(input.length)
  let next = 0
  let completed = 0
  let failed = false
  let failure
  const abortError = () => signal?.reason ?? new DOMException('已取消', 'AbortError')
  if (signal?.aborted) throw abortError()
  async function worker() {
    while (next < input.length && !failed && !signal?.aborted) {
      const index = next++
      try {
        const value = await handler(input[index], index, signal)
        results[index] = settled ? { status: 'fulfilled', value } : value
      } catch (error) {
        if (settled) results[index] = { status: 'rejected', reason: error }
        else if (!failed) {
          failed = true
          failure = error
        }
      }
      completed++
      onProgress?.({ completed, total: input.length, index })
    }
  }
  let abort
  const aborted =
    signal &&
    new Promise((_, reject) => {
      abort = () => reject(abortError())
      signal.addEventListener('abort', abort, { once: true })
    })
  try {
    const work = Promise.all(Array.from({ length: Math.min(concurrency, input.length) }, worker))
    await (aborted ? Promise.race([work, aborted]) : work)
    if (signal?.aborted) throw abortError()
    if (failed) throw failure
    return results
  } finally {
    if (abort) signal.removeEventListener('abort', abort)
  }
}
