<script setup>
import { computed, ref, watch } from 'vue'
import { ElSelect, ElOption } from 'element-plus'
import Actions from './Actions.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  context: { type: Object, required: true },
  map: Object,
  permissionFunction: Function,
  execute: Function,
})
const emit = defineEmits(['done', 'error'])
const scope = ref('select')
const scopes = computed(() => {
  const selected = props.context.selection?.length ?? 0
  const total = props.context.count ?? 0
  return {
    select: { count: selected, label: `选中${selected}条` },
    all: { count: total, label: `全部${total}条` },
    exclude: {
      count: Math.max(0, total - selected),
      label: `其余${Math.max(0, total - selected)}条`,
    },
  }
})
const context = computed(() => ({
  ...props.context,
  scope: scope.value,
  scopeInfo: scopes.value[scope.value],
}))
const items = computed(() =>
  props.items.map((item) => {
    const name = typeof item === 'string' ? item : item.name
    const action = { ...props.map?.[name], ...(typeof item === 'string' ? {} : item), name }
    return {
      ...action,
      plain: action.plain ?? true,
      disabled: !scopes.value.select.count || !scopes.value[scope.value].count || action.disabled,
      confirm: action.confirm ?? true,
      notice:
        action.notice ??
        `确定要对${scopes.value[scope.value].label}记录执行“${action.label ?? name}”操作吗？`,
    }
  }),
)
watch(
  () => props.context.selection,
  () => {
    scope.value = 'select'
  },
)
</script>

<template>
  <div class="vd-batch-actions">
    <ElSelect
      v-if="scopes.select.count && scopes.exclude.count"
      v-model="scope"
      aria-label="批量操作范围"
      style="width: 8rem"
    >
      <ElOption
        v-for="(value, key) in scopes"
        :key="key"
        :value="key"
        :label="value.label"
      />
    </ElSelect>
    <Actions
      :items="items"
      :context="context"
      :permission-function="permissionFunction"
      :execute="execute"
      compact
      @done="(result, action) => emit('done', result, action)"
      @error="emit('error', $event)"
    />
  </div>
</template>

<style scoped>
.vd-batch-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0;
}
</style>
