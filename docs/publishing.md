# 自动发布 npm

推送 `v*` 标签会触发 `.github/workflows/publish.yml`，依次校验版本、安装依赖、运行测试、构建、预览打包内容并发布到 npm 的 `latest` 标签。任一步失败都会停止发布。仅支持正式版本，例如 `v0.1.12`；预发布版本会被拒绝。

## 一次性配置

将 workflow 提交并推送到 `szuprefix/vue3-django`，确保仓库启用了 GitHub Actions。

以包维护者身份打开 npm 的 `vue3-django` 包设置，添加 GitHub Actions Trusted Publisher：

| 字段                 | 值                     |
| -------------------- | ---------------------- |
| Organization or user | `szuprefix`            |
| Repository           | `vue3-django`          |
| Workflow filename    | `publish.yml`          |
| Environment name     | 留空                   |
| Allowed actions      | 允许直接 `npm publish` |

使用 GitHub 托管 runner 和 Node.js 24，通过 OIDC 获取发布身份，无需添加 `NPM_TOKEN`。npm CLI 必须至少为 11.5.1。包必须已经存在；如果尚未创建，先由维护者手动完成首次发布，再配置 Trusted Publisher。

参考：[npm Trusted Publishing 文档](https://docs.npmjs.com/trusted-publishers/)。

## 发布新版

先将本次发布的代码提交到 `main`，确认工作区干净，再执行：

```sh
git switch main
git pull --ff-only
npm version patch
git push origin main
git push origin "v$(node -p 'require("./package.json").version')"
```

`npm version patch` 同步更新 `package.json` 和 `package-lock.json`，创建版本提交与 `v版本号` 标签。也可以使用 `npm version minor` 或 `npm version major`。最后一条命令只推送本次版本标签。

在 GitHub Actions 的 **Publish to npm** 查看结果。npm 不允许覆盖已发布版本；已经成功发布后，需递增版本号再次发布。失败且该版本尚未发布时，可在 Actions 中重新运行失败的任务。
