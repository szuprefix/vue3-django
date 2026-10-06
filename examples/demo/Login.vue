<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Form } from '../../src/index.js'
import { useDjango } from '../../src/composables/context.js'
import { safeRedirect } from '../../src/router/index.js'
const { auth } = useDjango()
const router = useRouter(),
  route = useRoute()
const values = ref({
  username: localStorage.getItem('auth.username') || '',
  password: '',
})
const items = [
  { name: 'username', label: '帐号', required: true, autocomplete: 'username' },
  {
    name: 'password',
    label: '密码',
    required: true,
    widget: 'password',
    autocomplete: 'current-password',
  },
]
function submit({ formValue }) {
  return auth.login(formValue.username, formValue.password)
}
async function done() {
  localStorage.setItem('auth.username', values.value.username)
  values.value.password = ''
  await router.replace(safeRedirect(route.query.redirect))
}
</script>
<template>
  <main class="login">
    <Form
      v-model="values"
      :items="items"
      :submit="submit"
      submit-name="登录"
      success-info="登录成功"
      one-column
      label-position="top"
      @form-posted="done"
    >
      <template #header><h1>登录 vue3-django</h1></template>
    </Form>
  </main>
</template>
<style scoped>
.login {
  max-width: 400px;
  margin: 80px auto;
  padding: 24px;
}
h1 {
  font-size: 24px;
}
</style>
