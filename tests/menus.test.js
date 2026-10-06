import { it, expect } from 'vitest'
import { genMenusFromApps } from '../src/core/menus.js'
it('兼容菜单选择、权限键、隐藏字符串及跨应用分组', () => {
  const apps = { course: { verbose_name: '课程', models: { category: { verbose_name: '类别' }, lesson: { verbose_name: '课时', menu: '教学' }, hidden: { hidden: 'true' } } }, private: { hidden: 'true', models: { secret: {} } } }
  expect(genMenusFromApps(apps, ['course']).课程.items[0].url).toBe('/course/category/')
  expect(genMenusFromApps(apps, { course: 'lesson' }).教学.items[0].name).toBe('课时')
  expect(Object.keys(genMenusFromApps(apps, undefined, { 'course.category': [] }))).toEqual(['课程'])
  expect(genMenusFromApps(apps, undefined, {})).toEqual({})
})
