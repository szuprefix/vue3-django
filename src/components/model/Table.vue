<script setup>
import { computed, ref, watch } from 'vue'
import { ElTable, ElTableColumn, ElButton, ElPagination, ElAlert } from 'element-plus'
import { Cell, CellGroup, Search, Button, Pagination, NoticeBar } from 'vant'
import { useDjango } from '../../composables/context.js'
import { normalizeItems } from '../../core/metadata.js'
import ModelSearch from './Search.vue'
import TableWidget from '../table/Widget.vue'
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
const rows = ref([]),
  fields = ref([]),
  count = ref(0),
  search = ref(''),
  page = ref(1),
  loading = ref(false),
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
async function load() {
  const current = ++generation
  loading.value = true
  message.value = ''
  try {
    const model = registry.get(props.appModel)
    const [metadata, config] = await Promise.all([model.fields(), model.loadViewsConfig()])
    const result = await model.query({
      ...queries.value,
      search: search.value || undefined,
      page: page.value,
      page_size: props.pageSize,
      ...config.list?.baseQueries,
      ...props.baseQueries,
    })
    if (current !== generation) return
    views.value = config
    fields.value = normalizeItems(
      props.items ?? config.list?.items ?? config.list?.table ?? 'all',
      metadata,
    )
    rows.value = Array.isArray(result) ? result : result.results
    count.value = Array.isArray(result) ? result.length : result.count
    if (!Array.isArray(rows.value) || !Number.isFinite(count.value))
      throw new Error('首轮列表需要 DRF PageNumberPagination 的 count/results 或数组响应')
    emit('loaded', result)
  } catch (error) {
    if (current === generation) {
      rows.value = []
      count.value = 0
      message.value = error.message
      emit('error', error)
    }
  } finally {
    if (current === generation) loading.value = false
  }
}
function onSearch() {
  if (page.value !== 1) page.value = 1
  else load()
}
function filterChanged(value) {
  queries.value = value
  search.value = value.search || ''
  onSearch()
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
  () => [props.appModel, props.baseQueries, props.pageSize],
  () => {
    page.value = 1
    load()
  },
  { immediate: true, deep: true },
)
watch(page, load)
defineExpose({ refresh: load, load })
</script>
<template>
  <section :aria-busy="loading">
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
        >新增</Button
      >
      <ElButton
        v-else
        type="primary"
        @click="create"
        >新增</ElButton
      >
    </div>
    <Search
      v-if="mobile"
      v-model="search"
      placeholder="搜索记录"
      @search="onSearch"
      @clear="onSearch"
    />
    <ModelSearch
      v-else
      :app-model="appModel"
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
    <p v-if="loading">加载中…</p>
    <template v-else-if="mobile">
      <p v-if="!rows.length && !message">暂无数据</p>
      <CellGroup
        v-for="row in rows"
        :key="row[registry.getConfig(appModel).idField ?? 'id']"
        inset
        class="vd-card"
      >
        <Cell
          v-for="field in fields"
          :key="field.name"
          :title="field.label || field.name"
        >
          <template #value>
            <slot
              :name="`column-${field.name}`"
              :row="row"
              :field="field"
            >
              <TableWidget
                :value="row"
                :field="field"
                mobile
                @change="emit('field-change', { row, field, value: $event })"
              />
            </slot>
          </template>
        </Cell>
        <Cell
          ><template #value
            ><Button
              size="small"
              @click="emit('edit', row)"
              >编辑</Button
            ><Button
              v-for="action in actions"
              :key="action.name"
              size="small"
              @click="rowAction(action, row)"
              >{{ action.label || action.name }}</Button
            ></template
          ></Cell
        >
      </CellGroup>
      <Pagination
        v-model="page"
        :total-items="count"
        :items-per-page="pageSize"
      />
    </template>
    <template v-else>
      <ElTable
        :data="rows"
        stripe
        @row-dblclick="onRowDblClick"
      >
        <ElTableColumn
          v-for="field in fields"
          :key="field.name"
          :prop="field.name"
          :label="field.label || field.name"
          :width="field.width"
          :min-width="field.minWidth ?? field['min-width'] ?? 120"
          :align="
            field.align ??
            (['integer', 'decimal', 'float', 'number', 'percent'].includes(field.type)
              ? 'right'
              : 'left')
          "
          :fixed="field.fixed"
          :show-overflow-tooltip="field.showOverflowTooltip"
        >
          <template #default="{ row, $index }"
            ><slot
              :name="`column-${field.name}`"
              :row="row"
              :field="field"
              :context="{ row, $index }"
              ><TableWidget
                :value="row"
                :field="field"
                :context="{ row, $index }"
                @change="emit('field-change', { row, field, value: $event })"
              /> </slot
          ></template>
        </ElTableColumn>
        <ElTableColumn
          label="操作"
          min-width="140"
          ><template #default="{ row }"
            ><ElButton
              link
              type="primary"
              @click="emit('edit', row)"
              >编辑</ElButton
            ><ElButton
              v-for="action in actions"
              :key="action.name"
              link
              @click="rowAction(action, row)"
              >{{ action.label || action.name }}</ElButton
            ></template
          ></ElTableColumn
        >
      </ElTable>
      <ElPagination
        v-model:current-page="page"
        :total="count"
        :page-size="pageSize"
        layout="total, prev, pager, next"
      />
    </template>
  </section>
</template>
