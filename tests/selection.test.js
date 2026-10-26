import { describe, expect, it, vi } from 'vitest'
import { resolveSelection } from '../src/core/selection.js'

describe('模型表格选择范围', () => {
  function setup() {
    return {
      config: { idField: 'pk' },
      query: vi.fn(async ({ page }) => ({
        count: 3,
        results: page === 1 ? [{ pk: 1 }, { pk: 2 }] : [{ pk: 3 }],
      })),
    }
  }
  it('选中仅使用勾选记录，不发送请求', async () => {
    const model = setup()
    expect(await resolveSelection({ model, selection: [{ pk: 2 }] })).toEqual([{ pk: 2 }])
    expect(model.query).not.toHaveBeenCalled()
  })
  it.each(['all', 'exclude'])('%s 跨页读取并保持搜索和固定条件', async (scope) => {
    const model = setup()
    const rows = await resolveSelection({
      model,
      scope,
      selection: [{ pk: '2' }],
      queries: { search: '张', active: false },
      pageSize: 2,
    })
    expect(rows).toEqual(
      scope === 'all' ? [{ pk: 1 }, { pk: 2 }, { pk: 3 }] : [{ pk: 1 }, { pk: 3 }],
    )
    expect(model.query).toHaveBeenCalledTimes(2)
    expect(model.query).toHaveBeenLastCalledWith({
      search: '张',
      active: false,
      page: 2,
      page_size: 2,
    })
  })
  it('分页不完整时报错，避免提交部分关联', async () => {
    const model = setup()
    model.query.mockResolvedValue({ count: 3, results: [] })
    await expect(
      resolveSelection({ model, scope: 'all', selection: [], queries: {} }),
    ).rejects.toThrow()
  })
})
