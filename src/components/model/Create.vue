<script setup>
import ModelForm from './Form.vue'

defineProps({
  appModel: { type: String, required: true },
  defaults: Object,
})
const emit = defineEmits(['done', 'error'])
</script>

<template>
  <ModelForm
    :app-model="appModel"
    :defaults="defaults"
    @form-posted="emit('done', $event)"
    @error="emit('error', $event)"
  />
</template>
