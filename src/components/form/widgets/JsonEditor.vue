<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/ambiance.css'
import 'codemirror/addon/lint/lint.css'
import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/addon/lint/lint.js'
const props = defineProps({
  modelValue: null,
  field: { type: Object, default: () => ({}) },
  defaultValue: null,
})
const emit = defineEmits(['update:modelValue', 'change', 'error'])
const textarea = ref()
const error = ref('')
let editor
let syncing = false
function serialize() {
  return (
    JSON.stringify(
      props.modelValue === undefined ? props.defaultValue : props.modelValue,
      null,
      4,
    ) ?? ''
  )
}
function lint(text) {
  try {
    JSON.parse(text)
    return []
  } catch (cause) {
    const position = /position (\d+)/.exec(cause.message)
    const lines = text.slice(0, position ? Number(position[1]) : 0).split('\n')
    const from = CodeMirror.Pos(lines.length - 1, lines.at(-1).length)
    return [
      {
        from,
        to: CodeMirror.Pos(from.line, from.ch + 1),
        message: cause.message,
        severity: 'error',
      },
    ]
  }
}
watch(
  () => props.modelValue,
  () => {
    if (!editor) return
    const text = serialize()
    if (text === editor.getValue()) return
    syncing = true
    editor.setValue(text)
    syncing = false
    error.value = ''
  },
  { deep: true },
)
onMounted(() => {
  editor = CodeMirror.fromTextArea(textarea.value, {
    lineNumbers: true,
    mode: 'application/json',
    theme: props.field.theme ?? 'ambiance',
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-lint-markers'],
    lint: { getAnnotations: lint },
    tabSize: 4,
    indentUnit: 4,
    lineWrapping: true,
  })
  editor.setValue(serialize())
  editor.on('change', () => {
    if (syncing) return
    try {
      const parsed = JSON.parse(editor.getValue())
      error.value = ''
      emit('update:modelValue', parsed)
      emit('change', parsed)
    } catch (cause) {
      error.value = cause.message
      emit('error', cause)
    }
  })
})
onBeforeUnmount(() => {
  editor?.toTextArea()
  editor = undefined
})
defineExpose({ getValue: () => editor?.getValue() ?? serialize() })
</script>
<template>
  <div class="json-editor">
    <textarea
      ref="textarea"
      :aria-label="field.label || field.name || 'JSON'"
    />
    <div
      v-if="error"
      role="alert"
      class="json-editor-error"
    >
      {{ error }}
    </div>
  </div>
</template>
<style scoped>
.json-editor {
  width: 100%;
  position: relative;
}
.json-editor :deep(.CodeMirror) {
  height: auto;
  min-height: 300px;
}
.json-editor :deep(.CodeMirror-scroll) {
  min-height: 300px;
}
.json-editor-error {
  color: var(--el-color-danger, #f56c6c);
  font-size: 12px;
}
</style>
