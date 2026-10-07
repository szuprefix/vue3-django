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
function fieldStyle(field) {
  const width =
    field.width ?? `${Math.max(10, Math.min(20, (field.label || field.name).length + 5))}rem`
  return { '--search-field-width': typeof width === 'number' ? `${width}px` : width }
}
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
    class="vd-model-search"
    @submit.prevent="submit"
  >
    <div
      v-if="searchNames.length"
      class="vd-search-field vd-search-keyword"
    >
      <ElInput
        v-model="form.search"
        clearable
        :placeholder="`搜索${searchNames.join('、')}`"
        aria-label="搜索记录"
      />
    </div>
    <div
      v-for="field in fields"
      :key="field.name"
      class="vd-search-field"
      :style="fieldStyle(field)"
    >
      <ElSelect
        v-if="field.type === 'boolean'"
        v-model="form[field.name]"
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
      <Field
        v-else
        :field="field"
        v-model="form[field.name]"
      />
    </div>
    <div class="vd-search-actions">
      <ElButton
        native-type="submit"
        type="primary"
      >
        搜索
      </ElButton>
      <ElButton
        native-type="button"
        @click="reset"
      >
        重置
      </ElButton>
    </div>
  </form>
</template>

<style scoped>
.vd-model-search {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.vd-search-field {
  flex: 0 1 var(--search-field-width, 12rem);
  width: var(--search-field-width, 12rem);
  min-width: 0;
  max-width: 100%;
}
.vd-search-keyword {
  --search-field-width: 18rem;
}
.vd-search-field :deep(.el-input),
.vd-search-field :deep(.el-select),
.vd-search-field :deep(.el-input-number),
.vd-search-field :deep(.el-date-editor) {
  width: 100%;
  min-width: 0;
}
.vd-search-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}
.vd-search-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}
@media (max-width: 600px) {
  .vd-search-field {
    flex: 1 1 calc(50% - 6px);
  }
  .vd-search-keyword {
    flex-basis: 100%;
  }
  .vd-search-actions {
    flex-basis: 100%;
  }
}
@media (max-width: 360px) {
  .vd-search-field {
    flex-basis: 100%;
  }
}
</style>
