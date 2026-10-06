<script setup>
import { computed, inject } from 'vue'
import { RouterLink, routerKey } from 'vue-router'
import { useDjango } from '../../composables/context.js'

const props = defineProps({
  value: { type: Object, required: true },
  field: { type: Object, required: true },
  context: Object,
})
const { registry } = useDjango()
const router = inject(routerKey, null)
const modelName = computed(() => props.field.model || props.field.relateModel)
const primaryKey = computed(() => props.value[props.field.keyField || props.field.name])
const label = computed(() => {
  const raw = props.value[`${props.field.name}_name`] ?? props.value[props.field.name]
  const text = typeof props.field.labelFormat === 'function' ? props.field.labelFormat(raw) : raw
  if (text == null || text === '') return '—'
  return Array.isArray(text) ? text.join('、') : String(text)
})
const target = computed(() => {
  if (!router || !registry.configs[modelName.value] || props.field.showLink === false) return null
  const id = primaryKey.value
  if (id == null || id === '' || Array.isArray(id) || typeof id === 'object') return null
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
