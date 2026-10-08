import { createRouter, createWebHashHistory } from 'vue-router'
import List from './views/List.vue'
import Create from './views/Create.vue'

export function createMobileRouter(history = createWebHashHistory()) {
  return createRouter({
    history,
    routes: [
      { path: '/', component: List, meta: { title: '任务' } },
      { path: '/new/', component: Create, meta: { title: '新增任务' } },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
  })
}
