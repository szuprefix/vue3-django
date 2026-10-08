<script setup>
import { useRoute, RouterView } from 'vue-router'
import { NavBar, Tabbar, TabbarItem } from 'vant'
const route = useRoute()
</script>

<template>
  <div class="mobile-example">
    <NavBar :title="route.meta.title" />
    <main><RouterView /></main>
    <Tabbar
      route
      safe-area-inset-bottom
    >
      <TabbarItem
        to="/"
        icon="todo-list-o"
      >
        任务
      </TabbarItem>
      <TabbarItem
        to="/new/"
        icon="plus"
      >
        新增
      </TabbarItem>
    </Tabbar>
  </div>
</template>

<style>
body {
  margin: 0;
  background: #f7f8fa;
  font-family: system-ui, sans-serif;
}
.mobile-example {
  max-width: 480px;
  margin: auto;
}
.mobile-example main {
  padding: 12px 0 80px;
}
</style>
