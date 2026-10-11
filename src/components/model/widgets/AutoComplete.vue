<script setup>
import { computed, ref, watch } from 'vue'
import { ElAutocomplete } from 'element-plus'
import { useDjango } from '../../../composables/context.js'

const props = defineProps({ modelValue: String, field: { type: Object, required: true } })
const emit = defineEmits(['update:modelValue', 'error'])
const { registry } = useDjango()
const suggestions = ref()
let pending
watch(
  () => props.field,
  () => {
    suggestions.value = undefined
    pending = undefined
  },
)
const value = computed({
  get: () => props.modelValue ?? '',
  set: (value) => emit('update:modelValue', value),
})
async function search(query, callback) {
  try {
    if (!suggestions.value) {
      pending ??= registry.http.get(props.field.url).then(({ data }) => {
        const items = props.field.prepare ? props.field.prepare(data) : data
        return (items ?? []).map((item) => ({
          value: String(
            typeof item === 'string' ? item : (item[props.field.valueKey ?? 0] ?? item.value ?? ''),
          ),
        }))
      })
      suggestions.value = await pending
    }
    callback(
      suggestions.value.filter((item) => item.value.toLowerCase().startsWith(query.toLowerCase())),
    )
  } catch (error) {
    pending = undefined
    callback([])
    emit('error', error)
  }
}
</script>

<template>
  <ElAutocomplete
    v-model="value"
    :fetch-suggestions="search"
    :placeholder="field.placeholder ?? field.placeHolder ?? field.label"
    clearable
    style="width: 100%"
  />
</template>
