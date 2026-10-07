<script setup>
import { computed } from 'vue'
import { ElTable, ElTableColumn } from 'element-plus'
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
  topActions: Array,
  actionMap: Object,
  avairableActions: Object,
  topActionContext: [Object, Function],
  rowActionContext: [Object, Function],
  permissionFunction: Function,
  executeAction: Function,
  selection: Boolean,
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
const resolvedActionMap = computed(() => ({ ...props.avairableActions, ...props.actionMap }))
</script>
<template>
  <div
    v-if="mobile && topActions?.length"
    class="vd-table-actions"
  >
    <slot name="left" />
    <Actions
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
            :items="
              rowActions ?? [
                ...(showEdit ? [{ name: 'edit', label: '编辑', do: () => emit('edit', row) }] : []),
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
        min-width="140"
        align="right"
        fixed="right"
      >
        <template
          v-if="topActions?.length"
          #header
        >
          <Actions
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
            :items="
              rowActions ?? [
                ...(showEdit ? [{ name: 'edit', label: '编辑', do: () => emit('edit', row) }] : []),
                ...legacyActions,
              ]
            "
            :map="resolvedActionMap"
            :context="rowContext(row, $index)"
            :permission-function="permissionFunction"
            :execute="executeAction"
            link
            @done="(result, action) => emit('action-done', result, action)"
            @error="emit('error', $event)"
          />
        </template>
      </ElTableColumn>
    </ElTable>
  </template>
</template>

<style scoped>
.vd-table-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
