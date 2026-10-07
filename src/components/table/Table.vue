<script setup>
import { ElTable, ElTableColumn, ElButton } from 'element-plus'
import { Cell, CellGroup, Button } from 'vant'
import TableWidget from './Widget.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  fields: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  mobile: Boolean,
  showEdit: Boolean,
  actions: { type: Array, default: () => [] },
})
const emit = defineEmits([
  'edit',
  'row-action',
  'row-dblclick',
  'field-change',
  'sort-change',
  'selection-change',
])
function visibleActions(row) {
  return props.actions.filter((action) => !action.show || action.show({ row }))
}
</script>
<template>
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
      <Cell>
        <template #value>
          <Button
            v-if="showEdit"
            size="small"
            @click="emit('edit', row)"
          >
            编辑
          </Button>
          <Button
            v-for="action in visibleActions(row)"
            :key="action.name"
            size="small"
            @click="emit('row-action', action, row)"
          >
            {{ action.label || action.name }}
          </Button>
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
        v-if="showEdit || actions.length"
        label="操作"
        min-width="140"
      >
        <template #default="{ row }">
          <ElButton
            v-if="showEdit"
            link
            type="primary"
            @click="emit('edit', row)"
          >
            编辑
          </ElButton>
          <ElButton
            v-for="action in visibleActions(row)"
            :key="action.name"
            link
            @click="emit('row-action', action, row)"
          >
            {{ action.label || action.name }}
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </template>
</template>
