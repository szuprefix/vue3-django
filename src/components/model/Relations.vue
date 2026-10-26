<script setup>
import { computed, ref, shallowRef, watch, markRaw, nextTick } from 'vue'
import { ElTabs, ElTabPane, ElAlert, ElButton, ElDialog, ElDrawer } from 'element-plus'
import ModelTable from './Table.vue'
import ModelForm from './Form.vue'
import { useDjango } from '../../composables/context.js'
import { resolveRelation, relationIds } from '../../core/relations.js'
const props = defineProps({
  parent: { type: Object, required: true },
  items: Array,
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
// Keep query identity stable when selection/loading events re-render the dialog.
const selectionQueries = computed(() => adding.value?.selectionQueries ?? {})
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
async function addSelected({ table, scope }) {
  const item = adding.value
  saving.value = true
  error.value = ''
  try {
    const rows = await table.resolveSelection(scope)
    const idField = item.model.config.idField || 'id'
    const ids = rows.map((row) => row[idField])
    saving.value = false
    return await updateMembership(item, [
      ...new Set([...relationIds(props.parent.data[item.multipleField.name]), ...ids]),
    ])
  } catch (cause) {
    error.value = cause.message
    emit('error', cause)
  } finally {
    saving.value = false
  }
}
const selectionActions = computed(() => [
  {
    name: 'add-relation',
    label: '添加关联',
    type: 'primary',
    disabled: saving.value,
    do: addSelected,
  },
])
function selectRows(rows) {
  const idField = adding.value?.model.config.idField || 'id'
  selection.value = rows.map((row) => row[idField])
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
        />
        <template v-else>
          <ElButton
            v-if="item.multipleField"
            :disabled="saving"
            @click="beginAdd(item)"
          >
            添加已有{{ item.label }}
          </ElButton>
          <ModelTable
            :key="`${item.key}:${generation}`"
            :app-model="item.name"
            :parent="parent"
            :items="item.items"
            :base-queries="item.baseQueries"
            create-mode="event"
            :row-actions="
              item.multipleField
                ? [
                    'edit',
                    [
                      {
                        name: 'remove-relation',
                        label: '移除',
                        icon: 'trash',
                        do: ({ row }) => remove(item, row),
                      },
                    ],
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
      :title="`添加已有${adding?.label || '记录'}`"
      width="90%"
      destroy-on-close
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
      :show-close="!saving"
      @close="adding = undefined"
    >
      <p>
        勾选记录后，可选择“选中”“全部”或“其余”。全部和其余以当前搜索条件为范围，已有关联会自动合并。
      </p>
      <ElAlert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
      />
      <ModelTable
        v-if="adding"
        :key="adding.key"
        :app-model="adding.name"
        :items="adding.items"
        :search-items="adding.searchItems"
        :base-queries="selectionQueries"
        :top-actions="['refresh']"
        :row-actions="[]"
        :batch-actions="selectionActions"
        dbl-click-action=""
        selection
        @selection-change="selectRows"
        @loaded="selection = []"
        @error="error = $event.message"
      />
      <template #footer>
        <span>已选 {{ selection.length }} 条（当前页）</span>
        <ElButton
          :disabled="saving"
          @click="adding = undefined"
        >
          取消
        </ElButton>
      </template>
    </ElDialog>
    <ElDrawer
      :model-value="Boolean(creating)"
      :title="`新增${creating?.label || ''}`"
      size="66%"
      destroy-on-close
      @close="creating = undefined"
    >
      <ModelForm
        v-if="creating"
        :app-model="creating.name"
        :defaults="creating.defaults"
        @form-posted="saved(creating, $event)"
      />
    </ElDrawer>
  </section>
</template>
