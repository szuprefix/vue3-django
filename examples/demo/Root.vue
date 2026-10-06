<script setup>
import { useRouter } from 'vue-router'
import { ViewTabs } from '../../src/index.js'
import { ref } from 'vue'
import { ElButton, ElAlert } from 'element-plus'
import { useDjango } from '../../src/composables/context.js'
const { auth } = useDjango(), router = useRouter(), error = ref('')
const tabs = ref()
async function logout() {
  try { await auth.logout(); tabs.value?.resetTabs(); await router.replace('/auth/login/') }
  catch (e) { error.value = e.message }
}
</script>
<template><div v-if="auth?.state.user" class="account">{{ auth.state.user.username }} <ElButton @click="logout">退出登录</ElButton></div><ElAlert v-if="error" :title="error" type="error" /><ViewTabs ref="tabs" /></template>
<style scoped>.account{display:flex;justify-content:flex-end;align-items:center;gap:16px;padding:12px 24px}</style>
