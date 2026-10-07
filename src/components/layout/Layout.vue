<script setup>
import { computed, provide, ref } from 'vue'
import { useRoute, RouterView, RouterLink } from 'vue-router'
import { ElButton } from 'element-plus'
import SideBar from './SideBar.vue'
import ViewTabs from './ViewTabs.vue'
import Drawer from './Drawer.vue'
import Actions from './Actions.vue'
import { DrawerKey } from '../../composables/drawer.js'
const props = defineProps({
  menus: Object,
  title: { type: String, default: 'vue3-django' },
  user: Object,
  actions: Array,
  actionContext: [Object, Function],
  actionMap: Object,
  permissionFunction: Function,
  loadDrawerView: Function,
})
const emit = defineEmits(['logout', 'action-done', 'error'])
const route = useRoute(),
  opened = ref(false),
  tabs = ref()
const drawer = ref()
const drawerApi = {
  open: (options) => drawer.value.open(options),
  close: () => drawer.value.close(),
}
provide(DrawerKey, drawerApi)
const standalone = computed(() => route.meta.layout === 'main')
defineExpose({
  resetTabs: () => tabs.value?.resetTabs(),
  openDrawer: drawerApi.open,
  closeDrawer: drawerApi.close,
})
</script>
<template>
  <RouterView v-if="standalone" />
  <div
    v-else
    class="django-layout"
  >
    <header class="layout-header">
      <ElButton
        class="menu-toggle"
        aria-label="切换导航菜单"
        :aria-expanded="opened"
        @click="opened = !opened"
        >菜单</ElButton
      ><RouterLink
        to="/"
        class="layout-brand"
        >{{ title }}</RouterLink
      >
      <div class="layout-account">
        <slot name="actions">
          <Actions
            :items="actions"
            :context="actionContext"
            :map="actionMap"
            :permission-function="permissionFunction"
            @done="(result, action) => emit('action-done', result, action)"
            @error="emit('error', $event)"
          />
        </slot>
        <span>{{ user?.name || user?.username }}</span
        ><ElButton
          v-if="user"
          @click="$emit('logout')"
          >退出登录</ElButton
        >
      </div>
    </header>
    <div class="layout-body">
      <button
        v-if="opened"
        class="menu-backdrop"
        aria-label="关闭导航菜单"
        @click="opened = false"
      />
      <aside
        class="layout-sidebar"
        :class="{ opened }"
      >
        <SideBar
          :menus="menus"
          @navigate="opened = false"
        />
      </aside>
      <section
        class="layout-content"
        aria-label="工作区"
      >
        <ViewTabs ref="tabs" />
      </section>
    </div>
  </div>
  <Drawer
    ref="drawer"
    :load-view="loadDrawerView"
    @error="emit('error', $event)"
  />
</template>
<style scoped>
.django-layout {
  min-height: 100vh;
  background: #f4f7fa;
  color: #253447;
}
.layout-header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  border-bottom: 1px solid #e5eaf0;
}
.layout-brand {
  font-size: 20px;
  font-weight: 700;
  color: inherit;
  text-decoration: none;
}
.layout-account {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
}
.layout-body {
  display: flex;
  min-height: calc(100vh - 65px);
}
.layout-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: white;
  border-right: 1px solid #e5eaf0;
}
.layout-sidebar :deep(.el-menu) {
  border-right: 0;
}
.layout-content {
  min-width: 0;
  flex: 1;
  padding-top: 20px;
}
.menu-toggle,
.menu-backdrop {
  display: none;
}
.layout-content :deep(main) {
  margin: 24px auto;
}
.layout-content :deep(.viewtabs) {
  margin: 0 20px;
}
@media (max-width: 768px) {
  .menu-toggle {
    display: inline-flex;
  }
  .layout-header {
    padding: 0 12px;
  }
  .layout-brand {
    font-size: 16px;
  }
  .layout-sidebar {
    display: none;
  }
  .layout-sidebar.opened {
    display: block;
    position: fixed;
    top: 65px;
    bottom: 0;
    left: 0;
    z-index: 21;
    overflow: auto;
  }
  .menu-backdrop {
    display: block;
    position: fixed;
    inset: 65px 0 0;
    background: #0006;
    border: 0;
    z-index: 20;
  }
  .layout-content :deep(.viewtabs) {
    margin: 0 8px;
  }
}
</style>
