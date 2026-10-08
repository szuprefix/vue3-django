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

| 旧版                    | 新版                                           |
| ----------------------- | ---------------------------------------------- |
| Vue.use / Vue.prototype | app.use / app.config.globalProperties          |
| value + input           | modelValue + update:modelValue                 |
| .sync                   | v-model:参数                                   |
| slot / slot-scope       | #slot="scope"                                  |
| $listeners              | $attrs 中合并事件                              |
| beforeDestroy           | beforeUnmount                                  |
| $on/$off 事件总线       | 宿主暂接管保存事件，下一轮引入 scoped 事件机制 |
| 动态 import 模板路径    | 宿主 import.meta.glob 注入 loadViewsConfig     |
| element-ui / vux        | element-plus / vant                            |

不是所有原有 config 配置都已实现：batchActions 已支持范围选择、接口调用、函数和抽屉动作，旧式 dialog 配置、导出及复杂字段仍需逐项迁移。不要将旧目录的 src 全量复制后假设已经兼容。

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

## ModelTable 字段控件

表格采用组合分层：ModelTable（模型元数据/权限/搜索/新建）→ RemoteTable（请求/分页/排序）→ Table（字段/行展示）。
`useRemoteTable` 管理查询状态，防止迟到响应覆盖当前结果，并在组件销毁后忽略响应。
ModelTable 保持原有 props、loaded/edit/create/created/field-change 事件和 load()/refresh()，列插槽逐层转发。
不再通过继承或隐式 attrs 传递业务动作，通用表格不自动添加模型编辑按钮。

```vue
<RemoteTable
  url="report/summary/"
  :http="http"
  :fields="[
    { name: 'name', label: '名称' },
    { name: 'total', type: 'integer', sortable: 'custom' },
  ]"
  :base-queries="{ status: 'active' }"
  @loaded="onLoaded"
/>
```

也可传 `request(queries)`，返回原始 count/results 对象或数组（不是 Axios response）。
URL 模式通过 http.get 读取 response.data；不传 http 时使用已安装 Django context 的 registry.http。
RemoteTable 暴露 refresh/load/search(queries)/changePage(page)/sort({ prop, order })；搜索和排序重置到第一页。
桌面分页沿用原版 `total, sizes, prev, pager, next, jumper`，带背景按钮；默认 pageSizes 为 10/20/50/100，可配置。
切换每页条数重置到第一页，加载时禁用桌面分页；分页与表格留出间距，窄屏自动换行。
ModelTable 的 pageSize/pageSizes 传递给 RemoteTable，固定使用 Element Plus 分页。
通用 Table 接收 rows/fields/rowKey/actions/mobile/showEdit，不发起数据请求。
列 sortable='custom' 启用远程 ordering；清除排序会移除 ordering 值。
Table 与 RemoteTable 支持 topActions、rowActions、actionMap；ModelTable 也兼容旧拼写 avairableActions 和 list.options.remoteTable.table 配置。旧版导出、middleware、prepare 尚未迁入 RemoteTable。

模型表默认表头操作为刷新、新增，行操作为编辑及删除（删除在更多菜单内）。配置数组支持动作名称、动作对象及嵌套数组（更多菜单），空数组隐藏对应操作。模型 config.actions 与 itemActions 分别加入表头和行操作。动作支持 title/label、icon、permission、show(context)、confirm、disabled 和异步 do(context)，上下文包含 row、model、table、parent、queries；table.selection 可用于宿主自定义选中记录操作。

函数 do 执行成功后刷新列表；字符串 do 或 component 打开 Layout 抽屉，完成后刷新。未提供 do/api 的模型配置动作进入对应动作路由，需要宿主注册该路由。显式 api 动作调用模型 doAction；不会把缺少页面的动作静默改成后端写请求。导出需宿主通过 actionMap 自行提供 download 实现。

ModelSearch 使用紧凑字段宽度并自动换行，不展示搜索/重置按钮。
文本输入在 change（确认或失焦）时查询，清空立即查询；选择及范围控件值变化时查询。
相同查询去重，Enter 可提交；ref 的 reset() 清空全部条件并查询。
`search: { fieldName: { width: 240 } }` 可指定像素宽度，字符串如 `'16rem'` 也支持。
选择控件按 label 长度 + 5rem、最小 8rem；普通/批量输入 10rem，关键词按搜索名称长度、最小 10rem。
数字范围 16rem，日期范围 20rem，日期时间范围 26rem。字段不自动拉伸填满行，窄屏自然换行。
仍使用 placeholder，不增加 item label。

搜索字段按原版 type/model/choices/lookups 推导 widget；无法推导的字段不会自动展示。
支持 boolean、radio、select、modelselect、input、array、numberrange、daterange，并按该顺序排列。
`config.search.字段名.widget` 可显式覆盖；`hidden: true` 可隐藏字段。
`ModelTable` 提供 `searchItems` 指定字段、`showSearch` 隐藏整个搜索区，并自动排除
list.baseQueries 与 props.baseQueries 中固定的字段。独立 ModelSearch 使用 `exclude`（数组或对象）。
范围控件生成 `字段__range` 的逗号分隔值，批量查询生成 `字段__in`。
数字范围允许单边输入，未填边界沿用旧版 0/999999；查询保留 false 与 0。

ModelForm 字段可以显式使用模型选择控件：

```js
import { ModelSelect } from 'vue3-django'

export default {
  form: {
    items: [
      { name: 'category', widget: ModelSelect, model: 'course.category' },
      { name: 'papers', widget: 'ModelSelect', appModel: 'exam.paper', multiple: true },
    ],
  },
}
```

未指定 widget 时，model/relateModel/appModel 自动使用 ModelSelect；
显式配置其它 widget 则优先使用自定义控件。
支持 baseQueries、placeholder、disabled、multiple、multipleLimit、idField 和 selectOptionsFields。
模型由 appModel、relateModel、model 依次解析。选中值为主键或主键数组，远程加载已选记录以回显。
候选标签使用字段/模型 selectOptionsFields 或 **str**/title_field/name/title 的回退。

桌面和移动列表共用 `TableWidget`，`column-字段名` 插槽仍优先于默认渲染。
自动支持 choices、布尔、数值千分位、percent、日期时间、外键、child.children 数组以及嵌套路径。
日期时间当前显示本地完整时间，不复刻旧版 Date2Now 的相对时间文案。

`list.items` 可以配置字符串名称或字段对象：

```js
list: {
  items: [
    'name',
    { name: 'budget', type: 'decimal', align: 'right' },
    { name: 'cover', widget: 'Picture', imageRoot: '/media/' },
    { name: 'detail', widget: 'JsonDisplay', items: ['name', 'status'] },
    { name: 'name', formatter: (row, name, value) => value.toUpperCase() },
  ],
}
```

字符串 widget 支持 ForeignKey、TrueFlag、ChoicesDisplay、Date2Now、Timestamp、
Picture/Image、Avatar、PictureGallery、Video、Html、JsonDisplay、ColorText、TooltipCell、Link/URL、Mobile、Email。
对象 widget 使用 Vue 3 组件，接收整行 `value/modelValue`、`field`、`context: { row, $index }`。
旧函数 widget 沿用 `(row, field)` 返回 HTML，Html 和函数输出经过 DOMPurify 清理；链接限制为安全协议。
formatter 沿用 `(row, fieldName, fieldValue)`，保留 0、false 和空字符串返回值。

`useFormWidget: true` 复用 Form 的字段控件，编辑时发出
`field-change: { row, field, value }`；不会自动修改记录或写入 API，宿主负责保存。
支持 width、minWidth、align、fixed 和 showOverflowTooltip 列配置。
旧版 subColumns、rows 和 headerWidget 尚未迁移，请继续使用自定义列插槽处理复杂单元格。

## Layout Drawer 与 Actions

ModelTable 的“新增”默认在本地 Drawer 展示 ModelForm，不再跳转新建 tab。
模型列表默认 `createDrawerSize="66%"`，不再按 mobile 切换宽度；`createDefaults` 覆盖 baseQueries 的默认字段值。
成功保存后关闭抽屉、emit `created`（与 ModelForm 的 form-posted payload 一致）并刷新当前列表。
失败时保留表单和错误。`create` 事件仍表示点击新增，不表示保存成功。
已有宿主通过 `@create` 打开自定义页面时，请设置 `createMode="event"`，避免同时打开内置抽屉。
demo 编辑继续使用独立路由和 tab，直接访问已有 `/add/` 路由仍兼容。
关联模型的新建抽屉保留关联默认值和多对多保存流程。

`Layout` 内置抽屉，页面组件使用 `useDrawer().open(options)` 或通过布局 ref 的
`openDrawer(options)` 打开，`closeDrawer()` 关闭。独立使用 `Drawer` 时，其 ref 提供
`open/onOpen/close`。不再依赖 Vue 2 的全局 bus `opendrawer`。

```js
const drawer = useDrawer()
await drawer.open({
  component: Editor,
  context: { id: 1, title: '编辑记录', size: '50%' },
  onDone: (result) => refresh(result),
})
```

抽屉内容组件 emit `done(result)` 后关闭并调用 onDone；取消关闭不调用 onDone。
支持 title、size、direction、beforeClose；context 中 `$` 开头的键不传给内容组件。
字符串组件由宿主提供 `loadDrawerView`，可用
`createDrawerViewLoader(import.meta.glob('./views/**/*.vue'))` 创建加载器。
异步加载失败向调用方抛出并 emit error，旧请求不会覆盖后打开的抽屉。

`Actions` 保留原版 items/map/context/permissionFunction/size/trigger：
字符串项从 map 取配置，嵌套数组项进入“更多”菜单，支持 label/title、icon、show(context)、
permission、disabled、confirm/notice 和异步 loading。函数 `do(context)` 执行业务操作；
字符串或组件 `do` 打开抽屉，`drawer` 作为抽屉 context 默认值。
确认函数签名为 `(action, context)`，返回 false 取消；执行失败 emit error，完成 emit done(result, action)。
防止同名操作重复执行。权限函数只控制前端显示，后端仍须检查权限。

```js
const actions = [
  { name: 'refresh', label: '刷新', icon: 'refresh', do: () => refresh() },
  [
    {
      name: 'edit',
      label: '编辑',
      do: 'course/course/Edit',
      drawer: { title: '编辑', size: '50%' },
    },
  ],
]
```

布局 props `actions/actionContext/actionMap/permissionFunction` 配置标题栏操作；
`#actions` 插槽可替换操作区域。布局转发 `action-done(result, action)` 和 `error`。
其他位置也可直接使用 `<Actions>`；抽屉操作需要位于 Layout 子树中。
