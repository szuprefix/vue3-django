<script setup>
import { watch } from 'vue'
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
  rowKey: { type: String, default: 'id' },
  mobile: Boolean,
  showEdit: Boolean,
  actions: Array,
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
])
const { registry } = useDjango()
const state = useRemoteTable({
  request: async (queries) => {
    if (props.request) return props.request(queries)
    if (!props.url) throw new Error('RemoteTable 需要 request 或 url')
    return (await (props.http ?? registry.http).get(props.url, { params: queries })).data
  },
  baseQueries: () => props.baseQueries,
  pageSize: () => props.pageSize,
  onLoaded: (result) => emit('loaded', result),
  onError: (error) => emit('error', error),
})
const { rows, count, page, loading, error } = state
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
    <Table
      v-else
      :rows="rows"
      :fields="fields"
      :row-key="rowKey"
      :mobile="mobile"
      :show-edit="showEdit"
      :actions="actions"
      @edit="emit('edit', $event)"
      @row-action="(action, row) => emit('row-action', action, row)"
      @row-dblclick="(row, column, event) => emit('row-dblclick', row, column, event)"
      @field-change="emit('field-change', $event)"
      @sort-change="state.sort"
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
    <template v-if="showPager && !loading">
      <Pagination
        v-if="mobile"
        :model-value="page"
        :total-items="count"
        :items-per-page="pageSize"
        @update:model-value="state.changePage"
      />
      <ElPagination
        v-else
        :current-page="page"
        :total="count"
        :page-size="pageSize"
        layout="total, prev, pager, next"
        @update:current-page="state.changePage"
      />
    </template>
  </section>
</template>
