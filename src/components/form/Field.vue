<script setup>
import { computed } from 'vue'
import { ElInput, ElInputNumber, ElSwitch, ElSelect, ElOption, ElDatePicker } from 'element-plus'
import { Field as VanField, Switch as VanSwitch } from 'vant'
import { displayValue } from '../../core/metadata.js'
const props = defineProps({ field: { type: Object, required: true }, modelValue: null, mobile: Boolean })
const emit = defineEmits(['update:modelValue'])
const value = computed({ get: () => props.modelValue, set: v => emit('update:modelValue', v) })
const numberType = computed(() => ['integer', 'decimal', 'float'].includes(props.field.type))
function mobileInput(v) {
  value.value = numberType.value ? v === '' ? null : Number(v) : v
}
</script>
<template>
  <span v-if="field.read_only">{{ displayValue(field, value) }}</span>
  <component v-else-if="field.widget && typeof field.widget !== 'string'" :is="field.widget" v-model="value" :field="field" />
  <template v-else-if="mobile">
    <VanSwitch v-if="field.type === 'boolean'" v-model="value" size="22px" />
    <select v-else-if="field.choices" v-model="value" :multiple="field.multiple" :aria-label="field.label || field.name">
      <option v-if="field.allow_null && !field.multiple" :value="null">请选择</option>
      <option v-for="choice in field.choices" :key="String(choice.value)" :value="choice.value">{{ choice.display_name }}</option>
    </select>
    <VanField v-else :model-value="value == null ? '' : String(value)" :type="numberType ? 'number' : field.widget === 'textarea' ? 'textarea' : 'text'" :placeholder="field.help_text || '请输入'" :aria-label="field.label || field.name" @update:model-value="mobileInput" />
  </template>
  <ElSelect v-else-if="field.choices" v-model="value" :multiple="field.multiple" :clearable="field.allow_null" style="width:100%">
    <ElOption v-for="choice in field.choices" :key="String(choice.value)" :label="choice.display_name" :value="choice.value" />
  </ElSelect>
  <ElSwitch v-else-if="field.type === 'boolean'" v-model="value" />
  <ElInputNumber v-else-if="numberType" v-model="value" :precision="field.type === 'integer' ? 0 : undefined" :min="field.min_value" :max="field.max_value" />
  <ElDatePicker v-else-if="['date', 'datetime'].includes(field.type)" v-model="value" :type="field.type" :value-format="field.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm:ssZ'" />
  <ElInput v-else v-model="value" :type="field.widget === 'textarea' ? 'textarea' : 'text'" :maxlength="field.max_length" :placeholder="field.help_text" />
</template>
