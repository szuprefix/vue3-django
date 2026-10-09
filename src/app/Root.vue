<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElAlert } from 'element-plus'
import Layout from '../components/layout/Layout.vue'
import { useDjango } from '../composables/context.js'

const { auth, application, store } = useDjango()
const router = useRouter()
const layout = ref()
const error = ref('')
const menus = computed(() => store.menus.value)
async function logout() {
  try {
    await store.logout()
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
