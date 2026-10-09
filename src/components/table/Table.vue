<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { excelFormat as formatExcel, writeExcel } from '../../core/excel.js'
import { ElTable, ElTableColumn, ElButton, ElAlert } from 'element-plus'
import { Cell, CellGroup } from 'vant'
import Actions from '../layout/Actions.vue'
import TableWidget from './Widget.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  fields: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  mobile: Boolean,
  showEdit: Boolean,
  actions: { type: Array, default: () => [] },
  rowActions: Array,
  topActions: { type: Array, default: () => ['download'] },
  title: { type: String, default: '导出数据' },
  excelGetAllData: Function,
  excelFormat: Function,
  excelWriter: { type: Function, default: writeExcel },
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
})
const emit = defineEmits([
  'edit',
  'row-action',
  'row-dblclick',
  'field-change',
  'sort-change',
  'selection-change',
  'action-done',
  'error',
])
function rowContext(row, $index) {
  const extra =
    typeof props.rowActionContext === 'function'
      ? props.rowActionContext({ row, $index })
      : props.rowActionContext
  return { ...extra, row, $index }
}
const legacyActions = computed(() =>
  props.actions.map((action) => ({
    ...action,
    do: action.do ?? (({ row }) => emit('row-action', action, row)),
  })),
)
const exporting = ref(false)
const exportError = ref('')
let exportController
async function dumpExcelData() {
  if (exporting.value) return
  exporting.value = true
  exportError.value = ''
  exportController = new AbortController()
  const signal = exportController.signal
  try {
    const rows = props.excelGetAllData ? await props.excelGetAllData({ signal }) : props.rows
    if (signal.aborted) return
    const data = props.excelFormat ? await props.excelFormat(rows) : formatExcel(rows, props.fields)
    if (signal.aborted) return
    return await props.excelWriter(data, { title: props.title, signal })
  } catch (error) {
    if (error?.name !== 'AbortError' && error !== 'cancel' && error !== 'close') {
      exportError.value = error.message ?? String(error)
      throw error
    }
  } finally {
    exporting.value = false
  }
}
onBeforeUnmount(() => exportController?.abort())
defineExpose({ dumpExcelData, exporting, cancelExport: () => exportController?.abort() })
const resolvedActionMap = computed(() => ({
  download: {
    name: 'download',
    label: '导出 Excel',
    icon: 'download',
    disabled: exporting.value,
    do: dumpExcelData,
  },
  ...props.avairableActions,
  ...props.actionMap,
}))
const actionWidth = computed(() => {
  if (props.actionsColumnWidth != null) return props.actionsColumnWidth
  const width = (items = []) =>
    items.reduce((total, item) => {
      if (Array.isArray(item)) return total + (item.length ? 36 : 0)
      const action = typeof item === 'string' ? resolvedActionMap.value[item] : item
      const label =
        action?.label ??
        action?.title ??
        action?.verbose_name ??
        (typeof item === 'string' ? item : item.name)
      return (
        total +
        (props.actionIconOnly && action?.icon && action.iconOnly !== false
          ? 36
          : Math.max(70, String(label ?? '').length * 14 + 36))
      )
    }, 16)
  return Math.max(
    width(props.topActions),
    width(props.rowActions ?? [...(props.showEdit ? ['edit'] : []), ...props.actions]),
  )
})
</script>
<template>
  <ElAlert
    v-if="exportError"
    :title="exportError"
    type="error"
    @close="exportError = ''"
  />
  <div
    v-if="exporting"
    role="status"
  >
    正在导出 Excel…
    <ElButton @click="exportController?.abort()">取消</ElButton>
  </div>
  <div
    v-if="mobile && topActions?.length"
    class="vd-table-actions"
  >
    <slot name="left" />
    <Actions
      :icon-only="actionIconOnly"
      compact
      :items="topActions"
      :map="resolvedActionMap"
      :context="topActionContext"
      :permission-function="permissionFunction"
      :execute="executeAction"
      @done="(result, action) => emit('action-done', result, action)"
      @error="emit('error', $event)"
    />
    <slot name="right" />
  </div>
  <template v-if="mobile">
    <p v-if="!rows.length">暂无数据</p>
    <CellGroup
      v-for="row in rows"
      :key="row[rowKey]"
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
      <Cell v-if="showEdit || rowActions?.length || actions.length">
        <template #value>
          <Actions
            :icon-only="actionIconOnly"
            compact
            :items="
              rowActions ?? [
                ...(showEdit
                  ? [{ name: 'edit', label: '编辑', icon: 'edit', do: () => emit('edit', row) }]
                  : []),
                ...legacyActions,
              ]
            "
            :map="resolvedActionMap"
            :context="rowContext(row)"
            :permission-function="permissionFunction"
            :execute="executeAction"
            @done="(result, action) => emit('action-done', result, action)"
            @error="emit('error', $event)"
          />
        </template>
      </Cell>
    </CellGroup>
  </template>
  <template v-else>
    <ElTable
      :data="rows"
      stripe
      @row-dblclick="(row, column, event) => emit('row-dblclick', row, column, event)"
      @sort-change="emit('sort-change', $event)"
      @selection-change="emit('selection-change', $event)"
    >
      <ElTableColumn
        v-if="selection"
        type="selection"
        width="44"
      />
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
        :sortable="field.sortable"
        :fixed="field.fixed"
        :show-overflow-tooltip="field.showOverflowTooltip"
      >
        <template #default="{ row, $index }">
          <slot
            :name="`column-${field.name}`"
            :row="row"
            :field="field"
            :context="{ row, $index }"
          >
            <TableWidget
              :value="row"
              :field="field"
              :context="{ row, $index }"
              @change="emit('field-change', { row, field, value: $event })"
            />
          </slot>
        </template>
      </ElTableColumn>
      <ElTableColumn
        v-if="topActions?.length || showEdit || rowActions?.length || actions.length"
        label="操作"
        :min-width="actionWidth"
        align="right"
        fixed="right"
      >
        <template
          v-if="topActions?.length"
          #header
        >
          <Actions
            :icon-only="actionIconOnly"
            compact
            :items="topActions"
            :map="resolvedActionMap"
            :context="topActionContext"
            :permission-function="permissionFunction"
            :execute="executeAction"
            @done="(result, action) => emit('action-done', result, action)"
            @error="emit('error', $event)"
          />
        </template>
        <template #default="{ row, $index }">
          <Actions
            class="vd-row-actions"
            :icon-only="actionIconOnly"
            :class="{ 'hover-show': hoverShow }"
            :items="
              rowActions ?? [
                ...(showEdit
                  ? [{ name: 'edit', label: '编辑', icon: 'edit', do: () => emit('edit', row) }]
                  : []),
                ...legacyActions,
              ]
            "
            :map="resolvedActionMap"
            :context="rowContext(row, $index)"
            :permission-function="permissionFunction"
            :execute="executeAction"
            compact
            @done="(result, action) => emit('action-done', result, action)"
            @error="emit('error', $event)"
          />
        </template>
      </ElTableColumn>
    </ElTable>
  </template>
</template>

<style scoped>
@media (hover: hover) and (pointer: fine) {
  :deep(.vd-row-actions.hover-show) {
    visibility: hidden;
  }
  :deep(.el-table__row:hover .vd-row-actions.hover-show) {
    visibility: visible;
    cursor: pointer;
  }
}
.vd-table-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
