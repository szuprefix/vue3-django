<script setup>
import ModelForm from './Form.vue'

defineProps({
  appModel: { type: String, required: true },
  defaults: Object,
  mobile: Boolean,
})
const emit = defineEmits(['done', 'error'])
</script>

<template>
  <ModelForm
    :app-model="appModel"
    :defaults="defaults"
    :mobile="mobile"
    @form-posted="emit('done', $event)"
    @error="emit('error', $event)"
  />
</template>
