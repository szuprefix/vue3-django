<script setup>
import { computed, inject, ref, watch } from 'vue'
import { RouterLink, routerKey } from 'vue-router'
import { useDjango } from '../../composables/context.js'
import { loadContentTypes } from '../../core/content-types.js'

const props = defineProps({
  value: [String, Number, Object],
  field: { type: Object, default: () => ({}) },
  context: Object,
})
const emit = defineEmits(['error'])
const { registry } = useDjango()
const router = inject(routerKey, null)
const mapping = ref({})
const row = computed(
  () =>
    props.context?.row ??
    props.context ??
    (typeof props.value === 'object' ? props.value : {}) ??
    {},
)
const contentTypeId = computed(() => row.value[props.field.contentTypeIdField ?? 'content_type'])
const objectId = computed(() => row.value[props.field.objectIdField ?? 'object_id'])
const modelName = computed(() => mapping.value[contentTypeId.value])
const config = computed(() => registry.configs[modelName.value])
const label = computed(() => {
  if (config.value && objectId.value != null && objectId.value !== '') {
    return `${config.value.verbose_name ?? modelName.value}:${objectId.value}`
  }
  const value =
    row.value[props.field.labelField ?? props.field.name] ??
    (typeof props.value === 'object' ? null : props.value)
  return value == null || value === '' ? '—' : String(value)
})
const target = computed(() => {
  const id = objectId.value
  if (
    !router ||
    !config.value ||
    props.field.showLink === false ||
    id == null ||
    id === '' ||
    typeof id === 'object'
  )
    return null
  const name = `${modelName.value.replace('.', '-')}-edit`
  if (router.hasRoute(name)) return { name, params: { id } }
  const path = `/${modelName.value.replace('.', '/')}/${encodeURIComponent(id)}/`
  const resolved = router.resolve(path)
  if (
    !resolved.matched.length ||
    resolved.matched.some((record) => record.path.includes(':pathMatch'))
  )
    return null
  return { path }
})
watch(
  contentTypeId,
  async (id) => {
    if (id == null || id === '') return
    try {
      mapping.value = await loadContentTypes(registry)
    } catch (error) {
      emit('error', error)
    }
  },
  { immediate: true },
)
</script>

<template>
  <RouterLink
    v-if="target"
    :to="target"
    title="点击跳转"
    class="foreignkey-link"
  >
    {{ label }}
  </RouterLink>
  <span v-else>{{ label }}</span>
</template>

<style scoped>
.foreignkey-link {
  color: var(--el-color-primary, #409eff);
  text-decoration: none;
}
.foreignkey-link:hover {
  text-decoration: underline;
}
</style>
