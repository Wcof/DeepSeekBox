# DeepSeekBox · DeepSeek Harness 桌面端

DeepSeek Harness 桌面端 APP 的前端工程，当前包含插件中心（安装、更新与管理插件），同时也是可被 DSH 安装的插件组合包（bundle）。

## 核心目录与职责

- `index.js` —— 组合包 Host 半边：`apply(ctx)` 用 `ctx.webServer.register({ kind: 'prefix' })` 把 `web/` 挂在 `/deepseekbox/`，只读静态文件，不碰用户数据。
- `client.js` —— 组合包 Client 半边：`window.__ModuleLoader__.load` 注册侧栏入口（`sidebar.panellist`）与主面板（`main`），面板内用同源 iframe 打开 `/deepseekbox/`。
- `cordis.patch.yml` —— 组合包 patch，插入一行 `id: deepseekbox-plugin-center` / `name: deepseek-box`。
- `locale/` —— 插件管理器读取的双语展示元数据（`meta.title` / `meta.description`）。
- `web/` —— 插件前端的构建产物，随仓库提交（DSH 从 git 安装时不执行构建，缺了会 503）。
- `src/types/plugin.ts` —— 插件领域类型与纯函数（版本比较、作者展示），不依赖 UI。
- `src/data/catalog.ts` —— 插件收录库的唯一维护入口（官方收录库 + 第三方收录区，按创作者划分）；含初始本地插件与开发资料链接。
- `src/data/pluginIndex.ts` —— 插件市场索引源生成器：从收录库生成 DSH 插件索引（format 1，含 author / 双语 title / 项目图标 / 版本来源），供「发现」页订阅。
- `scripts/` —— `validate-index.mjs`（官方校验器验证 index.json）、`validate-bundle.mjs`（组合包自检：dsh.bundle / patch / 入口 / locale / web 产物）、`sync-self-entry.mjs`（postbuild 同步插件中心自身条目到当前 main 提交，同时写根目录与 `web/index.json`）。
- `icons/` —— 本仓库自有插件（插件中心）的图标文件，索引以绝对 raw URL 引用。
- `src/services/pluginService.ts` —— 模拟插件内核接口层（内存状态 + 异步延迟）；接入真实内核时保持导出函数签名不变，UI 层无需改动。
- `src/stores/pluginCenter.ts` —— 插件中心唯一状态 owner（列表、搜索、筛选、busy、通知、确认弹窗），UI 只读 state 并调用 action。
- `src/components/plugin/` —— 插件中心页面：`PluginCenter`（双 Tab + 工具栏 + 列表状态）、本地/商场卡片、独立配置页。
- `src/components/ui/` —— 通用组件：通知条、确认弹窗、筛选下拉。
- `src/components/icons/` —— 图标常量与插件图标映射。
- `src/styles/global.css` —— 设计令牌与全局样式（按钮、标签、卡片、弹窗、通知条）。

## 技术栈与命令

- Vue 3 `<script setup>` + TypeScript + Vite；不引入 UI 组件库与路由库，样式手写。
- `npm run dev`（端口 5180）、`npm run build`（vue-tsc 类型检查 + 构建，postbuild 依次跑索引校验与组合包自检）、`npm run preview`。
- `npm run validate:bundle` 单独跑组合包自检；改动 `package.json` / `cordis.patch.yml` / `index.js` / `client.js` / `locale/` 后必跑。

## 组合包约束

- `package.json` 必须声明 `dsh.bundle.patch`，否则 DSH 安装时报「这个包没有声明组合包，不能作为插件管理」；对外暴露 `exports` 的 `.`、`./client`、`./icon`、`./locale/*.json`。
- `files` 需覆盖运行时文件（`index.js`、`client.js`、`cordis.patch.yml`、`locale/*.json`、图标、`web`）；打包发布会按它过滤。
- Vite 构建 `base` 为 `./`、`outDir` 为 `web`：产物要能以 `/deepseekbox/` 前缀挂载，绝对路径会 404。
- Client 半边不走构建：手写 `window.__ModuleLoader__.load`，React 来自浏览器模块表，禁止 require 任何 `@deepseek-ai/dsh-client-*` 包。

## 工程边界

- 业务数据一律经 `pluginService`（未来为真实内核 client），UI 不直接改内存数据。
- 插件状态（运行中 / 已停用 / 未找到插件文件）与可用操作的映射只允许在卡片组件内实现，保持两 Tab 一致。
- 收录库分两区维护，均按创作者划分：
  - `OFFICIAL_REGISTRY`（官方收录）：首组为插件中心自身（创作者 Wcof / DeepSeekBox，发布于本仓库），其后是用户确认的插件（当前为乔木 / joeseesun 系列）；名称、别名、描述、版本、许可证需与插件仓库 README / Releases 一致。
  - `THIRD_PARTY_REGISTRY`（第三方收录）：经核实的社区 DSH 插件，标准相同——仓库真实存在、确为 DSH 插件（`dsh plugin add` 可装 / 声明 dsh.bundle），版本与许可证核对自仓库 package.json / LICENSE；展示时带「第三方」标签并按创作者分组。
- 索引 `pluginIndex.ts` 的登记要求：
  - `VERSION_SOURCES`：publishTimestamp（整数 Unix 秒，Releases published_at；未发版或版本超前取 package.json 变更提交时间）+ commit（40 位小写 SHA，Release tag 解包或变更提交）；缺失时构建报错。插件中心自身条目由 `scripts/sync-self-entry.mjs` 在每次构建后同步到当前 main 提交（始终比包含它的提交旧一个提交，属预期）。
  - `INDEX_ICONS`：icon 一律引用插件自己项目的图标文件（其仓库内 icon.svg / icon.jpg，URL 钉到收录版本提交并经 curl 核实 200）；项目未提供图标的用作者 GitHub 头像（`https://github.com/<user>.png`）。校验器允许 ≤32 KiB 的 data URI 或解析为 https 的 URL。
  - `author` 用 `authorLabel` 全称（如 `joeseesun（乔木）`），`title` 为双语展示名（`TITLE_EN` 登记 en 键）。
- 收录检索入口参考 awesome-dsh-plugin 清单与 GitHub topic（`deepseek-harness`、`dsh-plugin`）；非 DeepSeek Harness 宿主的插件（如 CLIProxyAPI 插件）不得收录。
- 未收录进两个登记区的插件归入「其他创作者」分组；新增创作者在对应登记区新增分组，不为单条插件改分组逻辑。
- 索引源：`/index.json` 由 `vite.config.ts` 的 `pluginIndexSource` 插件提供（dev 中间件 + build 产物），格式为 DSH 插件索引 `format: 1`；仓库根目录的 `index.json` 由 `npm run build` 的 postbuild 脚本从 `web/index.json` 同步生成，并立刻用官方校验器 `@deepseek-ai/dsh-plugin-market-index`（devDependency，`scripts/validate-index.mjs`，也可 `npm run validate:index` 单独运行）验证后提交，供 raw / jsDelivr 稳定引用，禁止手工编辑。只改 `src/data/pluginIndex.ts` 的映射逻辑来调整索引输出。`versions[].source.type` 只允许 `"npm" | "git"`：本 Box 收录的插件均为 git 来源，必须登记 `commit`（40 位小写 SHA，取 Release tag 解包或 package.json 变更提交）；`publishTimestamp` 为整数 Unix 秒。两者在 `VERSION_SOURCES` 登记缺失时构建直接报错。对外索引 URL：`https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json` 与 `https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`。

## 验证入口

- 改动后运行 `npm run build`；涉及 UI 视觉时启动 `npm run dev` 并核对两个 Tab、配置页、通知条与确认弹窗。
- 涉及收录库或索引时：`npm run build` 后检查 `web/index.json`（9 个插件、format 1），并用 `npm run preview` 确认 `/index.json` 可访问。
- 涉及组合包时：`npm run validate:bundle` 必须通过；再按 Host 路由自查项验证 `/deepseekbox/` 入口页 200、静态资源 200、`/deepseekbox` 308 补斜杠、路径穿越不返回 200、缺 `web/` 时 503 带修复提示。
- 操作路径清单：检查更新 → 一键更新、单个更新、启用/停用、删除二次确认、商场下载、本地安装、配置页保存。

## 项目特有红线

- 不在 `data/catalog.ts` 中编造插件数据；版本、许可证等信息以插件仓库实际发布为准，无法核实处标记「待确认」。
- 界面参考图只约束视觉风格，不照搬图中的示例插件与示例操作。
- 官方索引校验器**不检查**「包是否声明了组合包」，索引通过不代表装得上；上架或升版前必须跑 `npm run validate:bundle`。
- `web/` 是随包提交的产物，改动前端后必须重新 `npm run build` 并连同源码一起提交，不允许只提交源码。
