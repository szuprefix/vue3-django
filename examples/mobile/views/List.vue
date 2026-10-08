<script setup>
import RemoteTable from '../../../src/components/table/RemoteTable.vue'
import { queryTasks } from '../data.js'
const fields = [
  { name: 'name', label: '任务名称' },
  { name: 'done', label: '已完成', type: 'boolean' },
]
</script>

<template>
  <RemoteTable
    :request="queryTasks"
    :fields="fields"
    :page-size="5"
    :top-actions="[]"
    mobile
  />
</template>
