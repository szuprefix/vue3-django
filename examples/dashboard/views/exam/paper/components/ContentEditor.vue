<script setup>
import { computed, nextTick, ref } from 'vue'
import { ElButton, ElButtonGroup, ElInput, ElAlert, ElDialog } from 'element-plus'
import { Paper } from '../../../../utils/paper.js'
import PaperView from './Paper.vue'
import Transformer from './Transformer.vue'
import FileUpload from '../../../../../../src/components/media/FileUpload.vue'

const props = defineProps({ modelValue: Object, field: Object, context: Object })
const emit = defineEmits(['update:modelValue', 'uploading', 'error'])
const mode = ref('both'),
  transformer = ref(false),
  audio = ref(false),
  input = ref(),
  error = ref('')
const selection = ref({ start: 0, end: 0 })
const editable = computed(() => props.context?.is_editable !== false)
const source = computed(() => props.modelValue?.source ?? '')
const generated = computed(() => {
  try {
    return {
      paper: source.value ? Paper.split(source.value) : (props.modelValue?.data ?? Paper.split('')),
    }
  } catch (error) {
    return { error: error.message }
  }
})
const paper = computed(() => generated.value.paper ?? props.modelValue?.data ?? {})
const media = computed(() => ({
  imageBase: props.field?.imageBase ?? props.context?.imageBase ?? '',
  audioBase: props.field?.audioBase ?? props.context?.audioBase ?? '',
}))
const audioField = computed(() => ({
  accept: 'audio/*',
  ...props.field?.audioUpload,
  purpose: 'audio',
  uploadContext: {
    owner_type: 'exam.paper',
    owner_id: props.context?.id,
    ...props.field?.audioUpload?.uploadContext,
  },
  limit: 1,
}))
function change(source) {
  let data
  try {
    data = Paper.parse(source, media.value.imageBase, media.value.audioBase)
  } catch {
    data = {}
  }
  emit('update:modelValue', { ...props.modelValue, source, data })
}
function rememberSelection() {
  const element = input.value?.textarea
  if (element) selection.value = { start: element.selectionStart, end: element.selectionEnd }
}
async function insertAudio({ url }) {
  const { start, end } = selection.value
  const token = `[音:${url}]`
  change(source.value.slice(0, start) + token + source.value.slice(end))
  audio.value = false
  await nextTick()
  input.value?.textarea?.focus()
  input.value?.textarea?.setSelectionRange(start + token.length, start + token.length)
}
async function focus(question) {
  if (!editable.value) return
  if (mode.value === 'preview') mode.value = 'both'
  await nextTick()
  const element = input.value?.textarea
  const position = source.value.indexOf(question.title)
  if (!element || position < 0) return
  element.focus()
  element.setSelectionRange(position, position + question.title.length)
  const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 24
  element.scrollTop = Math.max(
    0,
    source.value.slice(0, position).split('\n').length * lineHeight - element.clientHeight / 3,
  )
}
function openAudio() {
  rememberSelection()
  audio.value = true
}
function uploadError(value) {
  error.value = value.message
  emit('error', value)
}
</script>
<template>
  <div class="paper-editor">
    <div
      v-if="editable"
      class="paper-toolbar"
    >
      <ElButtonGroup>
        <ElButton @click="mode = mode === 'edit' ? 'both' : 'edit'">✎ 编辑</ElButton>
        <ElButton @click="mode = mode === 'preview' ? 'both' : 'preview'">◎ 预览</ElButton>
      </ElButtonGroup>
      <ElButton @click="transformer = true">转换器</ElButton>
      <ElButton @click="openAudio">♪ 加音频</ElButton>
    </div>
    <ElAlert
      v-if="generated.error || error"
      :title="generated.error || error"
      type="error"
      closable
      @close="error = ''"
    />
    <div
      class="paper-columns"
      :class="{ 'paper-columns-both': editable && mode === 'both' }"
    >
      <ElInput
        v-if="editable && mode !== 'preview'"
        ref="input"
        class="paper-source"
        :model-value="source"
        type="textarea"
        :rows="24"
        placeholder="请输入试卷内容"
        @update:model-value="change"
        @click="rememberSelection"
        @keyup="rememberSelection"
      />
      <PaperView
        v-if="!editable || mode !== 'edit'"
        :paper="paper"
        :image-base="media.imageBase"
        :audio-base="media.audioBase"
        @focus="focus"
      />
    </div>
    <Transformer
      v-model="transformer"
      @done="change"
    />
    <ElDialog
      v-model="audio"
      title="添加音频"
      width="480px"
      append-to-body
      destroy-on-close
    >
      <FileUpload
        :field="audioField"
        @success="insertAudio"
        @uploading="emit('uploading', $event)"
        @error="uploadError"
      />
    </ElDialog>
  </div>
</template>
<style scoped>
.paper-editor {
  width: 100%;
}
.paper-toolbar {
  display: flex;
  gap: 24px;
  margin-bottom: 2px;
  flex-wrap: wrap;
}
.paper-toolbar :deep(.el-button + .el-button) {
  margin-left: 0;
}
.paper-columns {
  display: grid;
  gap: 32px;
  align-items: start;
}
.paper-columns-both {
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
}
.paper-source :deep(textarea) {
  height: 78vh;
  resize: vertical;
  line-height: 1.6;
  font-size: 14px;
}
@media (max-width: 900px) {
  .paper-columns-both {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
