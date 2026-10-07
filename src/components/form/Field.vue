<script setup>
import { computed, toRaw } from 'vue'
import { ElInput, ElInputNumber, ElSwitch, ElSelect, ElOption, ElDatePicker } from 'element-plus'
import { Field as VanField, Switch as VanSwitch } from 'vant'
import { displayValue } from '../../core/metadata.js'
import ModelSelect from '../model/Select.vue'
import ImageUpload from '../media/ImageUpload.vue'
import FileUpload from '../media/FileUpload.vue'
const props = defineProps({
  field: { type: Object, required: true },
  modelValue: null,
  mobile: Boolean,
})
const emit = defineEmits(['update:modelValue', 'uploading', 'error'])
const value = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })
const numberType = computed(() => ['integer', 'decimal', 'float'].includes(props.field.type))
const widget = computed(() => toRaw(props.field.widget))
const uploadWidget = computed(() => {
  if (typeof widget.value !== 'string') return undefined
  const name = widget.value.replace(/[-_ ]/g, '').toLowerCase()
  return ['imageupload', 'imageinput'].includes(name)
    ? ImageUpload
    : ['fileupload', 'fileinput'].includes(name)
      ? FileUpload
      : undefined
})
const relatedModel = computed(
  () => props.field.appModel ?? props.field.relateModel ?? props.field.model,
)
const modelSelect = computed(
  () =>
    widget.value === ModelSelect ||
    (typeof widget.value === 'string' &&
      ['modelselect', 'relatedselect'].includes(
        widget.value.replace(/[-_ ]/g, '').toLowerCase(),
      )) ||
    (!widget.value && Boolean(relatedModel.value)),
)
function mobileInput(v) {
  value.value = numberType.value ? (v === '' ? null : Number(v)) : v
}
</script>
<template>
  <span v-if="field.read_only">{{ displayValue(field, value) }}</span>
  <component
    v-else-if="uploadWidget"
    :is="uploadWidget"
    v-model="value"
    :field="field"
    @uploading="emit('uploading', $event)"
    @error="emit('error', $event)"
  />
  <ModelSelect
    v-else-if="modelSelect"
    v-model="value"
    :app-model="relatedModel"
    @error="emit('error', $event)"
    :field="field"
  />
  <component
    v-else-if="field.widget && typeof field.widget !== 'string'"
    :is="widget"
    v-model="value"
    :field="field"
    :app-model="relatedModel"
    @uploading="emit('uploading', $event)"
    @error="emit('error', $event)"
  />
  <template v-else-if="mobile">
    <VanSwitch
      v-if="field.type === 'boolean'"
      v-model="value"
      size="22px"
    />
    <select
      v-else-if="field.choices"
      v-model="value"
      :multiple="field.multiple"
      :aria-label="field.label || field.name"
    >
      <option
        v-if="field.allow_null && !field.multiple"
        :value="null"
      >
        请选择
      </option>
      <option
        v-for="choice in field.choices"
        :key="String(choice.value)"
        :value="choice.value"
      >
        {{ choice.display_name }}
      </option>
    </select>
    <VanField
      v-else
      :model-value="value == null ? '' : String(value)"
      :type="numberType ? 'number' : field.widget === 'textarea' ? 'textarea' : 'text'"
      :placeholder="field.placeholder ?? field.help_text ?? '请输入'"
      :aria-label="field.label || field.name"
      @update:model-value="mobileInput"
    />
  </template>
  <ElSelect
    v-else-if="field.choices"
    v-model="value"
    :multiple="field.multiple"
    :clearable="field.allow_null"
    :placeholder="field.placeholder"
    :aria-label="field.label || field.name"
    style="width: 100%"
  >
    <ElOption
      v-for="choice in field.choices"
      :key="String(choice.value)"
      :label="choice.display_name"
      :value="choice.value"
    />
  </ElSelect>
  <ElSwitch
    v-else-if="field.type === 'boolean'"
    v-model="value"
  />
  <ElInputNumber
    v-else-if="numberType"
    v-model="value"
    :precision="field.type === 'integer' ? 0 : undefined"
    :min="field.min_value"
    :max="field.max_value"
    :placeholder="field.placeholder"
    :aria-label="field.label || field.name"
  />
  <ElDatePicker
    v-else-if="['date', 'datetime'].includes(field.type)"
    v-model="value"
    :type="field.type"
    :value-format="field.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm:ssZ'"
    :placeholder="field.placeholder"
  />
  <ElInput
    v-else
    v-model="value"
    :type="['textarea', 'password'].includes(field.widget) ? field.widget : 'text'"
    :maxlength="field.max_length"
    :autocomplete="field.autocomplete"
    :placeholder="field.placeholder ?? field.help_text"
    :aria-label="field.label || field.name"
  />
</template>
