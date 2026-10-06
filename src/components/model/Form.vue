<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ElAlert } from 'element-plus'
import { NoticeBar } from 'vant'
import Form from '../form/Form.vue'
import { useDjango } from '../../composables/context.js'
import { emptyData, normalizeItems } from '../../core/metadata.js'
import { useViewTab } from '../../composables/tab.js'

defineOptions({ inheritAttrs: false })
const props = defineProps({
  appModel: { type: String, required: true },
  id: [String, Number],
  modelValue: Object,
  items: [Array, String],
  defaults: { type: Object, default: () => ({}) },
  mobile: Boolean,
})
const emit = defineEmits(['update:modelValue', 'loaded', 'form-posted', 'error', 'beforesubmit'])
const { registry } = useDjango()
const tab = useViewTab()
const form = ref(),
  data = ref({}),
  fields = ref([]),
  message = ref(''),
  loading = ref(false)
const errors = computed(() => form.value?.errors ?? {})
const isEdit = computed(() => props.id != null)
let generation = 0

function updateTabTitle(object) {
  if (!isEdit.value) return
  const config = registry.getConfig(props.appModel)
  tab?.update({ title: object.__str__ ?? object[config.title_field || 'name'], icon: config.icon })
}
function changed(value) {
  data.value = value
  emit('update:modelValue', { ...value })
}
watch(
  () => props.modelValue,
  (value) => {
    if (value) data.value = { ...value }
  },
  { deep: true },
)
async function load() {
  const current = ++generation
  loading.value = true
  message.value = ''
  fields.value = []
  data.value = {}
  try {
    const model = registry.get(props.appModel)
    const [metadata, views, object] = await Promise.all([
      model.fields(isEdit.value ? 'PATCH' : 'POST'),
      model.loadViewsConfig(),
      isEdit.value ? model.loadObject(props.id) : {},
    ])
    if (current !== generation) return
    const view = (isEdit.value ? views.update : views.create) ?? views.form ?? {}
    fields.value = normalizeItems(props.items ?? view.items ?? 'all', metadata).filter(
      (field) => !field.read_only,
    )
    changed({ ...emptyData(metadata, props.defaults), ...object, ...props.modelValue })
    updateTabTitle(object)
    emit('loaded', model)
  } catch (error) {
    if (current === generation) {
      message.value = error.message
      emit('error', error)
    }
  } finally {
    if (current === generation) loading.value = false
  }
}
function save({ formValue }) {
  return registry.get(props.appModel).save(formValue, props.id, props.defaults)
}
function posted(result) {
  changed({ ...data.value, ...result })
  updateTabTitle(result)
  emit('form-posted', { model: registry.getConfig(props.appModel), data: result, intent: 'save' })
}
async function submit() {
  if (loading.value) return
  await nextTick()
  return form.value?.onSubmit()
}
watch(() => [props.appModel, props.id, props.items, props.defaults], load, { immediate: true })
defineExpose({ load, submit, data, errors })
</script>

<template>
  <div :aria-busy="loading || form?.loading">
    <p v-if="loading">正在加载字段…</p>
    <template v-else>
      <NoticeBar
        v-if="message && mobile"
        :text="message"
      />
      <ElAlert
        v-else-if="message"
        :title="message"
        type="error"
        :closable="false"
      />
      <Form
        ref="form"
        v-bind="$attrs"
        :model-value="data"
        :items="fields"
        :submit="save"
        :mobile="mobile"
        :disabled="Boolean(message) || !fields.length"
        :show-success="false"
        submit-name="保存"
        label-position="top"
        @update:model-value="changed"
        @form-posted="posted"
        @error="emit('error', $event)"
        @beforesubmit="emit('beforesubmit', $event)"
      >
        <template
          v-for="(_, name) in $slots"
          #[name]="scope"
        >
          <slot
            :name="name"
            v-bind="scope || {}"
          />
        </template>
      </Form>
    </template>
  </div>
</template>
