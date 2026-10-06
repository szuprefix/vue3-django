<script setup>
import { computed, defineComponent, h, provide, shallowReactive, shallowRef, watch } from 'vue'
import { RouterView, routeLocationKey, useRoute, useRouter } from 'vue-router'
import { ElTabs, ElTabPane } from 'element-plus'
import { TabKey } from '../../composables/tab.js'
const props = defineProps({ fallback: { type: String, default: '/' } })
const route = useRoute(),
  router = useRouter(),
  tabs = shallowRef([])
const standalone = computed(() => route.meta.layout === 'main' || route.meta.tabs === false)
const RouteTab = defineComponent({
  props: { tab: { type: Object, required: true } },
  setup(props) {
    const localRoute = shallowReactive({ ...props.tab.to })
    watch(
      () => props.tab.to,
      (value) => Object.assign(localRoute, value),
    )
    provide(routeLocationKey, localRoute)
    provide(TabKey, {
      update({ title, icon }) {
        if (title != null && title !== '') props.tab.title = String(title)
        if (icon !== undefined) props.tab.icon = icon
        props.tab.customTitle = true
      },
    })
    return () =>
      h(
        RouterView,
        { route: props.tab.to },
        {
          default: ({ Component }) => (Component ? h(Component, { tab: props.tab }) : null),
        },
      )
  },
})
function changeRoute(to) {
  if (to.meta.layout === 'main' || to.meta.tabs === false || !to.matched.length) return
  const title = to.meta.title || to.path
  const tab = {
    name: to.path,
    title: to.params.id != null ? `${title} #${to.params.id}` : title,
    icon: to.meta.icon || to.meta.model?.icon,
    to,
  }
  const existing = tabs.value.find((t) => t.name === tab.name)
  if (existing) {
    if (existing.customTitle) tab.title = existing.title
    Object.assign(existing, tab)
  } else tabs.value = [...tabs.value, shallowReactive(tab)]
}
watch(
  () => route.fullPath,
  () => changeRoute({ ...route }),
  { immediate: true },
)
async function tabRemove(name) {
  const index = tabs.value.findIndex((t) => t.name === name)
  if (index < 0) return
  if (route.path === name) {
    const next = tabs.value[index + 1] || tabs.value[index - 1]
    // Keep the final tab when fallback resolves to the same page.
    if (!next && router.resolve(props.fallback).path === name) return
    const result = await router.push(next?.to.fullPath || props.fallback)
    if (result || route.path === name) return
  }
  tabs.value = tabs.value.filter((t) => t.name !== name)
}
function clearTabs() {
  tabs.value = tabs.value.filter((t) => t.name === route.path)
}
function resetTabs() {
  tabs.value = []
}
function select(name) {
  const tab = tabs.value.find((t) => t.name === name)
  if (tab) router.push(tab.to.fullPath)
}
defineExpose({ tabs, tabRemove, clearTabs, resetTabs })
</script>
<template>
  <RouterView v-if="standalone" />
  <ElTabs
    v-else
    :model-value="route.path"
    type="card"
    class="viewtabs"
    @tab-change="select"
    @tab-remove="tabRemove"
  >
    <ElTabPane
      v-for="tab in tabs"
      :key="tab.name"
      :name="tab.name"
      :closable="tabs.length > 1"
    >
      <template #label
        ><component
          v-if="tab.icon && typeof tab.icon !== 'string'"
          :is="tab.icon"
          class="tab-icon"
          aria-hidden="true"
        />
        <i
          v-else-if="tab.icon && /^[a-zA-Z][\w -]*$/.test(tab.icon)"
          :class="tab.icon.includes(' ') ? tab.icon : `fa fa-${tab.icon}`"
          class="tab-icon"
          aria-hidden="true"
        />
        <span
          v-else-if="tab.icon"
          class="tab-icon"
          aria-hidden="true"
          >{{ tab.icon }}</span
        >
        <span :title="tab.title">{{
          tab.title.length > 19 ? `${tab.title.slice(0, 16)}…` : tab.title
        }}</span></template
      >
      <RouteTab :tab="tab" />
    </ElTabPane>
  </ElTabs>
</template>
<style scoped>
.viewtabs {
  margin: 0 24px;
}
.viewtabs :deep(.el-tabs__item) {
  font-size: 0.8rem;
}
.tab-icon {
  width: 1em;
  height: 1em;
  margin-right: 6px;
}
</style>
