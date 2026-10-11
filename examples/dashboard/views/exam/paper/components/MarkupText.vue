<script setup>
import { computed } from 'vue'
import DOMPurify from 'dompurify'
import { text2tag, text2img, text2audio, text2table } from '../../../../utils/markup_text.js'
const props = defineProps({
  text: [String, Number],
  imageBase: { type: String, default: '' },
  audioBase: { type: String, default: '' },
})
const html = computed(() => {
  let text = String(props.text ?? '')
  for (const [name, tag] of [
    ['划', 'u'],
    ['上', 'sup'],
    ['下', 'sub'],
  ])
    text = text2tag(text, name, tag)
  // Absolute media URLs can be inserted directly by the upload service.
  text = text
    .replace(/\[图:(https?:\/\/[^\]]+)\]/g, '<img src="$1">')
    .replace(/\[音:(https?:\/\/[^\]]+)\]/g, '<audio controls src="$1"></audio>')
  return DOMPurify.sanitize(
    text2table(text2audio(text2img(text, props.imageBase), props.audioBase)),
  )
})
</script>
<template>
  <span
    class="markup-text"
    v-html="html"
  />
</template>
<style scoped>
.markup-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.markup-text :deep(u) {
  color: var(--el-color-primary);
}
.markup-text :deep(img) {
  max-width: 100%;
  vertical-align: middle;
}
.markup-text :deep(audio) {
  display: block;
  max-width: 100%;
}
.markup-text :deep(table) {
  border-collapse: collapse;
}
.markup-text :deep(td) {
  border: 1px solid #aaa;
  padding: 4px 8px;
}
</style>
