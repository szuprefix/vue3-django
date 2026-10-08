<script setup>
import { computed, ref, watch } from 'vue'
import { ElAlert, ElPagination } from 'element-plus'
import { NoticeBar, Pagination } from 'vant'
import Table from './Table.vue'
import { useRemoteTable } from '../../composables/remote-table.js'
import { useDjango } from '../../composables/context.js'

const props = defineProps({
  request: Function,
  url: String,
  http: Object,
  fields: { type: Array, default: () => [] },
  baseQueries: { type: Object, default: () => ({}) },
  pageSize: { type: Number, default: 10 },
  pageSizes: { type: Array, default: () => [10, 20, 50, 100] },
  rowKey: { type: String, default: 'id' },
  mobile: Boolean,
  showEdit: Boolean,
  actions: Array,
  rowActions: Array,
  topActions: { type: Array, default: () => ['refresh'] },
  actionMap: Object,
  avairableActions: Object,
  topActionContext: [Object, Function],
  rowActionContext: [Object, Function],
  permissionFunction: Function,
  executeAction: Function,
  selection: Boolean,
  hoverShow: { type: Boolean, default: true },
  actionsColumnWidth: [Number, String],
  actionIconOnly: { type: Boolean, default: true },
  showPager: { type: Boolean, default: true },
})
const emit = defineEmits([
  'loaded',
  'error',
  'edit',
  'row-action',
  'row-dblclick',
  'field-change',
  'selection-change',
  'action-done',
  'sort-change',
])
const { registry } = useDjango()
const currentPageSize = ref(props.pageSize)
const sizeOptions = computed(() =>
  [...new Set([...props.pageSizes, currentPageSize.value])].sort((a, b) => a - b),
)
const state = useRemoteTable({
  request: async (queries) => {
    if (props.request) return props.request(queries)
    if (!props.url) throw new Error('RemoteTable 需要 request 或 url')
    return (await (props.http ?? registry.http).get(props.url, { params: queries })).data
  },
  baseQueries: () => props.baseQueries,
  pageSize: () => currentPageSize.value,
  onLoaded: (result) => emit('loaded', result),
  onError: (error) => emit('error', error),
})
const { rows, count, page, loading, error } = state
const actionMap = computed(() => ({
  refresh: { name: 'refresh', label: '刷新', icon: 'refresh', do: state.refresh },
  ...props.avairableActions,
  ...props.actionMap,
}))
function changePageSize(value) {
  if (currentPageSize.value === value) return
  currentPageSize.value = value
  page.value = 1
  return state.load()
}
function changePage(value) {
  if (page.value !== value) return state.changePage(value)
}
function sortChanged(event) {
  emit('sort-change', event)
  const field = props.fields.find((item) => item.name === event.prop)
  if (field?.sortable !== 'custom') return
  return state.sort(event)
}
watch(
  () => props.pageSize,
  (value) => {
    currentPageSize.value = value
  },
)
watch(
  () => [props.request, props.url, props.baseQueries, props.pageSize],
  () => {
    page.value = 1
    state.load()
  },
  { immediate: true, deep: true },
)
defineExpose(state)
</script>

<template>
  <section :aria-busy="loading">
    <NoticeBar
      v-if="error && mobile"
      :text="error"
    />
    <ElAlert
      v-else-if="error"
      :title="error"
      type="error"
      :closable="false"
    />
    <p v-if="loading">加载中…</p>
    <div v-show="!loading">
      <Table
        :rows="rows"
        :fields="fields"
        :row-key="rowKey"
        :mobile="mobile"
        :show-edit="showEdit"
        :actions="actions"
        :row-actions="rowActions"
        :top-actions="topActions"
        :action-map="actionMap"
        :top-action-context="topActionContext"
        :row-action-context="rowActionContext"
        :permission-function="permissionFunction"
        :execute-action="executeAction"
        :selection="selection"
        :hover-show="hoverShow"
        :actions-column-width="actionsColumnWidth"
        :action-icon-only="actionIconOnly"
        @action-done="(result, action) => emit('action-done', result, action)"
        @error="emit('error', $event)"
        @edit="emit('edit', $event)"
        @row-action="(action, row) => emit('row-action', action, row)"
        @row-dblclick="(row, column, event) => emit('row-dblclick', row, column, event)"
        @field-change="emit('field-change', $event)"
        @sort-change="sortChanged"
        @selection-change="emit('selection-change', $event)"
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
      </Table>
    </div>
    <div
      v-if="showPager"
      class="vd-table-pagination"
      :class="{ 'is-mobile': mobile }"
    >
      <Pagination
        v-if="mobile"
        :model-value="page"
        :total-items="count"
        :items-per-page="currentPageSize"
        @update:model-value="changePage"
      />
      <ElPagination
        v-else
        :current-page="page"
        :total="count"
        :page-size="currentPageSize"
        :page-sizes="sizeOptions"
        :disabled="loading"
        background
        :pager-count="5"
        layout="total, sizes, prev, pager, next, jumper"
        @update:current-page="changePage"
        @update:page-size="changePageSize"
      />
    </div>
  </section>
</template>

<style scoped>
.vd-table-pagination {
  padding: 10px 0 6px;
}
.vd-table-pagination :deep(.el-pagination) {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  row-gap: 8px;
}
.vd-table-pagination.is-mobile {
  padding: 12px 0;
}
@media (max-width: 600px) {
  .vd-table-pagination :deep(.el-pagination__jump) {
    margin-left: 0;
  }
}
</style>
