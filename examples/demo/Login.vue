<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElInput, ElButton, ElAlert } from 'element-plus'
import { useDjango } from '../../src/composables/context.js'
import { safeRedirect } from '../../src/router/index.js'
const { auth } = useDjango()
const router = useRouter(), route = useRoute()
const username = ref(localStorage.getItem('auth.username') || ''), password = ref(''), busy = ref(false), error = ref('')
async function submit() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    await auth.login(username.value, password.value)
    localStorage.setItem('auth.username', username.value)
    password.value = ''
    await router.replace(safeRedirect(route.query.redirect))
  } catch (e) { error.value = e.fields?.non_field_errors || e.msg?.detail || e.message }
  finally { busy.value = false }
}
</script>
<template>
  <main class="login"><h1>登录 vue3-django</h1><form @submit.prevent="submit">
    <ElAlert v-if="error" :title="String(error)" type="error" :closable="false" />
    <label for="username">帐号</label><ElInput id="username" v-model="username" autocomplete="username" required />
    <label for="password">密码</label><ElInput id="password" v-model="password" type="password" autocomplete="current-password" required show-password />
    <ElButton native-type="submit" type="primary" :loading="busy">登录</ElButton>
  </form></main>
</template>
<style scoped>.login{max-width:400px;margin:80px auto;padding:24px}form{display:grid;gap:16px}h1{font-size:24px}</style>
