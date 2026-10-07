<script setup>
import { ref, shallowRef, watch, markRaw, nextTick } from 'vue'
import { ElTabs, ElTabPane, ElAlert, ElButton, ElDialog, ElDrawer } from 'element-plus'
import ModelTable from './Table.vue'
import ModelSelect from './Select.vue'
import ModelForm from './Form.vue'
import { useDjango } from '../../composables/context.js'
import { resolveRelation, relationIds } from '../../core/relations.js'
const props = defineProps({
  parent: { type: Object, required: true },
  items: Array,
  mobile: Boolean,
})
const emit = defineEmits(['edit', 'create', 'error', 'parent-updated'])
const { registry, loadRelationView, revisions } = useDjango()
const relations = shallowRef([]),
  loading = ref(false),
  error = ref(''),
  active = ref('')
const adding = shallowRef(),
  creating = shallowRef(),
  selection = ref([]),
  saving = ref(false)
let generation = 0
async function load() {
  const current = ++generation
  if ((props.parent.id ?? props.parent.data?.id) == null) {
    relations.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    const config =
      props.parent.viewsConfig ?? (await registry.get(props.parent.appModel).loadViewsConfig())
    const results = await Promise.all(
      (props.items ?? config.relations ?? []).map(async (definition, index) => {
        const key =
          typeof definition === 'object'
            ? (definition.key ?? `${definition.name}:${index}`)
            : `${definition}:${index}`
        try {
          const item = await resolveRelation(definition, props.parent, registry)
          if (typeof item.view === 'string') {
            if (!loadRelationView) throw new Error(`自定义视图 ${item.view} 需要 loadRelationView`)
            const module = await loadRelationView(item.name, item.view)
            item.view = markRaw(module.default ?? module)
          } else if (item.view) item.view = markRaw(item.view)
          return { ...item, key }
        } catch (e) {
          return {
            key,
            label:
              typeof definition === 'string' ? definition : definition.label || definition.name,
            error: e.message,
          }
        }
      }),
    )
    if (current !== generation) return
    relations.value = results
    if (!results.some((item) => item.key === active.value)) active.value = results[0]?.key || ''
  } catch (e) {
    if (current === generation) {
      error.value = e.message
      emit('error', e)
    }
  } finally {
    if (current === generation) loading.value = false
  }
}
async function updateMembership(item, ids) {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    const model = registry.get(props.parent.appModel)
    const id = props.parent.id ?? props.parent.data[model.config.idField || 'id']
    const { data } = await registry.http.patch(model.getDetailUrl(id), {
      [item.multipleField.name]: ids,
    })
    emit('parent-updated', {
      ...props.parent.data,
      [item.multipleField.name]: data[item.multipleField.name] ?? ids,
    })
    adding.value = undefined
    creating.value = undefined
    await nextTick()
    await load()
  } catch (e) {
    error.value = e.message
    emit('error', e)
  } finally {
    saving.value = false
  }
}
function beginAdd(item) {
  selection.value = []
  adding.value = item
}
function addSelected() {
  const item = adding.value
  return updateMembership(item, [
    ...new Set([...relationIds(props.parent.data[item.multipleField.name]), ...selection.value]),
  ])
}
function remove(item, row) {
  const id = row[item.model.config.idField || 'id']
  return updateMembership(
    item,
    relationIds(props.parent.data[item.multipleField.name]).filter(
      (value) => String(value) !== String(id),
    ),
  )
}
async function saved(item, event) {
  if (item.multipleField)
    await updateMembership(item, [
      ...new Set([
        ...relationIds(props.parent.data[item.multipleField.name]),
        event.data[item.model.config.idField || 'id'],
      ]),
    ])
  else {
    creating.value = undefined
    if (revisions) revisions[item.name] = (revisions[item.name] || 0) + 1
    await load()
  }
}
watch(() => [props.parent, props.items], load, { immediate: true, deep: true })
watch(() => relations.value.map((item) => revisions?.[item.name] ?? 0).join(','), load)
defineExpose({ refresh: load, relations })
</script>
<template>
  <section :aria-busy="loading">
    <p v-if="loading && !relations.length">加载关联模型…</p>
    <ElAlert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
    />
    <ElTabs
      v-if="relations.length"
      v-model="active"
      type="border-card"
    >
      <ElTabPane
        v-for="item in relations"
        :key="item.key"
        :name="item.key"
        :label="item.label"
        lazy
      >
        <ElAlert
          v-if="item.error"
          :title="item.error"
          type="error"
          :closable="false"
        />
        <component
          v-else-if="item.view"
          :is="item.view"
          v-bind="item"
          :parent="parent"
          :app-model="item.name"
          :mobile="mobile"
        />
        <template v-else>
          <ElButton
            v-if="item.multipleField"
            :disabled="saving"
            @click="beginAdd(item)"
            >添加已有{{ item.label }}</ElButton
          >
          <ModelTable
            :key="`${item.key}:${generation}`"
            :app-model="item.name"
            :items="item.items"
            :base-queries="item.baseQueries"
            :mobile="mobile"
            create-mode="event"
            :row-actions="
              item.multipleField
                ? [
                    {
                      name: 'remove-relation',
                      label: '移出关联',
                      do: ({ row }) => remove(item, row),
                    },
                  ]
                : undefined
            "
            @edit="emit('edit', { appModel: item.name, row: $event })"
            @create="creating = item"
          />
        </template>
      </ElTabPane>
    </ElTabs>
    <ElDialog
      :model-value="Boolean(adding)"
      title="添加已有记录"
      @close="adding = undefined"
    >
      <ModelSelect
        v-if="adding"
        v-model="selection"
        :app-model="adding.name"
        :field="{ multiple: true, label: adding.label }"
      />
      <template #footer
        ><ElButton
          :loading="saving"
          :disabled="!selection.length"
          @click="addSelected"
          >添加关联</ElButton
        ></template
      >
    </ElDialog>
    <ElDrawer
      :model-value="Boolean(creating)"
      :title="`新增${creating?.label || ''}`"
      :size="mobile ? '100%' : '66%'"
      destroy-on-close
      @close="creating = undefined"
    >
      <ModelForm
        v-if="creating"
        :app-model="creating.name"
        :defaults="creating.defaults"
        :mobile="mobile"
        @form-posted="saved(creating, $event)"
      />
    </ElDrawer>
  </section>
</template>
