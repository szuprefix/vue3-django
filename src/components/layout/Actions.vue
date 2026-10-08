<script setup>
import { computed, reactive, ref } from 'vue'
import {
  ElButton,
  ElButtonGroup,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
  ElMessageBox,
  ElTooltip,
} from 'element-plus'
import Icon from '../widgets/Icon.vue'
import { useDrawer } from '../../composables/drawer.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
  context: { type: [Object, Function], default: () => ({}) },
  map: { type: Object, default: () => ({}) },
  permissionFunction: Function,
  execute: Function,
  link: Boolean,
  compact: Boolean,
  iconOnly: Boolean,
  size: { type: String, default: 'small' },
  trigger: { type: String, default: 'hover' },
})
const emit = defineEmits(['done', 'error', 'command'])
const drawer = useDrawer()
const loadingMap = reactive({})
const hoveredAction = ref()
const context = computed(() =>
  typeof props.context === 'function' ? props.context() : props.context,
)
function normalize(item) {
  if (Array.isArray(item)) return item.flatMap((entry) => normalize(entry))
  const name = typeof item === 'string' ? item : item.name
  const action = { ...props.map[name], ...(typeof item === 'string' ? {} : item), name }
  action.label = action.label ?? action.title ?? action.verbose_name ?? name
  return action
}
function allowed(action) {
  return (
    (!action.permission ||
      !props.permissionFunction ||
      props.permissionFunction(action.permission)) &&
    (!action.show || action.show(context.value))
  )
}
const buttons = computed(() =>
  props.items
    .filter((item) => !Array.isArray(item))
    .map(normalize)
    .filter(allowed),
)
const dropdown = computed(() =>
  props.items.filter(Array.isArray).flatMap(normalize).filter(allowed),
)

async function handleCommand(action) {
  if (loadingMap[action.name] || action.disabled || !allowed(action)) return
  loadingMap[action.name] = true
  try {
    const actionContext = context.value
    if (typeof action.confirm === 'function') {
      if ((await action.confirm(action, actionContext)) === false) return
    } else if (action.confirm) {
      await ElMessageBox.confirm(action.notice ?? `确定执行“${action.label}”吗？`, '操作确认', {
        type: 'warning',
      })
    }
    emit('command', action, actionContext)
    if (props.execute || typeof action.do === 'function') {
      const result = props.execute
        ? await props.execute(action, actionContext)
        : await action.do(actionContext)
      // Drawer completion is delivered by its onDone callback, not when it opens.
      if (!(props.execute && (typeof action.do === 'string' || action.component))) {
        emit('done', result, action)
      }
    } else {
      if (!drawer) throw new Error('Actions 的抽屉操作需要放在 Layout 内')
      await drawer.open({
        component: action.do ?? action.component,
        label: action.label,
        context: { ...action.drawer, ...actionContext },
        onDone: async (result) => {
          await action.onDone?.(result)
          emit('done', result, action)
        },
      })
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') emit('error', error, action)
  } finally {
    loadingMap[action.name] = false
  }
}
defineExpose({ handleCommand, loadingMap })
</script>

<template>
  <ElButtonGroup
    v-if="buttons.length || dropdown.length"
    class="vd-actions"
    :class="{ 'is-compact': compact }"
    @mouseleave="hoveredAction = undefined"
  >
    <ElTooltip
      v-for="action in buttons"
      :key="action.name"
      :content="action.title ?? action.label"
      :visible="hoveredAction === action.name"
      :show-after="100"
      :hide-after="0"
      :enterable="false"
      placement="top"
      transition=""
    >
      <ElButton
        :size="action.size ?? size"
        :type="action.type"
        :plain="action.plain"
        :link="link || action.link"
        :disabled="action.disabled"
        :loading="loadingMap[action.name]"
        :aria-label="action.label"
        :class="{ 'vd-action-icon': iconOnly && action.icon && action.iconOnly !== false }"
        @click="handleCommand(action)"
        @mouseenter="hoveredAction = action.name"
        @mouseleave="hoveredAction = undefined"
      >
        <Icon :icon="action.icon" />
        <span v-if="!iconOnly || !action.icon || action.iconOnly === false">
          {{ action.label }}
        </span>
      </ElButton>
    </ElTooltip>
    <ElDropdown
      v-if="dropdown.length"
      :size="size"
      :trigger="trigger"
      :show-timeout="0"
      :hide-timeout="80"
      @command="handleCommand"
    >
      <ElButton
        :size="size"
        aria-label="更多操作"
        :class="{ 'vd-actions-more': compact }"
      >
        <span v-if="!compact">更多</span>
        <span aria-hidden="true">▾</span>
      </ElButton>
      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem
            v-for="action in dropdown"
            :key="action.name"
            :command="action"
            :disabled="action.disabled || loadingMap[action.name]"
            :divided="action.divided"
          >
            <Icon :icon="action.icon" />
            {{ action.label }}
          </ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
  </ElButtonGroup>
</template>

<style scoped>
.vd-actions {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  vertical-align: middle;
}
.vd-actions.is-compact :deep(.el-button) {
  padding: 5px 8px;
}
.vd-actions.is-compact :deep(.el-button + .el-button) {
  margin-left: 0;
}
.vd-actions.is-compact :deep(.el-dropdown) {
  margin-left: 4px;
}
.vd-actions-more {
  border: 0;
  background: transparent;
  padding: 5px 6px !important;
}
.vd-actions :deep(.vd-action-icon) {
  width: 30px;
  padding: 5px;
}
</style>
