<script setup>
import { ref, watch } from 'vue'
import { ElInput, ElButton, ElSelect, ElOption } from 'element-plus'
import Field from '../form/Field.vue'
import { useDjango } from '../../composables/context.js'
import { normalizeItems } from '../../core/metadata.js'
const props = defineProps({ appModel: String, items: Array })
const emit = defineEmits(['change', 'error'])
const { registry } = useDjango()
const form = ref({}),
  fields = ref([]),
  searchNames = ref([])
let generation = 0
watch(
  () => [props.appModel, props.items],
  async () => {
    const current = ++generation
    try {
      const model = registry.get(props.appModel)
      const [options, metadata, config] = await Promise.all([
        model.loadOptions(),
        model.fields(),
        model.loadViewsConfig(),
      ])
      if (current !== generation) return
      searchNames.value = options.actions?.SEARCH?.search_fields ?? []
      fields.value = normalizeItems(
        props.items ?? options.actions?.SEARCH?.filter_fields ?? [],
        metadata,
      ).map((field) => {
        const configured = { ...field, ...config.search?.[field.name] }
        const selection =
          configured.model ||
          configured.relateModel ||
          configured.choices ||
          configured.type === 'boolean'
        return {
          ...configured,
          placeholder:
            configured.placeholder ??
            `${selection ? '请选择' : '请输入'}${configured.label || configured.name}`,
          read_only: false,
          required: false,
          multiple: false,
        }
      })
      form.value = {}
    } catch (e) {
      emit('error', e)
    }
  },
  { immediate: true, deep: true },
)
function submit() {
  emit(
    'change',
    Object.fromEntries(
      Object.entries(form.value).filter(([, value]) => value !== '' && value != null),
    ),
  )
}
function reset() {
  form.value = {}
  submit()
}
</script>
<template>
  <form
    class="vd-toolbar"
    @submit.prevent="submit"
  >
    <ElInput
      v-if="searchNames.length"
      v-model="form.search"
      clearable
      :placeholder="`搜索${searchNames.join('、')}`"
      aria-label="搜索记录"
    />
    <div
      v-for="field in fields"
      :key="field.name"
    >
      <ElSelect
        v-if="field.type === 'boolean'"
        v-model="form[field.name]"
        clearable
        :placeholder="field.placeholder"
        :aria-label="field.label || field.name"
        ><ElOption
          label="是"
          :value="true" /><ElOption
          label="否"
          :value="false"
      /></ElSelect>
      <Field
        v-else
        :field="field"
        v-model="form[field.name]"
      />
    </div>
    <ElButton native-type="submit">搜索</ElButton><ElButton @click="reset">重置</ElButton>
  </form>
</template>
