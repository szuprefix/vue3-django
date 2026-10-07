import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VideoCover from '../src/components/media/VideoCover.vue'
import Widget from '../src/components/table/Widget.vue'
import Field from '../src/components/form/Field.vue'
import { duration, nFormatter } from '../src/utils/filters.js'

it('封面控件兼容整行数据、标量值和旧版尺寸/fit/lazy', async () => {
  const wrapper = mount(VideoCover, {
    props: {
      value: { cover_url: '/media/a.jpg' },
      field: { name: 'cover_url', width: '200px', height: 150, fit: true, lazy: true },
    },
  })
  const image = wrapper.findComponent({ name: 'ElImage' })
  expect(image.props('src')).toBe('/media/a.jpg')
  expect(image.props('fit')).toBe('contain')
  expect(image.props('lazy')).toBe(true)
  expect(image.attributes('style')).toContain('height: 150px')
  expect(image.props('previewSrcList')).toEqual(['/media/a.jpg'])
  await wrapper.setProps({ modelValue: '/media/b.jpg', preview: false })
  expect(image.props('src')).toBe('/media/b.jpg')
  expect(image.props('previewSrcList')).toEqual([])
  await wrapper.setProps({ modelValue: null })
  expect(wrapper.text()).toBe('暂无封面')
  wrapper.unmount()
})

it('表格和只读表单支持 VideoCover 字符串 widget，危险 URL 不加载', () => {
  const table = mount(Widget, {
    props: { value: { cover: '/media/a.jpg' }, field: { name: 'cover', widget: 'VideoCover' } },
  })
  expect(table.findComponent(VideoCover).exists()).toBe(true)
  const form = mount(Field, {
    props: {
      modelValue: '/media/a.jpg',
      field: { name: 'cover', widget: 'VideoCover', read_only: true },
    },
  })
  expect(form.findComponent(VideoCover).exists()).toBe(true)
  const invalid = mount(VideoCover, { props: { value: 'javascript:alert(1)' } })
  expect(invalid.findComponent({ name: 'ElImage' }).exists()).toBe(false)
  table.unmount()
  form.unmount()
  invalid.unmount()
})

it('迁移视频配置中的时长和数量格式化保留零及空值', () => {
  expect(duration(65)).toBe("1'5''")
  expect(duration(0)).toBe("0'0''")
  expect(duration(null)).toBe('—')
  expect(nFormatter(1500)).toBe('1.5k')
  expect(nFormatter(0)).toBe('0')
})
