import { expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import JsonInput from '../src/components/form/widgets/JsonInput.vue'
import JsonEditor from '../src/components/form/widgets/JsonEditor.vue'
import Field from '../src/components/form/Field.vue'
import Schema from 'async-validator'
import { defaultRules } from '../src/components/form/Form.js'

const editors = vi.hoisted(() => [])

vi.mock('codemirror', () => ({
  default: {
    Pos: (line, ch) => ({ line, ch }),
    fromTextArea: () => {
      let value = '',
        change
      const editor = {
        getValue: () => value,
        setValue: (text) => {
          value = text
          change?.()
        },
        on: (_, fn) => {
          change = fn
        },
        toTextArea: vi.fn(),
      }
      editors.push(editor)
      return editor
    },
  },
}))
vi.mock('codemirror/mode/javascript/javascript.js', () => ({}))
vi.mock('codemirror/addon/lint/lint.js', () => ({}))

it('editor validates edits, synchronizes external values and cleans up', async () => {
  const wrapper = mount(JsonEditor, { props: { modelValue: {} } })
  const editor = editors.at(-1)
  editor.setValue('{')
  await wrapper.vm.$nextTick()
  expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  editor.setValue('[0, false]')
  expect(wrapper.emitted('update:modelValue')[0]).toEqual([[0, false]])
  await wrapper.setProps({ modelValue: { external: true } })
  expect(JSON.parse(wrapper.vm.getValue())).toEqual({ external: true })
  expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  wrapper.unmount()
  expect(editor.toTextArea).toHaveBeenCalledOnce()
})

it.each(['JsonInput', JsonEditor])(
  'required JSON accepts objects, arrays and primitives',
  async (widget) => {
    const schema = new Schema({ settings: defaultRules({ widget, required: true }) })
    for (const settings of [{}, [], false, 0]) await schema.validate({ settings })
    await expect(schema.validate({ settings: undefined })).rejects.toBeTruthy()
  },
)

it('JSON input parses values and preserves the model on invalid input', async () => {
  const wrapper = mount(JsonInput, { props: { modelValue: { a: 1 } } })
  const input = wrapper.findComponent({ name: 'ElInput' })
  input.vm.$emit('change', '[false, 0, null]')
  expect(wrapper.emitted('update:modelValue')[0]).toEqual([[false, 0, null]])
  input.vm.$emit('change', '{')
  await wrapper.vm.$nextTick()
  expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  await wrapper.setProps({ modelValue: false })
  expect(input.props('modelValue')).toBe('false')
  wrapper.unmount()
})

it.each(['JsonInput', 'json-input', 'JsonEditor', 'json_editor'])(
  'resolves %s in form fields',
  (widget) => {
    const wrapper = mount(Field, { props: { field: { name: 'settings', widget }, modelValue: {} } })
    expect(
      wrapper
        .findComponent(widget.toLowerCase().includes('input') ? JsonInput : JsonEditor)
        .exists(),
    ).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  },
)
