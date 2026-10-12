<script setup>
import { ref, watch } from 'vue'
import { ElInput } from 'element-plus'
const props = defineProps({
  modelValue: null,
  field: { type: Object, default: () => ({}) },
  defaultValue: null,
})
const emit = defineEmits(['update:modelValue', 'change', 'error'])
const text = ref('')
const error = ref('')
watch(
  () => props.modelValue,
  (value) => {
    text.value = JSON.stringify(value === undefined ? props.defaultValue : value, null, 4) ?? ''
    error.value = ''
  },
  { immediate: true, deep: true },
)
function commit(value) {
  try {
    const parsed = JSON.parse(value)
    error.value = ''
    emit('update:modelValue', parsed)
    emit('change', parsed)
  } catch (cause) {
    error.value = cause.message
    emit('error', cause)
  }
}
defineExpose({ getValue: () => text.value })
</script>
<template>
  <div class="json-input">
    <ElInput
      v-model="text"
      type="textarea"
      :autosize="field.autosize ?? { minRows: 4, maxRows: 10 }"
      :placeholder="field.placeholder"
      :aria-label="field.label || field.name || 'JSON'"
      :aria-invalid="Boolean(error)"
      @change="commit"
    />
    <div
      v-if="error"
      role="alert"
      class="json-input-error"
    >
      {{ error }}
    </div>
  </div>
</template>
<style scoped>
.json-input {
  width: 100%;
}
.json-input-error {
  color: var(--el-color-danger, #f56c6c);
  font-size: 12px;
}
</style>
