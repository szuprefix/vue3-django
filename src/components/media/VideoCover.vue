<script setup>
import { computed } from 'vue'
import { ElImage } from 'element-plus'
import { fieldValue, safeUrl } from '../../core/table.js'

const props = defineProps({
  value: [String, Object],
  modelValue: [String, Object],
  field: { type: Object, default: () => ({}) },
  src: String,
  width: [String, Number],
  height: [String, Number],
  fit: [String, Boolean],
  lazy: Boolean,
  preview: { type: Boolean, default: true },
})
const emit = defineEmits(['load', 'error'])
const url = computed(() => {
  const value = props.modelValue !== undefined ? props.modelValue : props.value
  const source =
    props.src ??
    (value && typeof value === 'object'
      ? fieldValue(value, props.field.name ?? 'cover_url')
      : value)
  return safeUrl(source)
})
function dimension(value, fallback) {
  return value == null ? fallback : typeof value === 'number' ? `${value}px` : value
}
const style = computed(() => ({
  width: dimension(props.width ?? props.field.width, '120px'),
  height: dimension(props.height ?? props.field.height, '80px'),
  maxWidth: '100%',
}))
const fit = computed(() => {
  const value = props.fit ?? props.field.fit
  return ['fill', 'contain', 'cover', 'none', 'scale-down'].includes(value) ? value : 'contain'
})
</script>

<template>
  <ElImage
    v-if="url"
    :src="url"
    :style="style"
    :fit="fit"
    :lazy="lazy || field.lazy"
    :alt="field.label || '视频封面'"
    :preview-src-list="preview && field.preview !== false ? [url] : []"
    preview-teleported
    @load="emit('load', $event)"
    @error="emit('error', $event)"
  >
    <template #placeholder><span class="vd-cover-placeholder">加载中…</span></template>
    <template #error><span class="vd-cover-placeholder">封面加载失败</span></template>
  </ElImage>
  <span
    v-else
    class="vd-cover-placeholder"
  >
    暂无封面
  </span>
</template>

<style scoped>
.vd-cover-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  color: #909399;
  font-size: 12px;
}
</style>
