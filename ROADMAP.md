# ROADMAP

> AI 判断项目状态的进度源；保持当前进度快照，按时间倒序更新。

## 当前状态

- 插件中心（本地插件 + 插件商场两个 Tab）已完成实现并通过构建与浏览器回归验证，视觉风格与用户提供的参考图一致，插件数据来自官方收录库（乔木 / joeseesun）与第三方收录区（4 个经核实的社区 DSH 插件）。
- 项目同时是 DSH 插件市场索引源：收录库生成 `format: 1` 标准索引，dev 与构建产物均在 `/index.json` 提供。
- 插件内核为前端模拟层（内存 + 异步延迟），尚未接入真实 Harness 内核。

## 进行中

- 无。

## 待确认

- 「开发指南 / 开发资料」外链暂指向 https://github.com/joeseesun ，待有 Harness 官方开发文档后替换（`src/data/catalog.ts` 的 `DEV_GUIDE_URL`）。
- 乔木 RSS 的官方版本号取自 Releases 页 v0.9.2（2026-10-28 发布）；后续以仓库最新 Release 为准同步。
- 第三方收录的版本号核对自各仓库 package.json（2026-10-30）：dsh-spotlight 0.0.2、dsh-quick-open 0.3.2、dsh-oh-my-terminal 0.4.7、dsh-our-free-model 2.7.2；后续以仓库为准同步。
- 索引 `versions[].publishTimestamp` 因各仓库未提供可靠发布时间而省略；若「发现」页要求该字段，再从 GitHub Releases 时间补齐（`src/data/pluginIndex.ts`）。

## 最近完成

- 2026-10-30 07:41 — 项目发布到 GitHub 并固化索引 URL：postbuild 脚本把 `dist/index.json` 同步到仓库根目录 `index.json` 并提交，README / AGENTS 写入对外索引 URL（jsDelivr：`https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json`；raw：`https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`）；推送至 `Wcof/DeepSeekBox`（公开仓库）main 分支。涉及 `package.json`、根目录 `index.json`、`README.md`、`AGENTS.md`。
- 2026-10-30 07:13 — 项目改造为 DSH 插件市场索引源：新增 `src/data/pluginIndex.ts` 从收录库生成 `format: 1` 标准索引（双语标题/描述、6 个分类、版本与 GitHub 来源，结构对齐 awesome-dsh-plugin 索引）；`vite.config.ts` 新增 `pluginIndexSource` 插件，dev 服务器中间件与 `vite build` 产物（`dist/index.json`）双通道提供 `/index.json`；商场工具栏新增「索引源」按钮；新建 README.md 说明索引订阅方式。涉及 `src/data/pluginIndex.ts`、`vite.config.ts`、`PluginCenter.vue`。
- 2026-10-30 00:16 — 检索并收录 GitHub 上的第三方 DeepSeek Harness 插件：新增 `THIRD_PARTY_REGISTRY` 数据区与 `STORE_CATALOG` 派生，收录 4 个经核实的社区插件（0xsline/dsh-spotlight 命令面板、asxiuxiu/dsh-quick-open 快速打开、btsd321/dsh-oh-my-terminal 终端面板、Ebony-Vinyl/dsh-our-free-model 免费模型接入，均为 dsh-plugin 主题标签仓库并核对版本/许可证）；商场分组逻辑扩展为官方库 + 第三方收录区按创作者分组，新增 command/zap/square-terminal/folder-open 图标；AGENTS.md 收录边界同步更新。涉及 `src/data/catalog.ts`、`src/stores/pluginCenter.ts`、`src/components/icons/iconNames.ts`。
- 2026-10-30 00:00 — 插件商场数据修正：移除参考图中的示例插件，改为按创作者划分的官方收录库（乔木 / joeseesun 收录 AI RSS 阅读器、电子书阅读器、学习 UI 设计、个人工作台，名称、别名、版本、许可证均核对自各插件仓库）；商场卡片补充别名、开发作者与代码仓库展示，官方/第三方标签改为「官方收录 / 第三方」，未下载操作术语统一为「下载 / 已下载」，移除参考图带来的「账号授权」操作；商场列表按创作者分组展示。涉及 `src/data/catalog.ts`、`src/types/plugin.ts`、`src/services/pluginService.ts`、`src/stores/pluginCenter.ts`、卡片与页面组件。
- 2026-10-29 23:59 — 新建插件中心应用：Vue 3 + Vite + TypeScript 基建、设计系统（卡片、标签、按钮、通知条、确认弹窗）、本地插件 Tab（搜索、检查更新、一键更新、本地安装、开发指南、刷新、启停/删除/配置）、插件商场 Tab（搜索、全部/可安装/已安装筛选、下载、启停、删除二次确认）、插件独立配置页、读取中/空列表/搜索无结果/错误重试状态与按钮 busy 反馈。

## 最近验证

- 2026-10-30 07:43 — 验证对象为线上索引源（推送 Wcof/DeepSeekBox main 后 curl 实测）：jsDelivr `https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json` 返回 200 `application/json`，raw `https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json` 返回 200，两处均为 `format: 1`、8 个插件（乔木 4 + 第三方 4）；同时修正提交内容：`*.tsbuildinfo` 构建缓存加入 .gitignore 并移出跟踪（amend 于推送前完成）。
- 2026-10-30 07:13 — 验证对象为插件市场索引源（`npm run build` + `vite preview` + dev 实测）：构建零错误并输出 `dist/index.json`（8.58 kB）；node 校验索引 `format: 1`、标题「DeepSeekBox 插件索引」、8 个插件（乔木 4 + 第三方 4，版本与分类正确）、6 个分类；`vite preview` 与 dev 中间件下 `GET /index.json` 均返回 200 `application/json`；浏览器实测商场工具栏「索引源」按钮存在，应用内同源 `fetch('/index.json')` 返回 200 且 8 个插件。验证完成后 5180 / 4180 端口服务均已关闭，无残留进程。
- 2026-10-30 00:16 — 验证对象为第三方插件收录（npm run dev，浏览器实测）：`npm run build`（含 vue-tsc）通过；商场按「乔木 joeseesun」+ 4 个第三方创作者分组展示，第三方卡片带蓝色「第三方」标签、独立图标、版本与许可证正确；下载 Oh My Terminal 后通知条「已下载 Oh My Terminal，可在本地插件中启用」，本地列表出现该插件为已停用（启用/配置/删除操作正确）；「可安装」筛选返回剩余 5 个未下载插件；官方 4 卡片状态（下载/启停/删除）不受影响。
- 2026-10-30 00:00 — 验证对象为插件中心页面（npm run dev，浏览器实测）：`npm run build`（含 vue-tsc）通过；本地 Tab 显示乔木 Home（运行中）与乔木阅读（已停用），检查更新后出现「可更新 v0.3.1」标签与「发现可更新插件 (1)」通知，一键更新后版本变为 v0.3.1；商场 Tab 按创作者「乔木 joeseesun」分组展示 4 个官方插件，官方收录标签、别名、开发作者、代码仓库正确，下载学习 UI 设计后卡片切换为启用/删除并出现在本地为已停用；启用/停用状态在两个 Tab 一致；搜索无结果显示「未找到匹配的插件」；「已安装」筛选返回 3 个已下载插件；删除二次确认弹窗、配置页（版本/别名/作者/插件文件/代码仓库 + 阅读主题配置项）渲染正常。
- 2026-10-29 23:59 — 初始版本构建验证：`npm run build` 通过；浏览器核对两个 Tab 视觉与参考图一致性、检查更新流程、删除确认弹窗与配置页保存反馈。
