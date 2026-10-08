<script setup>
import { useDjango } from '../composables/context.js'
const { application } = useDjango()
</script>

<template>
  <main class="vd-model-page vd-home">
    <h1>Welcome</h1>
    <p>欢迎使用 {{ application.title }}，请从侧边栏选择功能。</p>
  </main>
</template>

<style scoped>
.vd-home {
  padding: var(--vd-home-padding, 24px);
}
h1 {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 500;
}
p {
  margin: 0;
  color: var(--el-text-color-secondary, #909399);
}
</style>
