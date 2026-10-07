# 平台无关的媒体上传

`VideoCover` 与原版一样用于展示已有封面，不截取视频帧，也不上传。
表格传 value/modelValue 整行对象，按 field.name 读取 URL；表单或单独使用可传 URL 标量。
可使用组件 widget 或字符串 `'VideoCover'`，支持 width/height（数字像素或 CSS 字符串）、
lazy、fit 和图片预览；旧版 fit=true 映射为 contain，preview=false 禁用预览。
空值显示“暂无封面”，加载失败有占位提示；预览挂载到 body，避免被表格/抽屉裁切。

前端控件不感知 bucket/vendor，后端根据用途、租户及配置选择存储平台。
当前实现为浏览器单次 PUT 或 POST 表单直传，可适配后端为 S3/OSS/COS 等生成的签名计划。
不包含这些平台的 Django SDK 适配器，也不包含分片、断点续传或视频转码。

## 接入

```js
import { createDjango, createUploadService } from 'vue3-django'

const uploadService = createUploadService({
  http: registry.http,
  initUrl: 'media/upload/init/',
  completeUrl: 'media/upload/complete/',
})
app.use(createDjango({ registry, uploadService }))
```

```js
export default {
  form: {
    items: [
      {
        name: 'cover',
        widget: 'ImageUpload',
        limit: 1,
        maxSize: 5 * 1024 * 1024,
        purpose: 'course-cover',
      },
      { name: 'attachments', widget: 'FileUpload', multiple: true, limit: 5 },
    ],
  },
}
```

也可直接导入 ImageUpload/FileUpload 作为 widget。ImageInput/FileInput 字符串作为别名兼容。
单值为 URL 或 null，多值为 URL 数组，保持旧业务字段结构。字段需有对应的 DRF 元数据，才能提交。
可配置 accept、disabled、limit、maxSize（字节）、purpose、uploadContext。
可通过组件 service、字段 uploadService 或 Django context uploadService 注入服务。
宿主可提供自定义 `upload(file, { purpose, context, signal, onProgress })` 服务。

控件支持本地图片预览、上传进度、取消、重试；取消或失败不会发布新的表单值。
上传进度到 95% 后等待后端确认，确认成功发布稳定 URL，进度达到 100%。
Form 上传期间阻止提交并禁用默认提交按钮，上传错误转为字段错误。
success 返回后端完整媒体结果；uploading 返回布尔值。自定义字段插槽需自行接入上传状态。
移除只修改表单值，不删除对象；取消/失败可能留下对象，由后端清理未绑定上传。

## Django 接口协议（需要后端实现）

init 接收：

```json
{
  "name": "cover.jpg",
  "size": 12345,
  "contentType": "image/jpeg",
  "purpose": "course-cover",
  "context": {}
}
```

返回 PUT 上传计划：

```json
{
  "uploadId": "opaque-upload-id",
  "method": "PUT",
  "url": "https://storage.example/signed-upload-url",
  "headers": { "Content-Type": "image/jpeg" }
}
```

POST 表单计划用 method=POST，fields 为签名表单字段，fileField 默认为 file。
POST 不应返回 Content-Type header，multipart boundary 由浏览器生成。
直传使用独立 XMLHttpRequest，不沿用应用 Authorization、CSRF 或跨站 cookie；禁止计划携带这些请求头。
进度支持、超时和 AbortSignal 由直传 transport 处理，init/complete 通过业务 http 接收同一个 signal。

complete 接收 `{ "uploadId": "opaque-upload-id" }`，返回：

```json
{ "id": 123, "key": "tenant/media/unique-key.jpg", "url": "/media/assets/123/" }
```

url 必须为稳定业务访问地址，不是临时上传签名 URL。私有文件使用后端稳定入口鉴权并重定向到临时下载地址。
后端必须：

- 鉴权并校验用途、文件大小、类型和租户权限，不信任前端检查或 context。
- 自行决定 key/bucket/platform，限制签名范围、有效期及覆盖权限；不下发长期密钥。
- 保存 uploadId 与所属用户、目标对象、预期元数据，complete 核验实际对象、归属及大小，必要时执行内容检测。
- complete 幂等；不得仅因浏览器报告上传完成就发布 URL。
- 配置存储 CORS；旧文件继续解析到旧平台，新上传使用新平台，避免批量替换历史 URL。
- 清理未确认、未绑定及无引用文件；业务表单保存失败不应立即删除共享对象。

测试使用模拟签名接口和 transport/XHR，不代表真实云平台已验收。
