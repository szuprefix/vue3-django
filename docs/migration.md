# 业务平稳迁移

旧框架来源：`/Users/denishuang/Documents/workspace/szuprefix/front/exam/dashboard/vue-django`，本次只读分析。

## 保留的理念和约定

模型层 `AppModel`/`Register`、`apps.models`、`app.model`、OPTIONS 元数据、view config、items 字段覆盖、defaults、尾斜杠以及 DRF 错误契约延续。新项目可以继续用 Options API；组件按页面迁移，无需一次重写整个业务。

推荐宿主通过 `createRegistry` 创建实例并用插件注入；旧式单例 `Register` 和 `src/utils/app_model.js` 保留入口。单例用于单应用过渡，多应用/SSR 使用独立 registry。没有注入插件时组件回退单例。

## 第一个页面的操作顺序

1. 复制一个模型的注册配置及 view config 到新业务；不要直接覆盖旧页面。
2. 从实际后端核对 OPTIONS 与 DRF pagination，配置 `baseURL` 和认证。
3. 使用 ModelTable、ModelForm，宿主接管 create/edit 的弹窗或路由；验证查询结果、新增和编辑载荷、字段错误。
4. 用插槽迁移该页面的特殊字段，遇到通用能力再加入框架。
5. 保留旧页面 URL，通过菜单或业务开关切换。上线前用同一个后端做验收，回退时重新打开旧入口，避免自动重发写请求。

## Vue 3 必改项

| 旧版 | 新版 |
| --- | --- |
| Vue.use / Vue.prototype | app.use / app.config.globalProperties |
| value + input | modelValue + update:modelValue |
| .sync | v-model:参数 |
| slot / slot-scope | #slot="scope" |
| $listeners | $attrs 中合并事件 |
| beforeDestroy | beforeUnmount |
| $on/$off 事件总线 | 宿主暂接管保存事件，下一轮引入 scoped 事件机制 |
| 动态 import 模板路径 | 宿主 import.meta.glob 注入 loadViewsConfig |
| element-ui / vux | element-plus / vant |

不是所有原有 config 配置都已实现：batchActions、topActions、string do 路由及复杂字段见迭代计划。不要将旧目录的 src 全量复制后假设已经兼容。
## 路由与登录迁移

`ViewTabs` 接替旧版同名布局组件：按 route.path 去重、使用 meta.title、保留切换前的页面实例和 query/hash，关闭当前页优先选择右侧再选择左侧。
`meta.layout: 'main'` 或 `meta.tabs: false` 的页面独立展示；退出登录调用组件 ref 的 `resetTabs()` 清理页面。ref 还提供 `tabRemove(path)` 与 `clearTabs()`（保留当前页）；旧 bus 的 tab-destroy 可转为调用 tabRemove。
最后一个标签不显示关闭按钮；关闭标签销毁页面实例，刷新不恢复历史标签。组件通过 RouterView 渲染以支持路由 props，并为每个标签提供自己的 useRoute 上下文。

新增 `createAuth({ http, endpoints })` 和 `createDjangoRouter({ routes, auth, history })`，无需引入 Vuex。
认证沿用旧项目的 `auth/user/login/`（POST）、`auth/user/current/`（GET）、`auth/user/logout/`（GET），相对于 HTTP baseURL。
JWT 响应使用 `token.access`，Authorization 为 Bearer，cookie 名保留 `access_token`；无 token 时仍支持 Django session。
登录页路径保留 `/auth/login/`，帐号记忆保留 `auth.username`，不保存密码。
默认 hash 路由可避免现有 Django URLconf 增加 SPA fallback；需要 history 模式时传入 Vue Router history 实例。
路由默认需要登录，公开页面设置 `meta.loginRequired: false`。认证失败（401/403）回跳登录，网络与服务器错误保留原错误。
`genModelRouters(apps, { list, create, edit })` 生成 `/<app>/<model>/`、`/<app>/<model>/add/` 和旧版编辑路径 `/<app>/<model>/:id/`；传单个组件仍可用，该组件通过 mode 区分页面。路由 props 提供 appModel/mode/id，编辑记录按路径各占一个 tab。模型动作、布局和权限菜单迁移尚未覆盖。
真实演示启动：`VITE_REAL_API=true npm run dev -- --port 5173`，列表地址为 `/#/course/category/`，登录地址为 `/#/auth/login/`。
