<script setup>
import FileUpload from './FileUpload.vue'
defineProps({ modelValue: [String, Array], field: Object, service: Object, disabled: Boolean })
const emit = defineEmits(['update:modelValue', 'success', 'error', 'uploading'])
</script>
<template>
  <FileUpload
    :model-value="modelValue"
    :field="field"
    :service="service"
    :disabled="disabled"
    images
    @update:model-value="emit('update:modelValue', $event)"
    @success="emit('success', $event)"
    @error="emit('error', $event)"
    @uploading="emit('uploading', $event)"
  />
</template>
