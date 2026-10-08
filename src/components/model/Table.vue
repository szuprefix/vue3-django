<script setup>
import { computed, inject, ref, watch } from 'vue'
import { routerKey } from 'vue-router'
import { useDrawer } from '../../composables/drawer.js'
import { ElAlert } from 'element-plus'
import { useDjango } from '../../composables/context.js'
import { normalizeItems } from '../../core/metadata.js'
import Actions from '../layout/Actions.vue'
import BatchActions from '../layout/BatchActions.vue'
import ModelSearch from './Search.vue'
import RemoteTable from '../table/RemoteTable.vue'
import Drawer from '../layout/Drawer.vue'
import ModelCreate from './Create.vue'
const props = defineProps({
  appModel: { type: String, required: true },
  items: [Array, String],
  baseQueries: { type: Object, default: () => ({}) },
  pageSize: { type: Number, default: 10 },
  pageSizes: Array,
  rowActions: Array,
  topActions: Array,
  batchActions: Array,
  actionMap: Object,
  avairableActions: Object,
  permissionFunction: Function,
  parent: Object,
  selection: Boolean,
  hoverShow: { type: Boolean, default: undefined },
  actionsColumnWidth: [Number, String],
  actionIconOnly: { type: Boolean, default: undefined },
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
  'action-done',
  'selection-change',
])
const createDrawer = ref()
const drawer = useDrawer()
const router = inject(routerKey, undefined)
const { registry, auth } = useDjango()
const remote = ref()
const fields = ref([]),
  message = ref('')
const views = ref({})
const searchExclude = computed(() => ({ ...views.value.list?.baseQueries, ...props.baseQueries }))
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
      size: props.createDrawerSize,
      context: {
        appModel: props.appModel,
        defaults: { ...props.baseQueries, ...props.createDefaults },
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
  selectedRows.value = []
  const current = ++generation
  const model = registry.get(props.appModel)
  const [metadata, config, options] = await Promise.all([
    model.fields(),
    model.loadViewsConfig(),
    model.loadOptions?.() ?? {},
  ])
  const result = await model.query({ ...params, ...config.list?.baseQueries, ...props.baseQueries })
  if (current === generation) {
    views.value = config
    const orderingFields = options.actions?.SEARCH?.ordering_fields ?? []
    fields.value = normalizeItems(
      props.items ?? config.list?.items ?? config.list?.table ?? 'all',
      metadata,
    ).map((field) => ({
      ...field,
      sortable: field.sortable ?? (orderingFields.includes(field.name) ? 'custom' : false),
    }))
  }
  return result
}
function load() {
  message.value = ''
  return remote.value?.refresh()
}
function filterChanged(value) {
  queries.value = value
  return remote.value?.search(value)
}
function permitted(permission) {
  if (props.permissionFunction) return props.permissionFunction(permission)
  if (!auth || auth.state.user?.is_superuser) return true
  const values = auth.state.user?.model_permissions?.[props.appModel] ?? []
  return (Array.isArray(permission) ? permission : [permission]).every((name) =>
    values.includes(name),
  )
}
const modelConfig = computed(() => registry.getConfig(props.appModel))
const remoteOptions = computed(() => views.value.list?.options?.remoteTable ?? {})
const actionMap = computed(() => ({
  refresh: { name: 'refresh', label: '刷新', icon: 'refresh', do: load },
  create: { name: 'create', label: '新增', icon: 'plus', permission: 'create', do: create },
  edit: {
    name: 'edit',
    label: '编辑',
    icon: 'edit',
    show: () => ['update', 'partial_update', 'retrieve'].some(permitted),
    do: ({ row }) => emit('edit', row),
  },
  delete: {
    name: 'delete',
    label: '删除',
    icon: 'trash',
    permission: 'destroy',
    type: 'danger',
    confirm: true,
    do: ({ row, model }) => model.destroy(row[model.config.idField ?? 'id']),
  },
  ...Object.fromEntries(
    [...(modelConfig.value.actions ?? []), ...(modelConfig.value.itemActions ?? [])].map(
      (action) => [action.name, { ...action, modelRoute: !action.do && !action.api }],
    ),
  ),
  ...remoteOptions.value.table?.avairableActions,
  ...remoteOptions.value.table?.actionMap,
  ...remoteOptions.value.avairableActions,
  ...remoteOptions.value.actionMap,
  ...props.avairableActions,
  ...props.actionMap,
}))
const topActions = computed(
  () =>
    props.topActions ??
    views.value.list?.topActions ??
    remoteOptions.value.table?.topActions ??
    remoteOptions.value.topActions ?? [
      'refresh',
      'create',
      ...(modelConfig.value.actions?.length
        ? [modelConfig.value.actions.map((action) => action.name)]
        : []),
    ],
)
const rowActions = computed(() => {
  const configured =
    props.rowActions ??
    views.value.list?.rowActions ??
    remoteOptions.value.table?.rowActions ??
    remoteOptions.value.rowActions
  // Preserve the previous list-config convention: custom actions supplement edit.
  if (configured)
    return configured.length &&
      !configured
        .flat(Infinity)
        .some((item) => (typeof item === 'string' ? item : item.name) === 'edit')
      ? ['edit', ...configured]
      : configured
  return ['edit', ...(modelConfig.value.itemActions ?? []).map((action) => action.name), ['delete']]
})
const batchActions = computed(() =>
  (props.batchActions ?? views.value.list?.batchActions ?? remoteOptions.value.batchActions ?? [])
    .map((item) => {
      const name = typeof item === 'string' ? item : item.name
      const action = { ...actionMap.value[name], ...(typeof item === 'string' ? {} : item), name }
      if (!action.do && !action.component) action.permission ??= action.api ?? name
      return action
    })
    .filter(
      (action) =>
        (!action.permission || permitted(action.permission)) &&
        (!action.show || action.show(actionContext())),
    ),
)
async function executeBatchAction(action, context) {
  if (action.do || action.component) return executeAction(action, context)
  const model = context.model
  const result = await registry.http.post(
    `${model.getListUrl()}${action.api ?? action.name}/`,
    {
      batch_action_ids: context.selection.map((row) => row[model.config.idField ?? 'id']),
      ...action.context,
      ...(context.confirmResult && typeof context.confirmResult === 'object'
        ? context.confirmResult
        : {}),
      scope: context.scope,
    },
    { params: { ...views.value.list?.baseQueries, ...props.baseQueries, ...queries.value } },
  )
  await load()
  return result.data
}
function actionContext(scope = {}) {
  return {
    ...scope,
    model: registry.get(props.appModel),
    registry,
    table: tableApi,
    parent: props.parent,
    queries: queries.value,
    selection: selectedRows.value,
    count: remote.value?.count ?? 0,
  }
}
async function navigateAction(action, context) {
  if (!router) throw new Error('模型动作页面需要配置 router')
  const model = context.model
  const path = `/${model.config.app}/${model.config.name}/${context.row ? encodeURIComponent(context.row[model.config.idField ?? 'id']) + '/' : ''}${action.name}/`
  const matched = router.resolve(path).matched
  if (!matched.length || matched.some((route) => route.path.includes(':pathMatch')))
    throw new Error(`模型动作页面未配置：${path}`)
  return router.push(path)
}
async function executeAction(action, context) {
  let result
  if (typeof action.do === 'function') result = await action.do(context)
  else if (action.do || action.component) {
    if (!drawer) throw new Error('抽屉动作需要 Layout')
    await drawer.open({
      component: action.do ?? action.component,
      label: action.label,
      context: { ...action.drawer, ...context },
      onDone: async (value) => {
        await action.onDone?.(value)
        await load()
        emit('action-done', value, action)
      },
    })
    return
  } else if (action.modelRoute) return navigateAction(action, context)
  else
    result = await context.model.doAction(
      action.api ?? action.name,
      action.context,
      action.method ?? 'post',
      context.row?.[context.model.config.idField ?? 'id'],
    )
  if (!['edit', 'create', 'refresh'].includes(action.name)) await load()
  return result
}
function onRowDblClick(row, column, event) {
  emit('row-dblclick', row, column, event)
  const name = props.dblClickAction ?? views.value.list?.dblClickAction ?? 'edit'
  if (!name || event?.target?.closest?.('a, button, input, select, textarea, [role="button"]'))
    return
  const item = rowActions.value
    .flat(Infinity)
    .find((item) => (typeof item === 'string' ? item : item.name) === name)
  if (!item) return
  const action = { ...actionMap.value[name], ...(typeof item === 'object' ? item : {}), name }
  const context = actionContext({ row })
  if (
    (action.permission && !permitted(action.permission)) ||
    (action.show && !action.show(context))
  )
    return
  // Reuse confirmation/loading behavior, including destructive custom double-click actions.
  doubleClickRow.value = row
  commandActions.value?.handleCommand(action)
}
const commandActions = ref()
const doubleClickRow = ref()
const selectedRows = ref([])
function selectionChanged(rows) {
  selectedRows.value = rows
  emit('selection-change', rows)
}
const tableApi = {
  refresh: load,
  load,
  get parent() {
    return props.parent
  },
  get selection() {
    return selectedRows.value
  },
  get queries() {
    return queries.value
  },
}
watch(
  () => props.appModel,
  () => {
    generation++
    queries.value = {}
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
    <Actions
      ref="commandActions"
      :items="[]"
      :context="() => actionContext({ row: doubleClickRow })"
      :execute="executeAction"
      :permission-function="permitted"
      @error="emit('error', $event)"
    />
    <div class="vd-toolbar">
      <h2>{{ title }}</h2>
    </div>
    <ModelSearch
      v-if="showSearch"
      :app-model="appModel"
      :items="searchItems"
      :exclude="searchExclude"
      @change="filterChanged"
      @error="message = $event.message"
    />
    <ElAlert
      v-if="message"
      :title="message"
      type="error"
      :closable="false"
    />
    <BatchActions
      v-if="batchActions.length"
      :items="batchActions"
      :context="actionContext()"
      :permission-function="permitted"
      :execute="executeBatchAction"
      @done="(result, action) => emit('action-done', result, action)"
      @error="emit('error', $event)"
    />
    <RemoteTable
      ref="remote"
      :request="request"
      :base-queries="baseQueries"
      :page-size="pageSize"
      :page-sizes="pageSizes"
      :fields="fields"
      :row-key="registry.getConfig(appModel).idField ?? 'id'"
      :row-actions="rowActions"
      :top-actions="topActions"
      :action-map="actionMap"
      :top-action-context="() => actionContext()"
      :row-action-context="actionContext"
      :permission-function="permitted"
      :execute-action="executeAction"
      :selection="selection || batchActions.length > 0"
      :action-icon-only="
        actionIconOnly ??
        remoteOptions.table?.actionIconOnly ??
        remoteOptions.actionIconOnly ??
        true
      "
      :hover-show="hoverShow ?? remoteOptions.table?.hoverShow ?? remoteOptions.hoverShow ?? true"
      :actions-column-width="
        actionsColumnWidth ??
        remoteOptions.table?.actionsColumnWidth ??
        remoteOptions.actionsColumnWidth
      "
      @selection-change="selectionChanged"
      @action-done="(result, action) => emit('action-done', result, action)"
      @loaded="emit('loaded', $event)"
      @error="emit('error', $event)"
      @edit="emit('edit', $event)"
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
