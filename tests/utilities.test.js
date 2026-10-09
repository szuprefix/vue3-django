import { expect, it, vi } from 'vitest'
import { createStorage } from '../src/core/storage.js'
import { createDownloadService, responseFileName } from '../src/core/download.js'
import { saveBlob } from '../src/browser/download.js'
import { mapConcurrent } from '../src/utils/async-queue.js'
import { arrayEquals, arrayDelta } from '../src/utils/array.js'

it('缓存保留 falsy，按用户隔离，过期和损坏安全回退', () => {
  localStorage.clear()
  let time = 0
  const error = vi.fn()
  const a = createStorage({ storage: localStorage, userId: 1, now: () => time, onError: error })
  const b = createStorage({ storage: localStorage, userId: 2 })
  for (const value of [0, false, '', null]) {
    a.set('value', value)
    expect(a.get('value', 'fallback')).toBe(value)
  }
  b.set('value', 8)
  a.set('ttl', 'expires', { ttl: 10 })
  time = 10
  expect(a.get('ttl', 'gone')).toBe('gone')
  const key = localStorage.key(0)
  localStorage.setItem(key, '{broken')
  expect(a.get('value', 'fallback')).toBe('fallback')
  expect(error).toHaveBeenCalled()
  localStorage.setItem('unrelated', 'keep')
  a.clear()
  expect(b.get('value')).toBe(8)
  expect(localStorage.getItem('unrelated')).toBe('keep')
  localStorage.clear()
})

it('存储限额错误不清理其他数据，服务可在非浏览器环境注入', () => {
  const clear = vi.fn()
  const onError = vi.fn()
  const storage = {
    setItem: () => {
      throw new Error('quota')
    },
    clear,
  }
  expect(createStorage({ storage, onError }).set('x', 1)).toBe(false)
  expect(clear).not.toHaveBeenCalled()
  expect(onError).toHaveBeenCalled()
})

it('队列限制并发，保持结果顺序，支持同步结果和错误收集', async () => {
  let active = 0
  let peak = 0
  const result = await mapConcurrent([1, 2, 3, 4], 2, async (value) => {
    peak = Math.max(peak, ++active)
    await Promise.resolve()
    active--
    return value * 2
  })
  expect(peak).toBe(2)
  expect(result).toEqual([2, 4, 6, 8])
  expect(await mapConcurrent([], 2, vi.fn())).toEqual([])
  await expect(mapConcurrent([1], 0, vi.fn())).rejects.toThrow('正整数')
  const handler = vi.fn(() => {
    throw new Error('failure')
  })
  await expect(mapConcurrent([1, 2, 3], 1, handler)).rejects.toThrow('failure')
  expect(handler).toHaveBeenCalledTimes(1)
  const settled = await mapConcurrent(
    [1, 2],
    1,
    (value) => {
      if (value === 2) throw new Error('bad')
      return value
    },
    { settled: true },
  )
  expect(settled.map((item) => item.status)).toEqual(['fulfilled', 'rejected'])
})

it('队列可取消且不启动后续任务', async () => {
  const controller = new AbortController()
  let finish
  const handler = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const work = mapConcurrent([1, 2], 1, handler, { signal: controller.signal })
  controller.abort()
  await expect(work).rejects.toMatchObject({ name: 'AbortError' })
  finish(1)
  await Promise.resolve()
  expect(handler).toHaveBeenCalledTimes(1)
})

it('下载沿用注入客户端，解析安全文件名，错误响应不保存', async () => {
  const blob = new Blob(['csv'])
  const get = vi
    .fn()
    .mockResolvedValue({
      status: 200,
      data: blob,
      headers: { 'content-disposition': "attachment; filename*=UTF-8''%E6%8A%A5%E8%A1%A8.csv" },
    })
  const save = vi.fn()
  const service = createDownloadService({ http: { get }, save })
  await service.download('report/export/', { params: { active: true } })
  expect(save).toHaveBeenCalledWith(blob, '报表.csv')
  expect(get.mock.calls[0][1].responseType).toBe('blob')
  expect(responseFileName('attachment; filename="../evil.csv"')).toBe('evil.csv')
  await expect(service.download('https://other.test/')).rejects.toThrow('相对')
  get.mockResolvedValueOnce({ status: 400, data: blob })
  await expect(service.download('report/export/')).rejects.toThrow('400')
  expect(save).toHaveBeenCalledTimes(1)
})

it('浏览器保存释放 URL 并移除临时元素', () => {
  vi.useFakeTimers()
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const url = { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() }
  saveBlob(new Blob(['file']), 'test.txt', { document, url })
  expect(click).toHaveBeenCalledTimes(1)
  expect(document.querySelector('a[download="test.txt"]')).toBeNull()
  vi.runAllTimers()
  expect(url.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  click.mockRestore()
  vi.useRealTimers()
})

it('数组工具不修改原型和输入', () => {
  const previous = [1, 2]
  expect(arrayEquals([1, [2]], [1, [2]])).toBe(true)
  expect(arrayEquals([1], [2])).toBe(false)
  expect(arrayDelta(previous, [2, 3, 3])).toEqual({ added: [3], removed: [1] })
  expect(previous).toEqual([1, 2])
  expect(Object.hasOwn(Array.prototype, 'equals')).toBe(false)
})
