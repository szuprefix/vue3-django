import { describe, expect, it } from 'vitest'
import { resolveRelation } from '../src/core/relations.js'

function setup(parentFields = {}, childFields = {}, childOptions = {}) {
  const models = {
    'course.course': {
      config: {},
      fields: async () => parentFields,
      loadOptions: async () => ({ content_type_id: 46 }),
    },
    'exam.paper': {
      config: { verbose_name: '试卷' },
      fields: async () => childFields,
      loadOptions: async () => childOptions,
    },
  }
  return { get: (name) => models[name] }
}
describe('Relations 原版关联规则', () => {
  it('外键查询和创建默认值绑定父记录，主键 0 有效', async () => {
    const item = await resolveRelation(
      'exam.paper',
      { appModel: 'course.course', id: 0, data: {} },
      setup({}, { course: { name: 'course', model: 'course.course' } }),
    )
    expect(item.baseQueries).toEqual({ course: 0 })
    expect(item.defaults).toEqual({ course: 0 })
  })
  it('多对多为空时不会查询全部，支持旧字符串数组', async () => {
    const registry = setup({ papers: { name: 'papers', model: 'exam.paper', multiple: true } })
    const parent = { appModel: 'course.course', id: 1, data: { papers: '[]' } }
    expect((await resolveRelation('exam.paper', parent, registry)).baseQueries).toEqual({
      id__in: [0],
    })
    parent.data.papers = '[2,3]'
    expect((await resolveRelation('exam.paper', parent, registry)).baseQueries).toEqual({
      id__in: [2, 3],
    })
  })
  it('通用外键使用父模型 content_type_id', async () => {
    const registry = setup(
      {},
      { object_id: { name: 'object_id' }, content_type: { name: 'content_type' } },
      { generic_foreign_key: { ct_field: 'content_type', fk_field: 'object_id' } },
    )
    expect(
      (await resolveRelation('exam.paper', { appModel: 'course.course', id: 7 }, registry))
        .baseQueries,
    ).toEqual({ content_type: 46, object_id: 7 })
  })
  it('显式字段映射保留 falsy 值，查询约束不会作为创建字段', async () => {
    const item = await resolveRelation(
      'exam.paper:course=id&enabled=active',
      { appModel: 'course.course', id: 7, data: { active: false } },
      setup({}, { course: { name: 'course' }, enabled: { name: 'enabled' } }),
    )
    expect(item.defaults).toEqual({ course: 7, enabled: false })
    await expect(
      resolveRelation(
        'exam.paper:course=missing',
        { appModel: 'course.course', id: 7, data: {} },
        setup(),
      ),
    ).rejects.toThrow('缺少父字段')
  })
})
