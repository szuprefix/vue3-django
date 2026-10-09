# vue3-django

面向 Django REST Framework 的 Vue 3 管理后台框架。后端提供字段元数据，前端声明模型和少量页面配置，即可生成列表、表单、路由、菜单与编辑标签页。

核心目标是减少重复的 CRUD 页面代码，同时保留 Vue 组件、插槽和业务路由的定制能力。PC 后台使用 Element Plus；移动端通过独立应用使用通用控件，不与后台布局混合。

## 适合你的项目吗？

适合已有 Django / DRF API，需要多个模型管理页面，并希望统一搜索、编辑、关联和操作体验的内部管理系统。

你仍需提供业务 API、认证与权限校验。框架不生成 Django 后端，也不是拖拽式低代码平台；任意 REST API 不会自动获得全部模型功能，但可以使用 RemoteTable、Form 等通用组件单独接入。

当前为持续完善中的框架。核心前端流程已有自动化测试，接入具体业务前仍需验证真实 API 和权限。版本见 [package.json](package.json)。

## 能力概览

| 能力       | 框架提供                                      | 业务需要提供                       |
| ---------- | --------------------------------------------- | ---------------------------------- |
| 管理后台   | 默认布局、首页、菜单、登录页、路由和多标签页  | 模型注册、认证接口、品牌与页面定制 |
| 模型列表   | 分页、搜索、排序、列控件、双击编辑            | 列表 API、字段与搜索元数据         |
| 模型表单   | 新建抽屉、编辑页、校验、服务端字段错误        | OPTIONS、详情与保存 API            |
| 关联数据   | 外键选择与跳转、多对多、通用关联、关联列表    | 关联模型与配置、相应 API           |
| 操作       | 表头与行操作、批处理、确认、异步状态、抽屉    | 动作逻辑、接口或业务组件           |
| 媒体       | 图片/文件上传、VideoCover、表格图片与视频展示 | 上传签名与确认接口、存储服务       |
| 定制       | 字段配置、插槽、自定义控件、模型页面和路由    | 特殊业务 UI                        |
| 独立移动端 | Vant 示例、通用 Form 和 RemoteTable           | 自有布局与业务数据源               |

ModelTable、ModelForm 和默认模型页面固定使用 PC 控件。通用 Table、RemoteTable、Form 保留移动能力。

## 架构：元数据 + 配置 + 可替换组件

三个层次各司其职：

- **数据层**：HTTP 客户端与模型 registry 负责 OPTIONS、查询和保存，每个应用可使用独立 registry。
- **视图配置**：apps.js 声明模型；每个模型的 config.js 指定列表、表单、搜索和关联的展示方式。字段配置覆盖后端元数据，不要求重新声明所有字段。
- **组件层**：默认页面组合 ModelTable、ModelForm 和布局；模型组件复用 RemoteTable、Form 等通用组件。复杂业务可替换组件，不必放弃整个框架。

默认入口 `createDjangoApp` 组装这些层次；已有 Vue 应用也可只使用 `createRegistry`、`createDjango` 和需要的组件。

## 先体验示例

需要 Node >= 22.12。在仓库根目录运行：

```sh
npm install
npm run dev:dashboard
```

访问终端输出的地址，默认是 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)。dashboard 默认使用内存 mock，不需要 Django；刷新重置数据，输入已有项目名称可体验服务端字段错误。

| 命令                      | 用途                          |
| ------------------------- | ----------------------------- |
| `npm run dev:dashboard`   | PC 示例，默认端口 5173        |
| `npm run dev:mobile`      | 独立移动示例，默认端口 5174   |
| `npm test`                | 单元与组件测试                |
| `npm run build`           | 构建框架到 dist               |
| `npm run build:dashboard` | 构建 PC 示例到 dist-dashboard |
| `npm run build:mobile`    | 构建移动示例到 dist-mobile    |

两个示例在 examples/dashboard、examples/mobile 中，各有入口、路由和 Vite 配置，共享仓库依赖及框架源码。移动示例使用独立内存任务数据，不连接真实 API。`npm run dev` 和 `npm run build:demo` 是 dashboard 的兼容命令。端口被占用时以终端输出为准。

### 使用真实 API

先启动符合下文接口约定的 Django 服务，再启动 dashboard：

```sh
VITE_REAL_API=true npm run dev:dashboard -- --port 5173
```

示例代理将 /api 转发到 http://127.0.0.1:8000，包括 OPTIONS。登录路径为 `/#/auth/login/`，首页为 `/#/home/`，类别列表为 `/#/course/category/`。

真实模式的 apps.js 提供多个业务模型用于接入验证；注册配置不代表所有接口、动作页面和权限已经实现或验收。

## 在新项目中接入

以下示例假设已有 Vue 3 + Vite 项目、Vue 插件配置和 HTML 中的 `<div id="app"></div>`。

安装框架与 peer dependencies；使用本地包时先构建，再通过本地依赖接入：

```sh
npm install vue3-django vue element-plus vant
```

当前框架仍有 Vant 依赖，即使仅使用 PC 控件也需安装；PC 页面不必引入 Vant CSS。使用移动控件时另行加载 `vant/lib/index.css`。

### 1. 注册模型

`src/apps.js`：

```js
export default {
  crm: {
    verbose_name: '客户管理',
    models: {
      customer: {
        verbose_name: '客户',
        title_field: 'name',
      },
    },
  },
}
```

### 2. 启动默认应用

`src/main.js`：

```js
import 'element-plus/dist/index.css'
import 'vue3-django/style.css'
import { createDjangoApp } from 'vue3-django'
import apps from './apps.js'

const application = createDjangoApp({
  apps,
  title: '业务工作台',
  apiBaseURL: '/api/',
  size: 'small',
  configModules: import.meta.glob('./views/**/config.js'),
  viewModules: import.meta.glob('./views/**/*.vue'),
})

application.mount('#app')
```

宿主自行配置开发代理或部署反向代理，让 /api/ 到达后端。默认开启认证；无认证项目可显式设置 `auth: false`。

默认使用中文，控件尺寸由 Element Plus 控制。框架不指定全局尺寸，上例与 dashboard 使用 small；也可选择 default / large。

### 3. 按需配置页面

不提供 config.js 时使用字段元数据生成默认视图。需要限制字段或定制操作时，在 `src/views/crm/customer/config.js` 中声明：

```js
export default {
  list: {
    items: ['id', 'name', 'is_active'],
    pageSize: 20,
    rowActions: [
      {
        name: 'inspect',
        label: '查看',
        icon: 'eye',
        do: ({ row }) => console.log(row),
      },
    ],
  },
  form: {
    items: ['name', { name: 'is_active', label: '启用' }],
  },
}
```

示例字段须与实际后端一致。items 中的对象可覆盖字段属性；create / update 配置优先于 form。

默认生成 /crm/customer/ 列表、/crm/customer/add/ 新增和 /crm/customer/:id/ 编辑路由。列表新增通常使用抽屉，编辑打开独立标签页，标题优先采用记录的 `__str__`，其次为 title_field。

## 如何扩展

- **字段**：使用 formatter、自定义 widget 或字段/列插槽。表格组件 widget 接收整行 value、field 与 context；表单 widget 使用 v-model。HTML 渲染经过 DOMPurify 清理。
- **页面**：在 views/app/model/list.vue 或 edit.vue 提供自己的组件。构建时通过 viewModules 发现，缺少时回退默认模型模板；已有页面加载失败不会被隐藏。
- **路由**：通过 createDjangoApp 的 routes 添加布局内业务页面，例如 `routes: [{ path: '/reports/', component: Reports, meta: { title: '报表' } }]`。自定义页面不会自动出现在模型菜单中，可通过 menus 定制导航。
- **布局**：通过 `components: { app, layout, login, home }` 替换默认组件。首页默认 /home/，显示 Welcome；homePath 可指定其他入口。修改密码需提供业务页面。
- **抽屉**：使用 `useDrawer().open({ component, context, onDone })`，内容组件 emit done 后关闭并回调。字符串路径需要 viewModules 中的对应业务组件，不会回退模型模板。
- **已有应用**：使用 createRegistry / createDjango 注入模型服务，单独挂载 ModelTable、ModelForm；此时编辑导航、认证和布局由宿主管理。
- **服务**：可传入自己的 http、registry、auth，并通过 context 注入上传服务。createDjangoApp 返回 app、router、registry、auth，挂载前可继续安装插件。

默认应用不引入字体图标 CSS。使用 Font Awesome 名称时需自行加载对应样式；也支持 emoji 和 Vue 图标组件。

### 操作与批处理

三种配置用途不同：

| 配置                                                | 位置与用途                           |
| --------------------------------------------------- | ------------------------------------ |
| apps.js 的模型 actions                              | 模型级操作，默认进入表头更多菜单     |
| apps.js 的模型 itemActions / config.list.rowActions | 单条记录操作                         |
| config.list.batchActions                            | 列表上方的勾选批处理，自动显示选择列 |

动作可使用函数 do、抽屉组件或 api。仅有 name、没有 do/api 的模型 actions 会导航到动作页面，需要宿主自行注册路由。前端 permission/show 控制展示，不能替代后端授权。

批处理配置示例：

```js
export default {
  list: {
    batchActions: [
      {
        name: 'disable',
        label: '禁用',
        api: 'batch_disable',
        context: { enable_flag: false },
        notice: '确定禁用这些记录吗？',
      },
    ],
  },
}
```

未勾选时禁用，默认确认后执行。支持选中、全部、其余范围，接口提交 batch_action_ids、scope 和额外 context，查询参数携带当前筛选条件；后端负责按范围执行，成功后刷新并清除选择。

### 搜索、排序与字段展示

搜索条件默认根据 OPTIONS 的 SEARCH 元数据生成，文本确认或失焦后查询，选择控件变化后查询；搜索过滤也需后端实现。

ordering_fields 自动启用远程排序；字段 sortable 为 true 时仅排序当前页，为 custom 时发送 ordering，false 禁用。搜索和远程排序会回到第一页。

表格支持 choices、布尔、数字、日期、外键、图片、视频、JSON 和自定义渲染。datetime 默认显示近期相对时间或简短日期，悬停显示完整时间；纯 date 显示 YYYY-MM-DD。

ForeignKey 指向固定模型；GenericForeignKey 通过 content_type / object_id 映射目标，类型和 ID 字段名可配置。后者需要注册 contenttypes.contenttype 并提供 all/ 接口；未知类型或缺少路由时回退文本。控件自身的 error 事件目前不会由表格逐层转发。

### Excel 导出

Table 默认提供 download 操作，导出传入的 rows；RemoteTable 和 ModelTable 按当前搜索、排序及固定查询条件获取全部记录，不只导出当前页。topActions 可覆盖或隐藏入口，保留 download 即可使用内置功能。

导出文件为 .xlsx，文件名使用 title，模型表默认使用模型名称。按可见字段配置的顺序和 label 导出，保留原始数字、布尔和空值；支持 choices、formatter、嵌套 items、exportFormatter 和 export: false。不会执行单元格 widget 或导出 HTML 样式，文本不会自动转成公式。
excelGetAllData 可覆盖数据来源，excelFormat 可返回二维数组（首行为表头），excelWriter 可替换文件写入。ExcelJS 按需加载。

远程每次请求 maxPageSize 条（默认 1000），分页顺序下载并合并，超出该数量会先提醒数据一致性风险；导出不改变当前列表、分页或选择。支持取消，自定义 request(params, { signal }) 应传递 signal。分页不是后端快照，即使数量没变化也可能重复或漏行；大量记录或强一致性导出建议使用后端导出接口配合 createDownloadService。

## 应用状态管理

createDjangoApp 自动创建并安装应用级 store，通过返回值 application.store、组件中的 useDjangoStore() 或 $store 访问。不依赖 Vuex/Pinia，不共享全局单例，也不重复保存认证状态。

```js
import { useDjangoStore } from 'vue3-django'

// 在组件 setup 中调用。
const store = useDjangoStore()
const user = store.user // computed ref，与 auth.state.user 同步
const menus = store.menus // computed ref，按模型权限生成菜单

store.can('update', 'crm.customer')
store.invalidate('crm.customer') // 通知已打开的模型列表刷新
```

state 管理 apps、application（标题等配置）、party 和 revisions；user、ready、menus 为派生状态。登录、用户查询和退出分别调用 store.login / getUserInfo / logout，委托同一个 auth 实例。
租户信息通过 store.getPartyInfo() 按需读取，默认接口 saas/party/current/；可通过 createDjangoApp 的 storeOptions.partyUrl 覆盖。切换用户或退出会清理租户与模型刷新状态。

store.subscribe((event, store) => ...) 订阅 user-ready、user-logout、party-ready、model-changed，返回取消订阅函数。应用卸载会清理订阅和监听；组件自行订阅时应在卸载时取消。
自组装应用可使用 createDjangoStore({ auth, http, apps, application }) 并 app.use(store)，同时将 store 和 store.state.revisions 传入 createDjango 的 context。默认入口也可传入 store，但须与应用使用同一个 auth 实例。
这里不提供旧 Vuex commit/dispatch 或 Vue 2 事件总线接口；用户数据持久化、业务日志和额外业务状态由宿主按需实现。

## 基础工具与服务

工具按职责拆分：utils 为无框架状态的函数，core 服务显式注入依赖，browser 工具仅在调用时访问 DOM。不会修改 Array.prototype，也不会在导入时发起请求或读写 localStorage。

```js
import { createStorage, createDownloadService, mapConcurrent, arrayDelta } from 'vue3-django'

const cache = createStorage({ namespace: 'dashboard', tenantId: 'school-a', userId: 12 })
cache.set('table-settings', { pageSize: 20 }, { ttl: 86400000 })
const settings = cache.get('table-settings', { pageSize: 10 })

const downloads = createDownloadService({ http: application.registry.http })
await downloads.download('crm/customer/export/', { params: { is_active: true } })

const controller = new AbortController()
const results = await mapConcurrent(
  [1, 2, 3],
  2,
  async (id, index, signal) => {
    const response = await application.registry.http.get(`crm/customer/${id}/`, { signal })
    return response.data
  },
  { signal: controller.signal },
)

const changes = arrayDelta([1, 2], [2, 3]) // { added: [3], removed: [1] }
```

- createStorage 支持 JSON 值、毫秒 TTL 和可注入的 Storage 后端；保留 0/false/空字符串，损坏或过期时返回 fallback。set/remove/clear 返回是否成功，onError 接收错误。clear 只删除当前应用/租户/用户命名空间；配额失败不清空数据。不用于保存密码等敏感数据，切换用户时应创建对应用户的新实例。
- createDownloadService 使用注入的 HTTP 客户端，支持筛选、AbortSignal 和 Content-Disposition 文件名；默认拒绝绝对外部地址，避免意外发送应用认证信息。外部公开下载使用独立无认证客户端并显式设置 allowExternal。save 可替换，saveBlob 可单独使用。
- mapConcurrent 验证正整数并发数，按输入顺序返回结果，不修改输入。默认失败后停止调度，等待已启动任务结束后抛错；settled: true 收集每项结果。取消立即拒绝并停止后续调度，运行中的任务需自行使用传入的 signal。onProgress 接收 completed/total/index。
- arrayEquals 比较嵌套数组（对象按引用比较）；arrayDelta 按值/引用返回去重后的 added/removed，不跟踪对象内部变化。

批量导入、任务 SSE 监听、学习时长和业务日志不包含在这套基础工具中，按业务需求另行接入。

## 后端需要满足什么约定？

默认模型接口相对于 apiBaseURL 为 app/model/，可用模型 url 覆盖。主键默认 id，可通过 idField 定制。

| 请求                  | 约定                                                |
| --------------------- | --------------------------------------------------- |
| OPTIONS app/model/    | actions.POST 字段元数据；可扩展 LIST、PATCH、SEARCH |
| GET app/model/        | 分页返回 count/results，或返回不分页数组            |
| GET app/model/:id/    | 返回记录对象                                        |
| POST app/model/       | 新增，返回保存后的记录                              |
| PATCH app/model/:id/  | 更新，返回保存后的记录                              |
| DELETE app/model/:id/ | 删除                                                |
| HTTP 400              | 字段错误对象，支持 non_field_errors                 |

仅标准 DRF OPTIONS 可用于基础表单与列表；搜索字段、过滤字段和排序候选依赖扩展 SEARCH 元数据或显式前端配置。查询使用 search、page、page_size、ordering；数组以逗号序列化，需后端支持对应过滤方式。当前不支持 cursor / limit-offset 分页。

默认认证接口是 auth/user/login/（POST）、auth/user/current/（GET）、auth/user/logout/（GET），不是 DRF 自动提供的接口，可用 authOptions.endpoints 或自定义 auth 替换。支持 Session 与登录响应 token.access 的 Bearer 认证；后者保留在 access_token cookie 中，不自动刷新 token。

Session 的 CSRF cookie 由后端设置；跨域凭证、CORS 与 CSRF trusted origins 由业务环境配置。前端不会替代后端权限、字段和批处理校验。

## 当前边界

- 特殊业务页面、后端导出和动作接口由宿主实现；框架提供前端表格 Excel 导出，但不自动生成后端业务逻辑。
- 复杂分组列、完整 ModelGrid 和历史 dialog 动作配置尚未实现。
- 上传已实现前端初始化、单次 PUT/POST 直传与后端确认协议；业务需提供签名、确认和对象存储。分片、断点续传、视频转码/VOD 尚未实现。
- 无效或未注册的关联不能自动补成可用业务模型。
- 自动化测试通过不等于真实后端、云存储和所有浏览器交互已经验收。

## 进一步阅读

- [媒体上传](docs/uploads.md)：对象存储协议、上传服务和控件接入。
- [迁移指南与配置参考](docs/migration.md)：详细控件、关联、动作与兼容约定；已有 vue-django 项目可从这里了解迁移差异。
- [迭代记录](docs/iterations.md)：开发过程与历史范围，不作为当前能力清单。
