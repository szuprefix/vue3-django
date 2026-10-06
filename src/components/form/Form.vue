<script setup>
import { computed, nextTick, ref, useAttrs, watch } from 'vue'
import { ElForm, ElFormItem, ElRow, ElCol, ElButton, ElAlert, ElMessage } from 'element-plus'
import Field from './Field.vue'
import { normalizeItems, getItemRules } from './Form.js'
import { joinErrors } from '../../core/http.js'
import { useDjango } from '../../composables/context.js'
import Schema from 'async-validator'
import { Form as VanForm, Field as VanField, Button as VanButton, NoticeBar } from 'vant'
defineOptions({ inheritAttrs: false })
const props = defineProps({
  modelValue: Object,
  value: Object,
  items: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] },
  actions: Array,
  url: String,
  method: { type: String, default: 'post' },
  options: { type: Object, default: () => ({}) },
  submit: Function,
  submitName: { type: String, default: '提交' },
  successInfo: String,
  showSuccess: { type: Boolean, default: true },
  disabled: Boolean,
  noLabel: Boolean,
  oneColumn: Boolean,
  inline: Boolean,
  itemOptions: { type: Object, default: () => ({}) },
  mobile: Boolean,
})
const emit = defineEmits(['update:modelValue', 'input', 'beforesubmit', 'form-posted', 'error'])
const { registry } = useDjango()
const attrs = useAttrs(),
  form = ref(),
  formValue = ref({}),
  errors = ref({}),
  loading = ref(false)
const formItems = computed(() =>
  normalizeItems(
    props.items.length ? props.items : props.groups.flatMap((group) => group.items || []),
  ),
)
const rules = computed(() => getItemRules(formItems.value))
watch(
  () => props.modelValue ?? props.value,
  (value) => {
    formValue.value = { ...value }
  },
  { immediate: true, deep: true },
)
function publish() {
  emit('update:modelValue', { ...formValue.value })
  emit('input', { ...formValue.value })
}
function update(name, value) {
  formValue.value[name] = value
  delete errors.value[name]
  publish()
}
async function onSubmit() {
  if (loading.value || props.disabled) return
  errors.value = {}
  try {
    for (const field of formItems.value) {
      if (typeof field.widget === 'function')
        formValue.value[field.name] = field.widget(formValue.value)
    }
    const Validator = Schema.default || Schema
    await new Validator(rules.value).validate(formValue.value)
    await nextTick()
    if (!props.mobile) {
      const valid = await form.value.validate()
      if (!valid) return false
    }
  } catch (validation) {
    if (validation.fields)
      errors.value = Object.fromEntries(
        Object.entries(validation.fields).map(([name, messages]) => [
          name,
          messages.map((item) => item.message).join('；'),
        ]),
      )
    return false
  }
  loading.value = true
  try {
    emit('beforesubmit', formValue.value)
    publish()
    let data
    if (props.submit)
      data = await props.submit({
        formValue: formValue.value,
        formItems: formItems.value,
        errors: errors.value,
        loading,
        url: props.url,
        method: props.method,
      })
    else {
      if (!props.url) throw new Error('表单提交需要 url 或 submit 函数')
      const response = await registry.http.request({
        url: props.url,
        method: props.method,
        data: formValue.value,
      })
      data = response.data
    }
    if (data === false) return false
    if (props.showSuccess) ElMessage.success(props.successInfo || `${props.submitName}成功`)
    emit('form-posted', data)
    return data
  } catch (error) {
    const status = error.code ?? error.response?.status
    errors.value =
      status === 400
        ? joinErrors(error.msg ?? error.response?.data ?? {})
        : { non_field_errors: error.message || '请求失败' }
    emit('error', error)
  } finally {
    loading.value = false
  }
}
const context = { onSubmit, formValue, formItems, loading, errors }
defineExpose({ ...context, submit: onSubmit })
</script>

<template>
  <VanForm
    v-if="mobile"
    :aria-busy="loading"
    @submit="onSubmit"
  >
    <slot name="header" />
    <NoticeBar
      v-if="errors.non_field_errors || errors.detail"
      :text="errors.non_field_errors || errors.detail"
    />
    <template
      v-for="field in formItems"
      :key="field.name"
    >
      <VanField
        v-if="!field.hidden && field.widget !== 'hidden'"
        :label="noLabel || field.noLabel ? '' : field.label"
        :required="field.required"
        :error-message="errors[field.name]"
      >
        <template #input>
          <slot
            :name="`field-${field.name}`"
            :field="field"
            :value="formValue[field.name]"
            :update="(value) => update(field.name, value)"
          >
            <span v-if="typeof field.widget === 'function'">{{ field.widget(formValue) }}</span>
            <Field
              v-else
              :field="field"
              :model-value="formValue[field.name]"
              mobile
              @update:model-value="update(field.name, $event)"
            />
          </slot>
        </template>
      </VanField>
    </template>
    <slot
      v-if="submitName"
      name="submit"
      :submit="onSubmit"
      :loading="loading"
      :saving="loading"
    >
      <template v-if="actions"
        ><VanButton
          v-for="action in actions"
          :key="action.name"
          :disabled="loading || disabled"
          @click="action.name === 'submit' ? onSubmit() : action.do?.(context)"
          >{{ action.label || action.name }}</VanButton
        ></template
      >
      <VanButton
        v-else
        block
        type="primary"
        native-type="submit"
        :loading="loading"
        :disabled="disabled"
        >{{ submitName }}</VanButton
      >
    </slot>
    <slot name="footer" />
  </VanForm>
  <ElForm
    v-else
    ref="form"
    v-bind="{ ...options.elForm, ...attrs }"
    :model="formValue"
    :rules="rules"
    :inline="inline"
    :label-width="noLabel ? '0px' : attrs.labelWidth || '160px'"
    :aria-busy="loading"
    @submit.prevent="onSubmit"
  >
    <slot name="header" />
    <ElAlert
      v-if="errors.non_field_errors || errors.detail"
      :title="errors.non_field_errors || errors.detail"
      type="error"
      :closable="false"
    />
    <ElRow :gutter="20">
      <template
        v-for="field in formItems"
        :key="field.name"
      >
        <input
          v-if="field.widget === 'hidden' && !field.hidden"
          type="hidden"
          :value="formValue[field.name]"
        />
        <ElCol
          v-else-if="!field.hidden"
          v-bind="oneColumn || inline ? { span: 24 } : field.span"
        >
          <ElFormItem
            v-bind="itemOptions"
            :prop="field.name"
            :label="noLabel || itemOptions.noLabel || field.noLabel ? '' : field.label"
            :error="errors[field.name]"
          >
            <slot
              :name="`field-${field.name}`"
              :field="field"
              :value="formValue[field.name]"
              :update="(value) => update(field.name, value)"
            >
              <span v-if="typeof field.widget === 'function'">{{ field.widget(formValue) }}</span>
              <Field
                v-else
                :field="field"
                :model-value="formValue[field.name]"
                :mobile="mobile"
                @update:model-value="update(field.name, $event)"
              />
            </slot>
          </ElFormItem>
        </ElCol>
      </template>
      <ElCol
        v-if="submitName"
        :span="24"
        ><ElFormItem>
          <slot
            name="submit"
            :submit="onSubmit"
            :loading="loading"
            :saving="loading"
          >
            <template v-if="actions"
              ><ElButton
                v-for="action in actions"
                :key="action.name"
                :type="action.type"
                :disabled="loading || disabled"
                @click="action.name === 'submit' ? onSubmit() : action.do?.(context)"
                >{{ action.label || action.name }}</ElButton
              ></template
            >
            <ElButton
              v-else
              type="primary"
              native-type="submit"
              :loading="loading"
              :disabled="disabled"
              >{{ submitName }}</ElButton
            >
          </slot>
        </ElFormItem></ElCol
      >
      <slot name="footer" />
    </ElRow>
  </ElForm>
</template>
