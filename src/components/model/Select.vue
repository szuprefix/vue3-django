<script setup>
import { computed, ref, watch } from 'vue'
import { ElSelect, ElOption, ElAlert } from 'element-plus'
import { useDjango } from '../../composables/context.js'
const props = defineProps({
  appModel: String,
  modelValue: [String, Number, Array],
  field: { type: Object, default: () => ({}) },
  pageSize: { type: Number, default: 30 },
})
const emit = defineEmits(['update:modelValue', 'error'])
const { registry } = useDjango()
const rows = ref([]),
  selected = ref([]),
  loading = ref(false),
  error = ref('')
let generation = 0
const idField = computed(() => props.field.idField || 'id')
const appModel = computed(
  () => props.appModel ?? props.field.appModel ?? props.field.relateModel ?? props.field.model,
)
const labelFields = computed(() => {
  const config = appModel.value ? registry.getConfig(appModel.value) : {}
  return (
    props.field.selectOptionsFields ??
    config.selectOptionsFields ?? ['__str__', config.title_field ?? 'name', 'title']
  )
})
function label(row) {
  return String(
    labelFields.value.map((name) => row[name]).find((value) => value != null && value !== '') ??
      row[idField.value],
  )
}
const options = computed(() => [
  ...new Map([...selected.value, ...rows.value].map((row) => [row[idField.value], row])).values(),
])
async function load(search = '') {
  const current = ++generation
  loading.value = true
  error.value = ''
  try {
    if (!appModel.value) throw new Error('ModelSelect 字段需要配置 appModel、model 或 relateModel')
    const model = registry.get(appModel.value)
    const ids = Array.isArray(props.modelValue)
      ? props.modelValue
      : props.modelValue == null
        ? []
        : [props.modelValue]
    const [result, values] = await Promise.all([
      model.query({
        ...props.field.baseQueries,
        search: search || undefined,
        page_size: props.pageSize,
      }),
      ids.length
        ? model.query({
            ...props.field.baseQueries,
            [`${idField.value}__in`]: ids,
            page_size: ids.length,
          })
        : [],
    ])
    if (current !== generation) return
    rows.value = result.results ?? result
    selected.value = values.results ?? values
  } catch (e) {
    if (current === generation) {
      error.value = e.message
      emit('error', e)
    }
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(
  () => [appModel.value, props.modelValue, props.field.baseQueries],
  () => load(),
  { immediate: true, deep: true },
)
</script>
<template>
  <ElSelect
    :model-value="modelValue"
    :multiple="field.multiple"
    :loading="loading"
    filterable
    remote
    clearable
    :disabled="field.disabled"
    :multiple-limit="field.multipleLimit ?? 0"
    :remote-method="load"
    :placeholder="field.placeholder || `请选择${field.label || ''}`"
    style="width: 100%"
    @update:model-value="emit('update:modelValue', $event === '' ? null : $event)"
  >
    <ElOption
      v-for="row in options"
      :key="row[idField]"
      :value="row[idField]"
      :label="label(row)"
    />
  </ElSelect>
  <ElAlert
    v-if="error"
    :title="error"
    type="error"
    :closable="false"
  />
</template>
