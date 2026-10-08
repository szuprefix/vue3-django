<script setup>
import { computed, provide, ref } from 'vue'
import { useRoute, useRouter, RouterView, RouterLink } from 'vue-router'
import { ElButton, ElDropdown, ElDropdownMenu, ElDropdownItem, ElMessageBox } from 'element-plus'
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
  changePasswordPath: { type: String, default: '/auth/change_password/' },
})
const emit = defineEmits(['logout', 'action-done', 'error'])
const route = useRoute(),
  opened = ref(false),
  tabs = ref()
const router = useRouter()
const accountName = computed(
  () => props.user?.name || props.user?.username || props.user?.email || '用户',
)
const passwordAvailable = computed(() => {
  if (!props.changePasswordPath) return false
  const matched = router.resolve(props.changePasswordPath).matched
  return matched.length > 0 && !matched.some((item) => item.path.includes(':pathMatch'))
})
async function accountCommand(command) {
  try {
    if (command === 'logout') {
      await ElMessageBox.confirm('确定要退出登录吗？', '退出登录', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      })
      emit('logout')
    } else if (command === 'password' && passwordAvailable.value) {
      await router.push(props.changePasswordPath)
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') emit('error', error)
  }
}
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
      >
        菜单
      </ElButton>
      <RouterLink
        to="/"
        class="layout-brand"
      >
        {{ title }}
      </RouterLink>
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
        <slot
          name="account"
          :user="user"
          :name="accountName"
        >
          <ElDropdown
            v-if="user"
            trigger="click"
            placement="bottom-end"
            @command="accountCommand"
          >
            <ElButton
              class="account-trigger"
              text
              :aria-label="`${accountName}，帐号菜单`"
            >
              <span class="account-name">{{ accountName }}</span>
              <span
                class="account-arrow"
                aria-hidden="true"
              >
                ⌄
              </span>
            </ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="logout">退出登录</ElDropdownItem>
                <ElDropdownItem
                  command="password"
                  :disabled="!passwordAvailable"
                >
                  修改密码
                </ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </slot>
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
  --vd-header-height: var(--el-component-size);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: white;
  color: #253447;
}
.layout-header {
  min-height: var(--vd-header-height);
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border-bottom: 1px solid #e5eaf0;
}
.layout-brand {
  font-weight: 700;
  color: inherit;
  text-decoration: none;
}
.layout-account {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.account-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: min(240px, 40vw);
}
.account-trigger:focus-visible {
  outline: 2px solid var(--el-color-primary, #409eff);
  outline-offset: -2px;
}
.account-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.account-arrow {
  flex-shrink: 0;
  color: var(--el-text-color-placeholder, #a8abb2);
}
.layout-body {
  display: flex;
  flex: 1;
}
.layout-sidebar {
  width: 190px;
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
  padding-top: 0;
}
.menu-toggle,
.menu-backdrop {
  display: none;
}
.layout-content :deep(.viewtabs) {
  margin: 0 8px;
}
@media (max-width: 768px) {
  .menu-toggle {
    display: inline-flex;
  }
  .layout-header {
    padding: 0 12px;
  }
  .layout-sidebar {
    display: none;
  }
  .layout-sidebar.opened {
    display: block;
    position: fixed;
    top: calc(var(--vd-header-height) + 1px);
    bottom: 0;
    left: 0;
    z-index: 21;
    overflow: auto;
  }
  .menu-backdrop {
    display: block;
    position: fixed;
    inset: calc(var(--vd-header-height) + 1px) 0 0;
    background: #0006;
    border: 0;
    z-index: 20;
  }
  .layout-content :deep(.viewtabs) {
    margin: 0 8px;
  }
}
</style>
