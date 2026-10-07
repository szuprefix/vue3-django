<script setup>
import { ref, shallowRef } from 'vue'
import { ElDrawer, ElAlert } from 'element-plus'

const props = defineProps({ loadView: Function })
const emit = defineEmits(['done', 'error', 'closed'])
const visible = ref(false)
const current = shallowRef()
const message = ref('')
let generation = 0

async function open(options = {}) {
  const request = ++generation
  visible.value = false
  current.value = undefined
  message.value = ''
  try {
    let component = options.component
    if (typeof component === 'string') {
      if (!props.loadView) throw new Error('字符串抽屉组件需要配置 loadDrawerView')
      const module = await props.loadView(component)
      component = module.default ?? module
    }
    if (request !== generation) return
    if (!component) throw new Error('抽屉缺少 component')
    const context = Object.fromEntries(
      Object.entries(options.context ?? {}).filter(([key]) => !key.startsWith('$')),
    )
    current.value = {
      ...options,
      component,
      context,
      title: options.title ?? context.title ?? options.label ?? '',
      size: options.size ?? context.size ?? '30%',
    }
    visible.value = true
  } catch (error) {
    if (request !== generation) return
    emit('error', error)
    throw error
  }
}
function close() {
  generation++
  visible.value = false
}
async function done(result) {
  const callback = current.value?.onDone
  close()
  emit('done', result)
  try {
    await callback?.(result)
  } catch (error) {
    message.value = error.message
    emit('error', error)
  }
}
function closed() {
  if (!visible.value) current.value = undefined
  emit('closed')
}
defineExpose({ open, onOpen: open, close })
</script>

<template>
  <ElAlert
    v-if="message"
    :title="message"
    type="error"
  />
  <ElDrawer
    v-model="visible"
    v-bind="$attrs"
    :title="current?.title"
    :size="current?.size ?? '30%'"
    :direction="current?.direction ?? 'rtl'"
    :before-close="current?.beforeClose"
    @closed="closed"
  >
    <component
      v-if="current"
      :is="current.component"
      v-bind="current.context"
      @done="done"
    />
  </ElDrawer>
</template>
