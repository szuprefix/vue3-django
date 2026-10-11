import { expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import config from '../examples/dashboard/views/exam/paper/config.js'
import { Paper } from '../examples/dashboard/utils/paper.js'
import ContentEditor from '../examples/dashboard/views/exam/paper/components/ContentEditor.vue'
import AutoComplete from '../src/components/model/widgets/AutoComplete.vue'
import { DjangoKey } from '../src/composables/context.js'

const source = '测试试卷\n一.单选题\n1.选择正确答案\n A.甲 B.乙 C.丙 D.丁\n答案:A'

it('试卷配置可加载，原格式解析、校验与编辑提交保持一致', async () => {
  expect(config.form.items.find((field) => field.name === 'content').widget).toBe(ContentEditor)
  const paper = Paper.split(source)
  expect(paper.questionCount).toBe(1)
  expect(paper.groups[0].questions[0].answer).toEqual(['A'])
  let errors
  Paper.validateRule({}, { source: source.replace('答案:A', '') }, (result) => {
    errors = result
  })
  expect(errors[0].message).toBe('缺答案1题')
  const wrapper = mount(ContentEditor, { props: { modelValue: { source: '', data: {} } } })
  await wrapper.find('textarea').setValue(source)
  const content = wrapper.emitted('update:modelValue')[0][0]
  expect(content.source).toBe(source)
  expect(content.data).toEqual(paper)
  await flushPromises()
  wrapper.unmount()
})

it('标签补全读取原统计接口并支持统计数组和自由输入', async () => {
  const field = config.form.items.find((field) => field.name === 'tags')
  const calls = []
  const wrapper = mount(AutoComplete, {
    props: { field, modelValue: '' },
    global: {
      provide: {
        [DjangoKey]: {
          registry: {
            http: {
              get: async (url) => {
                calls.push(url)
                return {
                  data: {
                    tags: [
                      ['数学', 4],
                      ['英语', 2],
                    ],
                  },
                }
              },
            },
          },
        },
      },
    },
  })
  const component = wrapper.findComponent({ name: 'ElAutocomplete' })
  let suggestions
  await component.props('fetchSuggestions')('数', (result) => {
    suggestions = result
  })
  expect(calls).toEqual(['/exam/paper/stat/?measures=tags'])
  expect(suggestions).toEqual([{ value: '数学' }])
  component.vm.$emit('update:modelValue', '新标签')
  expect(wrapper.emitted('update:modelValue')[0]).toEqual(['新标签'])
  await flushPromises()
  wrapper.unmount()
})

it('预览答案开关不会改变标准答案，题目点击定位到源文本', async () => {
  const wrapper = mount(ContentEditor, { props: { modelValue: { source, data: {} } } })
  await flushPromises()
  expect(wrapper.find('input[type=radio][value=A]').element.checked).toBe(true)
  await wrapper.find('input[type=checkbox]').setValue(false)
  await flushPromises()
  expect(wrapper.find('input[type=radio][value=A]').element.checked).toBe(false)
  await wrapper.find('.paper-question').trigger('click')
  const input = wrapper.find('textarea').element
  expect(input.selectionStart).toBe(source.indexOf('选择正确答案'))
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  await wrapper.find('input[type=checkbox]').setValue(true)
  await flushPromises()
  expect(wrapper.find('input[type=radio][value=A]').element.checked).toBe(true)
  wrapper.unmount()
})

it('内容提交转换标记且保留完整媒体URL', async () => {
  const wrapper = mount(ContentEditor, { props: { modelValue: { source: '', data: {} } } })
  await wrapper
    .find('textarea')
    .setValue(
      source.replace('选择正确答案', '[划:选择]正确答案 [音:https://cdn.example.test/a.mp3]'),
    )
  const data = wrapper.emitted('update:modelValue')[0][0].data
  expect(data.groups[0].questions[0].title).toContain('<u>选择</u>')
  expect(data.groups[0].questions[0].title).toContain('src="https://cdn.example.test/a.mp3"')
  await flushPromises()
  wrapper.unmount()
})
