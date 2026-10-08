# vue3-django

继承 `vue-django` 的理念：借鉴 Django Admin 的自动化思想，通过 DRF 元数据和少量业务配置实现前端极简定制。当前版本为 0.1.0，使用 Vue 3 + Element Plus + Vant，渐进迁移模型 CRUD、路由、登录、布局与字段控件。

## 运行

Node >= 22.12，执行：

```sh
npm install
npm run dev
npm test
npm run build
npm run build:demo
```

开发入口是 PC 模型界面的本地演示，使用 Axios adapter 模拟 OPTIONS、分页、POST、PATCH、行操作与 400 错误。数据只在内存保存，刷新重置；不需要访问旧项目或生产后端。输入已有项目名称可验证后端字段错误。

访问 [本地预览](http://127.0.0.1:5173/)。默认 mock 模式提供 demo/crm；真实 API 模式需先启动 Django（默认 `http://127.0.0.1:8000`），再运行：

```sh
VITE_REAL_API=true npm run dev -- --port 5173
```

真实模式登录入口为 `/#/auth/login/`，默认首页为 `/#/home/`，类别列表为 `/#/course/category/`。
Vite 将 `/api` 代理到 Django，包括用于读取元数据的 OPTIONS 请求。
如果端口已占用，请以终端输出的地址为准。

demo 的 `examples/demo/apps.js` 独立维护模型注册配置。真实模式已迁入原 dashboard 的
14 个 app、39 个 model，保留名称、图标、hidden、title_field 和动作配置。
这些配置不代表对应旧业务页面、动作和接口均已迁移或验收；无专用 config.js 的模型使用元数据默认视图。
demo 加载 Font Awesome 4 样式以显示原配置中的图标名称。

## 默认应用入口（推荐）

宿主只需 HTML 中的 `<div id="app"></div>`、下面的 main.js，以及 apps/config 业务配置：

```js
import 'element-plus/dist/index.css'
import 'vant/lib/index.css'
import 'vue3-django/style.css'
import { createDjangoApp } from 'vue3-django'
import apps from './apps.js'

const application = createDjangoApp({
  apps,
  title: '业务工作台',
  apiBaseURL: '/api/',
  configModules: import.meta.glob('./views/**/config.js'),
  viewModules: import.meta.glob('./views/**/*.vue'),
})
application.mount('#app')
```

默认开启真实 API 认证，沿用 auth/user 登录、当前用户与退出接口；无认证的演示项目显式设置 `auth: false`。
首页默认进入 `/home/` 显示 Welcome，在默认布局与 tabs 内呈现；兼容 `/welcome/` 地址。可用 `homePath` 指定其他入口，通过 `components.home` 替换首页组件。
业务视图、关联视图与抽屉视图共享宿主提供的 viewModules，仍优先业务页面、缺失才回退模板。

可覆盖 `http`、`registry`、`auth`、`authOptions`、`router`、`history`、`locale`、`loginPath`、`menus`、`layoutProps`，
通过 `components: { app, layout, login, home }` 替换默认组件，`modelViews` 覆盖模型页面；`routes` 添加布局内业务路由。
返回的 `app`、`router`、`registry`、`auth` 可继续使用，挂载前可调用 `application.app.use(...)` 安装其他插件。
`context` 可注入上传服务等已有扩展，不需要放弃底层 createDjango/createRegistry API。

默认排版提供 `--vd-body-margin`、`--vd-page-padding`、`--vd-text-color`、`--vd-background` CSS 变量。
右上角帐号区采用名称下拉菜单，退出登录需确认；修改密码默认指向 `/auth/change_password/`，未注册该页面时菜单项禁用。可通过 `layoutProps.changePasswordPath` 修改目标路径，单独使用 Layout 时也可用 `account` 插槽覆盖帐号区。
字体图标样式不自动引入：使用旧 Font Awesome 图标名称的宿主需自行安装并加载对应 CSS。

## 当前功能

- `createDjangoApp`：内置默认入口、中文登录、布局和动态模型页，减少宿主框架代码。
- `createDjangoRouter`、`genModelRouters` 与 `createAuth`：hash 路由、登录守卫和旧版认证接口。
- `Layout`、`SideBar`、`ViewTabs`：菜单、独立编辑 path/tab、记录标题与图标。
- `Form`：通用字段、校验、提交与字段错误；登录表单和 `ModelForm` 复用该组件。
- `ModelTable`、`ModelForm`：元数据驱动列表与表单、新建抽屉、行双击编辑和行操作。
- `Table`、`RemoteTable`、`useRemoteTable`：通用展示、远程请求与分页/排序状态，可用于非模型接口。

模型表根据 OPTIONS 的 `actions.SEARCH.ordering_fields` 自动启用远程排序。字段配置 `sortable: false` 可禁用，`sortable: true` 仅排序当前页，`sortable: 'custom'` 向后端发送 ordering（降序加 `-`）。改变排序回到第一页并保留搜索；清除排序时不再发送交互排序参数，恢复后端或固定查询的默认顺序。

- `ModelSearch`、`ModelSelect`、`ModelRelations`：搜索占位符、模型选择与关联视图。
- `Drawer`、`Actions`：动态内容、完成回调、按钮/更多菜单、确认与异步状态。
- `TableWidget`：choices、布尔、数字、日期、外键、图片、视频、JSON、HTML 和自定义渲染。

表格 datetime 默认沿用旧 Date2Now：近期显示“刚刚 / 几分钟前 / 几小时前 / 1天前”，较早记录显示简短日期，悬停显示完整本地时间。`date2now`、`timestamp` 控件使用相同规则；无时区 datetime 按旧项目的北京时间解析，显式时区保留。纯 date 保留 `YYYY-MM-DD`；需要其他格式时使用字段 formatter 覆盖。

- `ImageUpload`、`FileUpload`、`createUploadService`：平台无关的签名直传、后端确认、进度/取消/重试；需接入后端上传接口。

上传控件接入及后端协议见 [媒体上传](docs/uploads.md)。

## 接入业务

```js
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { createHttp, createRegistry, createDjango } from 'vue3-django'
import 'element-plus/dist/index.css'
import 'vant/lib/index.css'
import 'vue3-django/style.css'
import App from './App.vue'

const modules = import.meta.glob('/src/views/**/config.js')
const registry = createRegistry({
  http: createHttp({ baseURL: '/api/' }),
  apps: { crm: { models: { customer: { verbose_name: '客户' } } } },
  loadViewsConfig: async (fullName) => {
    const load = modules[`/src/views/${fullName.replace('.', '/')}/config.js`]
    return load ? (await load()).default : {}
  },
})
createApp(App).use(ElementPlus, { locale: zhCn }).use(createDjango({ registry })).mount('#app')
```

```vue
<script setup>
import { ModelTable, ModelForm } from 'vue3-django'
</script>
<template>
  <ModelTable
    app-model="crm.customer"
    @edit="(row) => console.log(row)"
  />
  <ModelForm
    app-model="crm.customer"
    :id="123"
    @form-posted="console.log"
  />
</template>
```

`ModelForm` 不传 `id` 时新增，传入时编辑。ModelTable、ModelForm 及默认模型页固定使用 PC 控件，不提供 mobile 模式；通用 Table、RemoteTable、Form 仍保留移动能力。
表单支持 `v-model`、`defaults`、`items`，暴露 `load()`/`submit()`；列表暴露 `refresh()`。
保存事件 `form-posted` 保留 `{ model, data, intent }`。

页面层提供 `ModelListView` 与 `ModelEditView`，demo 已使用这两个页面。
`genModelRouters(apps, { modules: import.meta.glob('./views/**/*.vue') })` 通过 `import_or_use_template` 动态加载页面：优先使用宿主的 `views/<app>/<model>/list.vue`、`edit.vue`，不存在时使用内置模板；新增也复用 edit 模板。已有页面的加载错误不会回退。仍可传 `{ list, create, edit }` 覆盖页面组件。
默认 App 只渲染 RouterView，布局由父路由的内置 Root 提供，模型页作为子路由渲染。demo 直接使用内置组件，无需自己的 App.vue、Root.vue、Login.vue；需要定制时通过 components 覆盖。
列表页读取 `config.list` 并传递 `baseQueries` 等配置，处理编辑跳转及 revisions 刷新。
`list.mode: 'grid'` 配合 `gridComponent` 接入宿主专用网格组件；未提供时仍使用 PC 表格（并非旧 ModelGrid 的全部功能）。
编辑页在 ModelForm 的 `bottom` 插槽挂载 `panels`（兼容旧拼写 `pannels`）折叠面板及 relations；面板的 component 接收 parent 模型上下文。
新增页在保存成功后替换为编辑路径，关联区只在已有主键时显示。内置页面需要安装 vue-router，页面 props 支持 appModel、id、mode。

`ModelTable` 的“新增”默认打开 Drawer，宽度 66%。
`createDefaults` 覆盖 `baseQueries` 的新建默认值，`createDrawerSize` 调整桌面宽度。
成功后关闭抽屉、发出 `created`（同 form-posted payload）并刷新列表；失败时保留表单。
`create` 表示点击新增，旧宿主若通过该事件自行导航或打开弹窗，应设置 `create-mode="event"`。
`edit` 仍由宿主处理；默认行双击也触发编辑，可用 `dblClickAction` 配置或空字符串禁用。
表格表头与行操作默认优先使用图标按钮，Tooltip 和 aria-label 保留操作名称；未配置 icon 的动作显示文字，更多菜单内仍保留文字。`actionIconOnly: false` 可恢复图标加文字，单个动作可设置 `iconOnly: false`。
桌面行操作采用紧凑按钮组，更多菜单仅显示箭头，沿用旧版 visibility 规则，仅在记录行悬停时显示；触屏保持常显。`hoverShow: false` 可关闭悬停隐藏，便于键盘操作。`actionsColumnWidth` 可指定操作列宽度（默认根据动作数量与文字估算）。模型表支持在 `list.options.remoteTable.table` 中配置这些选项。

业务 `src/views/crm/customer/config.js` 保留旧式声明：

```js
export default {
  list: {
    items: ['id', 'name', 'is_active'],
    options: {
      remoteTable: {
        rowActions: [
          { name: 'disable', label: '禁用', api: 'disable' },
          { name: 'inspect', label: '查看', do: ({ row, model }) => console.log(row, model) },
        ],
      },
    },
  },
  form: { items: ['name', { name: 'is_active', label: '启用' }] },
}
```

字段模板来自 OPTIONS，`items` 中的对象覆盖元数据。`create`/`update` 优先于 `form`。
自定义字段使用 `#field-name="{ field, value, update }"`，或将 Vue 组件传给字段 `widget`；
桌面和移动列表均支持 `#column-name="{ row, field }"`，插槽优先于内置字段渲染。

列表 `formatter(row, fieldName, fieldValue)` 保留 0、false 和空字符串返回值。
组件 widget 接收整行 value/modelValue、field 和 context；旧函数 widget 使用 `(row, field)` 返回 HTML。
HTML 输出经过 DOMPurify 清理。`useFormWidget: true` 可在单元格使用表单字段控件，
变化发出 `field-change: { row, field, value }`，不会自动保存到 API。

`ModelRelations` 支持外键、多对多及通用关联配置、关联记录的新建抽屉，以及已有记录的添加/移出。
特殊上传控件及未覆盖的复杂业务仍由宿主插槽或自定义组件实现。
字段控件名称与关联配置示例见 [迁移指南](docs/migration.md)。

## 路由、布局与抽屉

宿主通过 `genModelRouters(apps, { list, create, edit })` 指定页面组件，生成列表、`add/` 和 `:id/` 路由；
通过 `createDjangoRouter({ routes, auth })` 启用登录守卫，默认 hash 路由。
公开页面设置 `meta.loginRequired: false`；`meta.layout: 'main'` 页面在 Layout 中独立展示。
demo 的编辑页每条记录使用独立 path/tab，标题优先采用记录 `__str__`，并支持模型 icon。
新建默认不打开 tab，已有 `add/` 页面路径继续兼容。

`genMenusFromApps` 生成菜单，`Layout` 接入菜单、用户、退出事件及可选标题栏 actions。
图标支持 emoji、Vue 组件及 Font Awesome 类名；宿主使用字体图标时需自行加载相应样式。

布局子页面可使用 `useDrawer().open({ component, context, onDone })` 打开抽屉，
内容组件 emit `done(result)` 后关闭并回调。字符串组件需要宿主配置 `loadDrawerView`，
可用 `createDrawerViewLoader(import.meta.glob('./views/**/*.vue'))` 创建加载器。
`Actions` 的函数 `do(context)` 执行业务操作，字符串/组件 `do` 打开抽屉；
嵌套数组项进入“更多”菜单。详细配置见 [迁移指南](docs/migration.md)。

## DRF 约定

- 模型标识 `app.model`；接口相对于 `baseURL` 为 `app/model/`，可通过模型 `url` 覆盖。
- OPTIONS 读取 `actions.LIST` + `actions.POST`，编辑优先读取 `actions.PATCH`，回退 POST；仅标准 DRF OPTIONS 也可以运行。
- 查询保留 `search`、`page`、`page_size` 和业务 `baseQueries`，数组以逗号序列化。首轮分页支持 `count/results`，不分页支持数组；暂不支持 cursor/limit-offset。
- 新增 POST、编辑 PATCH，删除 DELETE；只读和未声明字段不提交。默认假设主键名 `id`，模型 `idField` 可定制列表行键，编辑页由宿主显式传入 `id`。
- choice 保留真实 value 类型；布尔默认值延续旧版 true，可用 OPTIONS `default` 或 `defaults` 覆盖。
- `400` 映射为字段错误和 `non_field_errors`，HTTP 错误保留 `code/msg`，网络错误 code=-1。
- Session 认证保留 `csrftoken`/`X-CSRFToken`，后端需先设置 CSRF cookie；也支持 `http.setAuthToken(token)`，传空值清除 Token。
- 跨域凭证、CORS 与 CSRF trusted origins 由业务环境配置；`createHttp` 可传 Axios 配置，不自动获取 CSRF cookie，也不持久保存 Token。
- 可选 `createAuth` 沿用 `auth/user/login/`、`auth/user/current/`、`auth/user/logout/`；JWT 使用 `token.access` 和 Bearer 请求头，并通过 `access_token` cookie 保留 Token，也支持 Session。demo 登录页可记忆用户名，但不保存密码。

## 尚未覆盖

这仍是渐进迁移版本，不是旧组件的完整替代。旧业务动作页面和批量操作尚未完整迁移；
基础图片/文件上传已实现，云存储签名及确认接口、大文件分片/断点续传、视频转码/VOD 尚未接通；
复杂分组列（subColumns/rows/headerWidget）尚未支持；Date2Now 当前显示完整本地时间，未实现旧版相对时间文案。
测试与构建通过不等于所有真实后端模型、权限和业务动作已经验收。

历史迭代范围见 [迭代计划](docs/iterations.md)，当前接入约定与兼容差异见 [迁移指南](docs/migration.md)。
