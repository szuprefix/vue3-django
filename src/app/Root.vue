<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElAlert } from 'element-plus'
import Layout from '../components/layout/Layout.vue'
import { genMenusFromApps } from '../core/menus.js'
import { useDjango } from '../composables/context.js'

const { auth, apps, application } = useDjango()
const router = useRouter()
const layout = ref()
const error = ref('')
const menus = computed(
  () => application.menus ?? genMenusFromApps(apps, undefined, auth?.state.user?.model_permissions),
)
async function logout() {
  try {
    await auth?.logout()
    layout.value?.resetTabs()
    await router.replace(application.loginPath)
  } catch (cause) {
    error.value = cause.message
  }
}
</script>

<template>
  <ElAlert
    v-if="error"
    :title="error"
    type="error"
  />
  <Layout
    ref="layout"
    v-bind="application.layoutProps"
    :title="application.title"
    :menus="menus"
    :user="auth?.state.user"
    @logout="logout"
    @error="error = $event.message"
  />
</template>
