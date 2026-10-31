# DeepSeekBox · DeepSeek Harness 桌面端

DeepSeek Harness 桌面端 APP 的前端工程，当前包含插件中心（安装、更新与管理插件），同时也是可被 DSH 安装的插件组合包（bundle）。

## 核心目录与职责

- `index.js` —— 组合包 Host 半边：`apply(ctx)` 用 `ctx.webServer.register({ kind: 'prefix' })` 把 `web/` 挂在 `/deepseekbox/`；同前缀下的 `/deepseekbox/api/rpc` 是 JSON-RPC 端点，把页面操作转给 DSH 的 `pluginManager` / `pluginMarket` 服务。
- `client.js` —— 组合包 Client 半边：`window.__ModuleLoader__.load` 注册侧栏入口（`sidebar.panellist`）与主面板（`main`），面板内用同源 iframe 打开 `/deepseekbox/`。
- `cordis.patch.yml` —— 组合包 patch，插入一行 `id: deepseekbox-plugin-center` / `name: deepseek-box`。
- `locale/` —— 插件管理器读取的双语展示元数据（`meta.title` / `meta.description`）。
- `web/` —— 插件前端的构建产物，随仓库提交（DSH 从 git 安装时不执行构建，缺了会 503）。
- `src/types/plugin.ts` —— 插件领域类型与纯函数（版本比较、作者展示），不依赖 UI；`InstalledBundle` / `MarketEntry` 对应宿主返回结构。
- `src/data/catalog.ts` —— 索引源（`index.json`）的收录库，按创作者划分；只服务对外发布的索引，不参与运行时。
- `src/data/pluginIndex.ts` —— 插件市场索引源生成器：从收录库生成 DSH 插件索引（format 1，含 author / 双语 title / 项目图标 / 版本来源），供「发现」页订阅。
- `scripts/` —— `validate-index.mjs`（官方校验器验证 index.json）、`validate-bundle.mjs`（组合包自检：dsh.bundle / patch / 入口 / locale / web 产物）、`sync-self-entry.mjs`（postbuild 同步插件中心自身条目到当前 main 提交，同时写根目录与 `web/index.json`）、`dev-rpc-mock.ts`（仅 dev 的假宿主，不进构建产物）。
- `icons/` —— 本仓库自有插件（插件中心）的图标文件，索引以绝对 raw URL 引用。
- `src/services/pluginService.ts` —— 真实内核接口层：POST `/deepseekbox/api/rpc`，方法名与 Host 半边一一对应；不做本地缓存。
- `src/stores/pluginCenter.ts` —— 插件中心唯一状态 owner（列表、搜索、筛选、busy、通知、确认弹窗），每次操作后回读宿主。
- `src/components/plugin/` —— 插件中心页面：`PluginCenter`（双 Tab + 工具栏 + 列表状态）、`LocalPluginCard`（组合包）、`StorePluginCard`（索引条目）、`PluginDetailPage`（包信息 + 逐行启停）、`PluginTile`。
- `src/components/ui/` —— 通用组件：通知条、确认弹窗、筛选下拉、安装对话框。按分支安装是卡片内的下拉（`StorePluginCard`），不再单独开弹窗。
- `src/components/icons/` —— 图标常量。
- `src/styles/global.css` —— 设计令牌与全局样式（按钮、标签、卡片、弹窗、通知条）。

## 技术栈与命令

- Vue 3 `<script setup>` + TypeScript + Vite；不引入 UI 组件库与路由库，样式手写。
- `npm run dev`（端口 5180，`scripts/dev-rpc-mock.ts` 顶替宿主提供 `/api/rpc` 假数据）、`npm run build`（vue-tsc 类型检查 + 构建，postbuild 依次跑索引校验与组合包自检）、`npm run preview`。
- `npm run validate:bundle` 单独跑组合包自检；改动 `package.json` / `cordis.patch.yml` / `index.js` / `client.js` / `locale/` 后必跑。

## 真实数据链路

- 页面只认 `pluginService`；它把每个动作翻译成 `POST /deepseekbox/api/rpc` 的 `{ method, params }`，**不保存任何本地插件状态**。
- Host 半边的方法表（`API_METHODS`）：`status`、`listBundles`、`listPlugins`、`setBundleEnabled`、`setPluginEnabled`、`removeBundle`、`installBundle`、`listIndexes`、`setIndexes`、`searchMarket`、`repoBranches`。
- 服务来源：`ctx.get('pluginManager')` 与 `ctx.get('pluginMarket')`，都是 DSH 自带的远程面实现；缺失时返回 503 `service-unavailable`，页面显示「当前 profile 没有装载插件管理服务」。
- `repoBranches` 是唯一一处不由 DSH 服务提供的方法：上游常把修复合在分支上却不发版，面板因此允许「按分支安装」。它先用 `git ls-remote --heads https://github.com/<owner>/<repo>` 列分支（GitHub REST 未登录只有 60 次/小时，容易限流；git 不受限也不用 token），git 不可用时才退回 REST；每个分支再从 `raw.githubusercontent.com/<repo>/<branch>/package.json` 读出版本号、`engines.dsh`、是否声明 `dsh.bundle`、以及 `dsh.meta.title` / 描述（不同分支的描述可能不一样，选之前要看得见）。结果按仓库缓存 60 秒。仓库名先过 `owner/name` 正则，git 用参数数组调用（不过 shell）。失败码：`invalid-params`、`repo-unavailable`、`github-rate-limited`、`github-unavailable`。
- 分支入口在卡片左下角的版本号上（不是弹窗）：点开是内联下拉，列分支、版本、要求范围、描述，逐行安装。安装分支走 `installBundle` 的 git spec（`git+https://github.com/<repo>#<分支>`），**不登记进索引**：索引只收录发布版本，分支是活口，随时会被上游重写。
- 安全：只接受 POST + 同源（`sec-fetch-site` 非 `cross-site`，`origin` 主机须与 `host` 一致），请求体上限 512 KiB。
- 配置项编辑不在远程面里（只有模型侧 `Config.listConfigs`），所以详情页只做包信息与逐行启停，不提供配置表单。

## 组合包约束

- `package.json` 必须声明 `dsh.bundle.patch`，否则 DSH 安装时报「这个包没有声明组合包，不能作为插件管理」；对外暴露 `exports` 的 `.`、`./client`、`./icon`、`./locale/*.json`。
- `files` 需覆盖运行时文件（`index.js`、`client.js`、`cordis.patch.yml`、`locale/*.json`、图标、`web`）；打包发布会按它过滤。
- Vite 构建 `base` 为 `./`、`outDir` 为 `web`：产物要能以 `/deepseekbox/` 前缀挂载，绝对路径会 404。
- Client 半边不走构建：手写 `window.__ModuleLoader__.load`，React 来自浏览器模块表，禁止 require 任何 `@deepseek-ai/dsh-client-*` 包。

## 工程边界

- 业务数据一律经 `pluginService` 走宿主，UI 不直接改状态、不维护插件副本。
- 组合包状态（运行中 / 已停用 / 包不可用）与可用操作的映射只允许在卡片组件内实现，保持两 Tab 一致；`readOnlyReason` 非空的包禁止停用与卸载。
- 收录库只服务索引发布（分自荐收录 / 社区收录两区，按创作者划分；都是「本 Box 收录」，**不等于 DSH 官方**）：
  - `OFFICIAL_REGISTRY`（自荐收录）：首组为插件中心自身（创作者 Wcof / DeepSeekBox，发布于本仓库），其后是作者自荐并经确认的插件（当前为乔木 / joeseesun 系列）；名称、别名、描述、版本、许可证需与插件仓库 README / Releases 一致。
  - `THIRD_PARTY_REGISTRY`（社区收录）：经核实的社区 DSH 插件，标准相同——仓库真实存在、确为 DSH 插件（`dsh plugin add` 可装 / 声明 dsh.bundle），版本与许可证核对自仓库 package.json / LICENSE；按创作者分组。
- 来源标签的三档语义（面板与索引必须一致）：`official` 只给 DSH 官方（索引 `metadata.labels` 含 `official`，本 Box 索引从不写）；`catalog` 表示收录在本 Box 索引里（关键词 `deepseekbox`）；其余索引源算 `third-party`。
- 索引 `pluginIndex.ts` 的登记要求：
  - `VERSION_SOURCES`：publishTimestamp（整数 Unix 秒，Releases published_at；未发版或版本超前取 package.json 变更提交时间）+ commit（40 位小写 SHA，Release tag 解包或变更提交）；缺失时构建报错。插件中心自身条目由 `scripts/sync-self-entry.mjs` 在每次构建后同步到当前 main 提交（始终比包含它的提交旧一个提交，属预期）。
  - `VERSION_SOURCES.enginesDsh`：必须原样镜像该 commit 上 package.json 的 `engines.dsh`（不加工范围），包没声明就省略该键。索引里**省略**表示「任意 DSH 版本」，写成 `{}` 等于向市场宣称无要求；而宿主装完仍会用 `semver.satisfies(运行时版本, engines.dsh, { includePrerelease: true })` 复核真实 package.json，漏登记的结果是市场照常显示「安装」、用户点下去才在安装阶段被拒并回滚。收录或升版时用 `curl https://raw.githubusercontent.com/<repo>/<commit>/package.json` 核对。**升版必须重抓**：不兼容标注只跟着登记的那个版本走，换了版本号却留着旧范围，标注会一直挂着（而且新版本来能装也装不上）。
  - `INDEX_ICONS`：icon 一律引用插件自己项目的图标文件（其仓库内 icon.svg / icon.jpg，URL 钉到收录版本提交并经 curl 核实 200）；项目未提供图标的用作者 GitHub 头像（`https://github.com/<user>.png`）。校验器允许 ≤32 KiB 的 data URI 或解析为 https 的 URL。
  - `author` 用 `authorLabel` 全称（如 `joeseesun（乔木）`），`title` 为双语展示名（`TITLE_EN` 登记 en 键）。
- 收录检索入口参考 awesome-dsh-plugin 清单与 GitHub topic（`deepseek-harness`、`dsh-plugin`）；非 DeepSeek Harness 宿主的插件（如 CLIProxyAPI 插件）不得收录。
- 未收录进两个登记区的插件归入「其他创作者」分组；新增创作者在对应登记区新增分组，不为单条插件改分组逻辑。
- 索引源：`/index.json` 由 `vite.config.ts` 的 `pluginIndexSource` 插件提供（dev 中间件 + build 产物），格式为 DSH 插件索引 `format: 1`；仓库根目录的 `index.json` 由 `npm run build` 的 postbuild 脚本从 `web/index.json` 同步生成，并立刻用官方校验器 `@deepseek-ai/dsh-plugin-market-index`（devDependency，`scripts/validate-index.mjs`，也可 `npm run validate:index` 单独运行）验证后提交，供 raw / jsDelivr 稳定引用，禁止手工编辑。只改 `src/data/pluginIndex.ts` 的映射逻辑来调整索引输出。`versions[].source.type` 只允许 `"npm" | "git"`：本 Box 收录的插件均为 git 来源，必须登记 `commit`（40 位小写 SHA，取 Release tag 解包或 package.json 变更提交）；`publishTimestamp` 为整数 Unix 秒。两者在 `VERSION_SOURCES` 登记缺失时构建直接报错。对外索引 URL：`https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json` 与 `https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`。

## 验证入口

- 改动后运行 `npm run build`；涉及 UI 视觉时启动 `npm run dev` 并核对两个 Tab、详情页、通知条、确认弹窗、安装对话框，以及卡片版本号下拉（展开、筛选内外、点击外部收起）。
- 涉及收录库或索引时：`npm run build` 后检查 `web/index.json`（10 个插件、format 1），并用 `npm run preview` 确认 `/index.json` 可访问。收录或升版后跑一遍 `npm run check:engines`：它按索引登记的 commit 拉真实 package.json 核对版本与 `engines.dsh`，并列出上游已有更新版本的插件；不一致时退出码为 1。
- 涉及组合包时：`npm run validate:bundle` 必须通过；再按 Host 路由自查项验证 `/deepseekbox/` 入口页 200、静态资源 200、`/deepseekbox` 308 补斜杠、路径穿越不返回 200、缺 `web/` 时 503 带修复提示。
- 涉及 API 时：用假 ctx 起本地 HTTP 覆盖 `listBundles` / `setBundleEnabled` / `installBundle` / `searchMarket` / `repoBranches` 的透传、跨站与异源拒绝、未知方法 400、非 POST 405；`repoBranches` 另外覆盖非法仓库名 400 `invalid-params`、不存在的仓库 `repo-unavailable`、以及重复调用命中缓存（第二次应明显快于第一次）。真实链路只能在 DSH 内验证（`ctx.get('pluginManager')` 存在与否）。
- 操作路径清单：检查更新 → 一键更新 / 单个更新、启用 / 停用组合包、卸载二次确认、商场安装与更新、按包名 / git / 本地目录安装、按分支安装（分支列表 → 挑分支 → 安装）、详情页逐行启停。

## 项目特有红线

- 不在 `data/catalog.ts` 中编造插件数据；版本、许可证等信息以插件仓库实际发布为准，无法核实处标记「待确认」。
- 界面参考图只约束视觉风格，不照搬图中的示例插件与示例操作。
- 官方索引校验器**不检查**「包是否声明了组合包」，索引通过不代表装得上；上架或升版前必须跑 `npm run validate:bundle`。
- `web/` 是随包提交的产物，改动前端后必须重新 `npm run build` 并连同源码一起提交，不允许只提交源码。
- 索引只登记发布版本（Release tag 或 package.json 变更提交）。上游把修复合在未合并分支上时，用「按分支安装」这条旁路，不把索引指向分支或 draft PR。
- 索引里不得出现 `official` 标记：`metadata.labels` / `keywords` 里的 `official` 表示 DSH 官方收录，本 Box 的索引一律用 `deepseekbox` 标记自己的收录。
- 页面里不允许再出现假数据；替身只允许存在于 `scripts/dev-rpc-mock.ts`（仅 dev server 生效，不进 `web/`），且新增字段必须与宿主真实返回结构一致。
