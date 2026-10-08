<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Form from '../components/form/Form.vue'
import { useDjango } from '../composables/context.js'
import { safeRedirect } from '../router/index.js'

const { auth, application } = useDjango()
const router = useRouter()
const route = useRoute()
const values = ref({ username: '', password: '' })
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
  values.value.password = ''
  await router.replace(safeRedirect(route.query.redirect, application.homePath))
}
</script>

<template>
  <main class="vd-login">
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
      <template #header>
        <h1>登录 {{ application.title }}</h1>
      </template>
    </Form>
  </main>
</template>

<style scoped>
.vd-login {
  max-width: 400px;
  margin: 80px auto;
  padding: 24px;
}
h1 {
  font-size: 24px;
}
</style>
