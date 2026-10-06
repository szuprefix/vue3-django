<script setup>
import { useRouter } from 'vue-router'
import { Layout, genMenusFromApps } from '../../src/index.js'
import { ref, computed } from 'vue'
import { ElButton, ElAlert } from 'element-plus'
import { useDjango } from '../../src/composables/context.js'
const { auth, apps } = useDjango(),
  router = useRouter(),
  error = ref('')
const tabs = ref()
const menus = computed(() => {
  return genMenusFromApps(apps, undefined, auth?.state.user?.model_permissions)
})
async function logout() {
  try {
    await auth.logout()
    tabs.value?.resetTabs()
    await router.replace('/auth/login/')
  } catch (e) {
    error.value = e.message
  }
}
</script>
<template>
  <ElAlert
    v-if="error"
    :title="error"
    type="error"
  /><Layout
    ref="tabs"
    :menus="menus"
    :user="auth?.state.user"
    @logout="logout"
  />
</template>
<style scoped>
.account {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
}
</style>
