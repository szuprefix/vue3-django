<script setup>
import { ref, watch } from 'vue'
import {
  ElInput,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElInputNumber,
  ElRadioGroup,
  ElRadioButton,
} from 'element-plus'
import Field from '../form/Field.vue'
import { useDjango } from '../../composables/context.js'
import { searchFields, searchQueries, searchWidth } from '../../core/search.js'
const props = defineProps({ appModel: String, items: Array, exclude: [Array, Object] })
const emit = defineEmits(['change', 'error'])
const { registry } = useDjango()
const form = ref({}),
  fields = ref([]),
  searchNames = ref([])
let generation = 0
let lastQuery
function fieldStyle(field) {
  return { '--search-field-width': searchWidth(field) }
}
watch(
  () => [props.appModel, props.items, props.exclude],
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
      fields.value = searchFields(
        props.items ?? options.actions?.SEARCH?.filter_fields ?? [],
        metadata,
        config.search,
        props.exclude,
      ).filter((field) => {
        if (field.widget !== 'modelselect') return true
        const relatedModel = field.appModel ?? field.relateModel ?? field.model
        if (!relatedModel) return false
        try {
          registry.getConfig(relatedModel)
          return true
        } catch {
          // An unregistered relation cannot offer usable search choices.
          return false
        }
      })
      form.value = {}
      lastQuery = undefined
    } catch (e) {
      emit('error', e)
    }
  },
  { immediate: true, deep: true },
)
function submit() {
  const queries = searchQueries(form.value, fields.value)
  const signature = JSON.stringify(queries)
  if (signature === lastQuery) return
  lastQuery = signature
  emit('change', queries)
}
function changed(name, value) {
  form.value[name] = value
  submit()
}
function setRange(name, index, value) {
  const range = [...(form.value[name] ?? [null, null])]
  range[index] = value
  form.value[name] = range
  submit()
}
function reset() {
  form.value = {}
  submit()
}
defineExpose({ submit, reset })
</script>
<template>
  <form
    class="vd-model-search"
    @submit.prevent="submit"
  >
    <div
      v-if="searchNames.length"
      class="vd-search-field vd-search-keyword"
      :style="{ '--search-field-width': `${Math.max(10, searchNames.join('、').length + 5)}rem` }"
    >
      <ElInput
        v-model="form.search"
        clearable
        :placeholder="`搜索${searchNames.join('、')}`"
        aria-label="搜索记录"
        @change="submit"
        @clear="submit"
      />
    </div>
    <div
      v-for="field in fields"
      :key="field.name"
      class="vd-search-field"
      :style="fieldStyle(field)"
    >
      <ElSelect
        v-if="field.widget === 'boolean'"
        :model-value="form[field.name]"
        @update:model-value="changed(field.name, $event)"
        clearable
        :placeholder="field.placeholder"
        :aria-label="field.label || field.name"
      >
        <ElOption
          label="是"
          :value="true"
        />
        <ElOption
          label="否"
          :value="false"
        />
      </ElSelect>
      <ElRadioGroup
        v-else-if="field.widget === 'radio'"
        :model-value="form[field.name]"
        @update:model-value="changed(field.name, $event)"
        :aria-label="field.label || field.name"
      >
        <ElRadioButton
          v-for="choice in field.choices"
          :key="choice.value"
          :value="choice.value"
        >
          {{ choice.display_name }}
        </ElRadioButton>
      </ElRadioGroup>
      <ElDatePicker
        v-else-if="field.widget === 'daterange'"
        :model-value="form[field.name]"
        @update:model-value="changed(field.name, $event)"
        :type="field.type === 'datetime' ? 'datetimerange' : 'daterange'"
        :value-format="
          field.valueFormat ?? (field.type === 'datetime' ? 'YYYY-MM-DDTHH:mm:ss' : 'YYYY-MM-DD')
        "
        :start-placeholder="`最小${field.label || field.name}`"
        :end-placeholder="`最大${field.label || field.name}`"
      />
      <div
        v-else-if="field.widget === 'numberrange'"
        class="vd-search-range"
      >
        <ElInputNumber
          :model-value="form[field.name]?.[0]"
          :controls="false"
          :placeholder="`最小${field.label || field.name}`"
          @update:model-value="setRange(field.name, 0, $event)"
        />
        <span>至</span>
        <ElInputNumber
          :model-value="form[field.name]?.[1]"
          :controls="false"
          :placeholder="`最大${field.label || field.name}`"
          @update:model-value="setRange(field.name, 1, $event)"
        />
      </div>
      <ElInput
        v-else-if="field.widget === 'array' || field.widget === 'input'"
        v-model="form[field.name]"
        clearable
        :placeholder="
          field.widget === 'array' ? `批量查询${field.label || field.name}` : field.placeholder
        "
        :aria-label="field.label || field.name"
        @change="submit"
        @clear="submit"
      />
      <Field
        v-else
        :field="field"
        :model-value="form[field.name]"
        @update:model-value="changed(field.name, $event)"
      />
    </div>
  </form>
</template>

<style scoped>
.vd-model-search {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 4px;
}
.vd-search-field {
  flex: 0 1 var(--search-field-width, 8rem);
  width: var(--search-field-width, 8rem);
  min-width: 0;
  max-width: 100%;
}
.vd-search-field :deep(.el-input),
.vd-search-field :deep(.el-select),
.vd-search-field :deep(.el-input-number),
.vd-search-field :deep(.el-date-editor) {
  width: 100%;
  min-width: 0;
}
.vd-search-range {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
