<script setup>
import { computed, ref, watch } from 'vue'
import { ElButton, ElAlert } from 'element-plus'
import { Search, Button, NoticeBar } from 'vant'
import { useDjango } from '../../composables/context.js'
import { normalizeItems } from '../../core/metadata.js'
import ModelSearch from './Search.vue'
import RemoteTable from '../table/RemoteTable.vue'
import Drawer from '../layout/Drawer.vue'
import ModelCreate from './Create.vue'
const props = defineProps({
  appModel: { type: String, required: true },
  items: [Array, String],
  baseQueries: { type: Object, default: () => ({}) },
  pageSize: { type: Number, default: 10 },
  mobile: Boolean,
  rowActions: Array,
  dblClickAction: String,
  createMode: { type: String, default: 'drawer' },
  createDefaults: Object,
  createDrawerSize: { type: String, default: '66%' },
  searchItems: Array,
  showSearch: { type: Boolean, default: true },
})
const emit = defineEmits([
  'loaded',
  'edit',
  'create',
  'created',
  'error',
  'row-dblclick',
  'field-change',
])
const createDrawer = ref()
const { registry, auth } = useDjango()
const remote = ref()
const fields = ref([]),
  search = ref(''),
  message = ref('')
const views = ref({})
const queries = ref({})
const title = computed(() => registry.getConfig(props.appModel).verbose_name ?? props.appModel)
let generation = 0
async function create() {
  emit('create')
  if (props.createMode === 'event') return
  try {
    await createDrawer.value.open({
      component: ModelCreate,
      title: `创建${title.value}`,
      size: props.mobile ? '100%' : props.createDrawerSize,
      context: {
        appModel: props.appModel,
        defaults: { ...props.baseQueries, ...props.createDefaults },
        mobile: props.mobile,
        onError: (error) => emit('error', error),
      },
      onDone: async (event) => {
        emit('created', event)
        await load()
      },
    })
  } catch (error) {
    message.value = error.message
    emit('error', error)
  }
}
async function request(params) {
  const current = ++generation
  const model = registry.get(props.appModel)
  const [metadata, config] = await Promise.all([model.fields(), model.loadViewsConfig()])
  const result = await model.query({ ...params, ...config.list?.baseQueries, ...props.baseQueries })
  if (current === generation) {
    views.value = config
    fields.value = normalizeItems(
      props.items ?? config.list?.items ?? config.list?.table ?? 'all',
      metadata,
    )
  }
  return result
}
function load() {
  message.value = ''
  return remote.value?.refresh()
}
function onSearch() {
  return filterChanged({ ...queries.value, search: search.value || undefined })
}
function filterChanged(value) {
  queries.value = value
  search.value = value.search || ''
  return remote.value?.search(value)
}
function onRowDblClick(row, column, event) {
  emit('row-dblclick', row, column, event)
  const name = props.dblClickAction ?? views.value.list?.dblClickAction ?? 'edit'
  if (!name) return
  // Interactive controls handle their own navigation and actions.
  if (event?.target?.closest?.('a, button, input, select, textarea, [role="button"]')) return
  if (name === 'edit') emit('edit', row)
  else {
    const action = actions.value.find((item) => item.name === name)
    if (action && (!action.show || action.show({ row }))) rowAction(action, row)
  }
}
async function rowAction(action, row) {
  try {
    const model = registry.get(props.appModel)
    if (typeof action.do === 'function') await action.do({ row, model, registry })
    else if (action.api || action.name)
      await model.doAction(
        action.api || action.name,
        action.context,
        action.method ?? 'post',
        row[model.config.idField ?? 'id'],
      )
    else throw new Error('首轮行操作需要 do 函数或 api 配置')
    await load()
  } catch (error) {
    message.value = error.message
    emit('error', error)
  }
}
const actions = computed(() =>
  (
    props.rowActions ??
    views.value.list?.rowActions ??
    views.value.list?.options?.remoteTable?.rowActions ??
    []
  )
    .filter((action) => {
      if (!action.permission) return true
      const permissions = auth?.state.user?.model_permissions?.[props.appModel]
      return (
        auth?.state.user?.is_superuser ||
        (Array.isArray(permissions) && permissions.includes(action.permission))
      )
    })
    .map((action) => ({
      ...action,
      label: action.label || action.title || action.verbose_name || action.name,
    })),
)
watch(
  () => props.appModel,
  () => {
    generation++
    queries.value = {}
    search.value = ''
    views.value = {}
    fields.value = []
    remote.value?.search({})
  },
)
defineExpose({ refresh: load, load })
</script>
<template>
  <section :aria-busy="remote?.loading">
    <Drawer
      ref="createDrawer"
      @error="emit('error', $event)"
    />
    <div class="vd-toolbar">
      <h2>{{ title }}</h2>
      <Button
        v-if="mobile"
        type="primary"
        size="small"
        @click="create"
      >
        新增
      </Button>
      <ElButton
        v-else
        type="primary"
        @click="create"
      >
        新增
      </ElButton>
    </div>
    <Search
      v-if="mobile && showSearch"
      v-model="search"
      placeholder="搜索记录"
      @search="onSearch"
      @clear="onSearch"
    />
    <ModelSearch
      v-if="!mobile && showSearch"
      :app-model="appModel"
      :items="searchItems"
      :exclude="{ ...views.list?.baseQueries, ...baseQueries }"
      @change="filterChanged"
      @error="message = $event.message"
    />
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
    <RemoteTable
      ref="remote"
      :request="request"
      :base-queries="baseQueries"
      :page-size="pageSize"
      :fields="fields"
      :row-key="registry.getConfig(appModel).idField ?? 'id'"
      :mobile="mobile"
      :actions="actions"
      show-edit
      @loaded="emit('loaded', $event)"
      @error="emit('error', $event)"
      @edit="emit('edit', $event)"
      @row-action="rowAction"
      @row-dblclick="onRowDblClick"
      @field-change="emit('field-change', $event)"
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
    </RemoteTable>
  </section>
</template>
