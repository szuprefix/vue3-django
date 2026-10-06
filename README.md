# vue3-django

继承 `vue-django` 的理念：借鉴 Django Admin 的自动化思想，通过 DRF 元数据和少量业务配置实现前端极简定制。第一轮版本为 0.1.0，提供 Vue 3 + Element Plus + Vant 的模型 CRUD 基础链路。

## 运行

Node >= 22.12，执行：

```sh
npm install
npm run dev
npm test
npm run build
npm run build:demo
```

开发入口是本地演示，使用 Axios adapter 模拟 OPTIONS、分页、POST、PATCH、行操作与 400 错误。数据只在内存保存，刷新重置；不需要访问旧项目或生产后端。切换移动端查看 Vant 表单与列表。输入已有项目名称可验证后端字段错误。

## 接入业务

```js
import { createApp } from 'vue'
import { createHttp, createRegistry, createDjango } from 'vue3-django'
import 'element-plus/dist/index.css'
import 'vant/lib/index.css'
import 'vue3-django/style.css'
import App from './App.vue'

const modules = import.meta.glob('/src/views/**/config.js')
const registry = createRegistry({
  http: createHttp({ baseURL: '/api/' }),
  apps: { crm: { models: { customer: { verbose_name: '客户' } } } },
  loadViewsConfig: async fullName => {
    const load = modules[`/src/views/${fullName.replace('.', '/')}/config.js`]
    return load ? (await load()).default : {}
  },
})
createApp(App).use(createDjango({ registry })).mount('#app')
```

```vue
<script setup>
import { ModelTable, ModelForm } from 'vue3-django'
</script>
<template>
  <ModelTable app-model="crm.customer" @edit="row => console.log(row)" />
  <ModelForm app-model="crm.customer" :id="123" @form-posted="console.log" />
</template>
```

`ModelForm` 不传 `id` 时新增，传入时编辑；`ModelTable` 发出 `create`/`edit`，由宿主决定路由或弹窗。两者传入 `mobile` 切换 Vant；表单支持 `v-model`、`defaults`、`items`，暴露 `load()`/`submit()`；列表暴露 `refresh()`。保存事件保留 `{ model, data, intent }`。

业务 `src/views/crm/customer/config.js` 保留旧式声明：

```js
export default {
  list: {
    items: ['id', 'name', 'is_active'],
    options: { remoteTable: { rowActions: [
      { name: 'disable', label: '禁用', api: 'disable' },
      { name: 'inspect', label: '查看', do: ({ row, model }) => console.log(row, model) },
    ] } },
  },
  form: { items: ['name', { name: 'is_active', label: '启用' }] },
}
```

字段模板来自 OPTIONS，`items` 中的对象覆盖元数据。`create`/`update` 优先于 `form`。自定义字段使用 `#field-name="{ field, value, update }"`，或将 Vue 组件传给字段 `widget`；桌面列表支持 `#column-name="{ row, field }"`。复杂关系、JSON、上传组件应先通过插槽在业务侧提供，后续逐步收敛。

## DRF 约定

- 模型标识 `app.model`；接口相对于 `baseURL` 为 `app/model/`，可通过模型 `url` 覆盖。
- OPTIONS 读取 `actions.LIST` + `actions.POST`，编辑优先读取 `actions.PATCH`，回退 POST；仅标准 DRF OPTIONS 也可以运行。
- 查询保留 `search`、`page`、`page_size` 和业务 `baseQueries`，数组以逗号序列化。首轮分页支持 `count/results`，不分页支持数组；暂不支持 cursor/limit-offset。
- 新增 POST、编辑 PATCH，删除 DELETE；只读和未声明字段不提交。默认假设主键名 `id`，模型 `idField` 可定制列表行键，编辑页由宿主显式传入 `id`。
- choice 保留真实 value 类型；布尔默认值延续旧版 true，可用 OPTIONS `default` 或 `defaults` 覆盖。
- `400` 映射为字段错误和 `non_field_errors`，HTTP 错误保留 `code/msg`，网络错误 code=-1。
- Session 认证保留 `csrftoken`/`X-CSRFToken`，后端需先设置 CSRF cookie；也支持 `http.setAuthToken(token)`，传空值清除 Token。
- 跨域凭证、CORS 与 CSRF trusted origins 由业务环境配置；`createHttp` 可传 Axios 配置。框架不自动获取 CSRF cookie，不写认证信息到持久存储。

这是渐进迁移的第一轮基础，不是旧组件的完整替代。范围、验收和缺口见 [迭代计划](docs/iterations.md)，业务迁移方式见 [迁移指南](docs/migration.md)。
