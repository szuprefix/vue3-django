<script setup>
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElAlert } from 'element-plus'
import ModelTable from '../../components/model/Table.vue'
import { useDjango } from '../../composables/context.js'

defineOptions({ inheritAttrs: false })
const props = defineProps({ appModel: String, mobile: Boolean, gridComponent: [Object, Function] })
const emit = defineEmits(['loaded', 'created', 'edit', 'error'])
const route = useRoute()
const router = useRouter()
const { registry, revisions } = useDjango()
const appModel = computed(() => props.appModel ?? route.path.split('/').slice(1, 3).join('.'))
const config = shallowRef()
const error = ref('')
const table = ref()
let generation = 0
watch(
  appModel,
  async (name) => {
    const current = ++generation
    config.value = undefined
    error.value = ''
    try {
      const views = await registry.get(name).loadViewsConfig()
      if (current === generation) config.value = views.list ?? {}
    } catch (cause) {
      if (current === generation) {
        error.value = cause.message
        emit('error', cause)
      }
    }
  },
  { immediate: true },
)
watch(
  () => revisions?.[appModel.value],
  () => table.value?.refresh(),
)
onBeforeUnmount(() => generation++)
function edit(row) {
  emit('edit', row)
  const id = row[registry.getConfig(appModel.value).idField ?? 'id']
  return router.push(`/${appModel.value.replace('.', '/')}/${encodeURIComponent(id)}/`)
}
defineExpose({ refresh: () => table.value?.refresh() })
</script>

<template>
  <ElAlert
    v-if="error"
    :title="error"
    type="error"
    :closable="false"
  />
  <component
    class="vd-model-page"
    :is="config.mode === 'grid' && gridComponent ? gridComponent : ModelTable"
    v-else-if="config"
    ref="table"
    v-bind="{ ...config, ...$attrs }"
    :app-model="appModel"
    :mobile="mobile || config.mode === 'grid'"
    @edit="edit"
    @created="emit('created', $event)"
    @loaded="emit('loaded', $event)"
    @error="emit('error', $event)"
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
  </component>
  <p v-else>正在加载列表配置…</p>
</template>
