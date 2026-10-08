<script setup>
import { RouterView } from 'vue-router'
defineOptions({ name: 'App' })
</script>

<template>
  <div
    class="demo-app"
    v-cloak
  >
    <RouterView />
  </div>
</template>

<style>
[v-cloak] {
  display: none;
}
body {
  margin: 0;
  background: white;
  color: #253447;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}
</style>
