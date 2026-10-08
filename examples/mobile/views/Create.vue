<script setup>
import { useRouter } from 'vue-router'
import Form from '../../../src/components/form/Form.vue'
import { createTask } from '../data.js'
const router = useRouter()
const fields = [
  { name: 'name', label: '任务名称', required: true },
  { name: 'done', label: '已完成', type: 'boolean' },
]
const submit = ({ formValue }) => createTask(formValue)
</script>

<template>
  <Form
    :items="fields"
    :submit="submit"
    mobile
    submit-name="创建任务"
    @form-posted="router.push('/')"
  />
</template>
