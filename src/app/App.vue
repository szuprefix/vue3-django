<script setup>
import { RouterView } from 'vue-router'
defineOptions({ name: 'DjangoApp' })
</script>

<template>
  <div
    class="vd-app"
    v-cloak
  >
    <RouterView />
  </div>
</template>

<style>
body:has(.vd-app) {
  margin: var(--vd-body-margin, 0);
}
.vd-app[v-cloak] {
  display: none;
}
.vd-app {
  color: var(--vd-text-color, #253447);
  background: var(--vd-background, white);
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}
.vd-app .vd-model-page {
  width: 100%;
  box-sizing: border-box;
  padding: var(--vd-page-padding, 0 4px 12px);
}
</style>
