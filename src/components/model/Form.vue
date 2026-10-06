<script setup>
import { computed, ref, watch } from 'vue'
import { ElForm, ElFormItem, ElButton, ElAlert } from 'element-plus'
import { Form as VanForm, Field as VanField, Button as VanButton, NoticeBar } from 'vant'
import Field from '../form/Field.vue'
import { useDjango } from '../../composables/context.js'
import { emptyData, normalizeItems } from '../../core/metadata.js'
const props = defineProps({
  appModel: { type: String, required: true }, id: [String, Number],
  modelValue: Object, items: [Array, String], defaults: { type: Object, default: () => ({}) }, mobile: Boolean,
})
const emit = defineEmits(['update:modelValue', 'loaded', 'form-posted', 'error'])
const { registry } = useDjango()
const data = ref({}), fields = ref([]), errors = ref({}), message = ref(''), loading = ref(false), saving = ref(false)
let generation = 0
const isEdit = computed(() => props.id != null)
watch(() => props.modelValue, value => { if (value) data.value = { ...value } }, { deep: true })
function update(name, value) {
  data.value[name] = value
  delete errors.value[name]
  emit('update:modelValue', { ...data.value })
}
async function load() {
  const current = ++generation
  loading.value = true
  errors.value = {}; message.value = ''; fields.value = []; data.value = {}
  try {
    const model = registry.get(props.appModel)
    const [metadata, views, object] = await Promise.all([
      model.fields(isEdit.value ? 'PATCH' : 'POST'), model.loadViewsConfig(), isEdit.value ? model.loadObject(props.id) : {},
    ])
    if (current !== generation) return
    const view = (isEdit.value ? views.update : views.create) ?? views.form ?? {}
    fields.value = normalizeItems(props.items ?? view.items ?? 'all', metadata).filter(f => !f.read_only)
    data.value = { ...emptyData(metadata, props.defaults), ...object, ...props.modelValue }
    emit('loaded', model)
  } catch (error) { if (current === generation) { message.value = error.message; emit('error', error) } }
  finally { if (current === generation) loading.value = false }
}
function onSubmit(event) {
  event?.preventDefault?.()
  return submit()
}
async function submit() {
  if (saving.value || loading.value) return
  errors.value = {}; message.value = ''
  for (const f of fields.value) {
    const value = data.value[f.name]
    if (f.required && !f.allow_null && (value == null || value === '' || Array.isArray(value) && !value.length)) errors.value[f.name] = '不能为空'
  }
  if (Object.keys(errors.value).length) return
  saving.value = true
  try {
    const result = await registry.get(props.appModel).save(data.value, props.id, props.defaults)
    data.value = { ...data.value, ...result }
    emit('update:modelValue', { ...data.value })
    emit('form-posted', { model: registry.getConfig(props.appModel), data: result, intent: 'save' })
    return result
  } catch (error) {
    errors.value = error.fields ?? {}
    message.value = errors.value.non_field_errors || errors.value.detail || (Object.keys(errors.value).length ? '请检查表单字段' : error.message)
    emit('error', error)
  } finally { saving.value = false }
}
watch(() => [props.appModel, props.id, props.items, props.defaults], load, { immediate: true })
defineExpose({ load, submit, data, errors })
</script>
<template>
  <div :aria-busy="loading || saving">
    <p v-if="loading">正在加载字段…</p>
    <template v-else>
      <NoticeBar v-if="message && mobile" :text="message" />
      <ElAlert v-else-if="message" :title="message" type="error" :closable="false" show-icon />
      <component :is="mobile ? VanForm : ElForm" label-position="top" @submit="onSubmit">
        <template v-for="field in fields" :key="field.name">
          <VanField v-if="mobile" :label="field.label || field.name" :required="field.required" :error-message="errors[field.name]">
            <template #input><slot :name="`field-${field.name}`" :field="field" :value="data[field.name]" :update="v => update(field.name, v)"><Field :field="field" :model-value="data[field.name]" mobile @update:model-value="v => update(field.name, v)" /></slot></template>
          </VanField>
          <ElFormItem v-else :label="field.label || field.name" :required="field.required" :error="errors[field.name]">
            <slot :name="`field-${field.name}`" :field="field" :value="data[field.name]" :update="v => update(field.name, v)"><Field :field="field" :model-value="data[field.name]" @update:model-value="v => update(field.name, v)" /></slot>
          </ElFormItem>
        </template>
        <slot name="submit" :submit="submit" :saving="saving">
          <VanButton v-if="mobile" block type="primary" native-type="submit" :loading="saving" :disabled="loading || !fields.length">保存</VanButton>
          <ElButton v-else type="primary" native-type="submit" :loading="saving" :disabled="loading || !fields.length">保存</ElButton>
        </slot>
      </component>
    </template>
  </div>
</template>
