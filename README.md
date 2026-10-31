# DeepSeekBox：DeepSeek Harness 插件中心

**中文** | [English](README.en.md)

**DeepSeekBox 是 DeepSeek Harness（DSH）桌面端的插件中心**：在一个面板里浏览、安装、更新、启用或停用插件，并管理插件索引源。它本身也是一个可安装的 DSH 插件组合包，同时对外发布一份符合 DSH 规范的插件索引（`format: 1`），供任何 DSH 用户订阅。

- 宿主：DeepSeek Harness 0.2.1 系列（开发与验收环境为 `0.2.1-rc.5`）
- 包名 / 面板名：`deepseek-box` / 插件中心（Plugin Center）
- 许可证：MIT
- 索引源：`https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`

最短安装路径：在 DSH「发现 → Index sources」加上面那条索引地址，搜索「插件中心」安装，重启窗口；或在命令行执行 `dsh plugin add github:Wcof/DeepSeekBox`。

如果你在找「DeepSeek Harness 插件在哪里装」「DSH 有没有插件市场」，这个项目提供的就是那层界面：插件列表来自宿主真实的 `pluginManager` / `pluginMarket` 服务，不维护第二份数据。

## 它解决什么问题

DeepSeek Harness 自带「发现」页与插件管理能力。DeepSeekBox 复用同一套宿主服务，在此之上补了四件事：

1. **多索引源聚合**：DSH 的「发现」页以单个索引为单位浏览，DeepSeekBox 把已订阅的索引源合并成一个列表，按来源分组、按作者筛选，并显示每个索引源的条数与错误。
2. **版本兼容可见**：索引里登记的 `engines.dsh` 会被如实展示。当前 DSH 版本装不上的插件，卡片上直接标「版本不符」并禁用安装按钮，而不是让你装到一半失败回滚。
3. **上游不发版时的分支安装**：卡片左下角的版本号可以点开，直接选仓库分支安装（装的是该分支当前的头提交）。适合上游把修复合在分支上、还没合并发版的场景。
4. **收录来源分档**：「DSH 官方」「DeepSeekBox 收录」「第三方」三种标签分开显示，不含糊。

## 功能一览

| 功能 | 说明 |
|---|---|
| 插件管理 | 列出当前 profile 里真实的组合包与插件行，可整包启用 / 停用，也可逐行启停 |
| 插件市场 | 聚合已订阅索引源的条目，支持搜索、来源筛选、作者分面、排序、翻页 |
| 安装与更新 | 按索引条目安装、检查更新、单个更新、一键更新 |
| 按分支安装 | 点版本号 → 选分支 → 安装；显示分支版本、要求的 DSH 范围、该分支自己的描述 |
| 兼容性提示 | 推荐版本与当前 DSH 不匹配时标「版本不符」，并给出要求的版本范围 |
| 索引源管理 | 查看已订阅索引、订阅 DeepSeekBox 索引、打开当前索引文件 |
| 卸载 | 二次确认后移除依赖，profile 里的插件行随之消失 |

界面不提供插件配置表单：DSH 的远程面只暴露组合包与插件行的启停、安装、卸载，配置 schema 在模型侧（`Config.listConfigs`）。

## 安装

DeepSeekBox 是标准 DSH 组合包（`package.json` 声明 `dsh.bundle.patch`），三种装法任选。

### 方式一：从索引源安装（推荐）

1. 打开 DeepSeek Harness 的「发现」页，在 Index sources（索引源）里添加：
   `https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`
2. 搜索「插件中心」或 `deepseek-box`，点安装。
3. 重启 DSH 窗口（Host 端代码在启动时加载）。

### 方式二：从 GitHub 安装

在插件中心的「安装插件」对话框里填入下面任一形式：

- `github:Wcof/DeepSeekBox`
- `git+https://github.com/Wcof/DeepSeekBox#<commit-sha>`（钉到某个提交，适合复现问题）

或在命令行执行：

```bash
dsh plugin add github:Wcof/DeepSeekBox
```

### 方式三：本地目录安装（开发用）

在「安装插件」里填本仓库的绝对路径，例如 `/Users/you/code/DeepSeekBox`。改完前端记得 `npm run build` 并提交 `web/`，git 安装路径不会执行构建。

## 使用

### 插件管理

顶部是来源统计卡（全部插件 / 官方插件 / 第三方插件 / 本地安装），点卡片即筛选。每张卡片显示标题、包名、来源、运行状态和插件行数；点「详情」进入逐行启停页。

### 插件市场

按索引源分组显示条目，卡片上标来源（DSH 官方 / DeepSeekBox 收录 / 第三方）、状态（可安装 / 已安装 / 可更新 / 版本不符）和当前版本。工具栏支持搜索、来源 chips、创作者多选和四种排序；索引超过 100 条时按 `nextOffset` 续页，超上限会在列表上方如实提示「索引共 N 个，已加载 M 个」。

### 按分支安装

点卡片左下角的版本号（例如 `v0.3.1 ▾`），弹出该仓库的分支列表：

- 每个分支显示名称、包内版本号、`engines.dsh` 要求、以及该分支自己的标题与描述（不同分支的描述可能不一样）；
- 没声明 `dsh.bundle` 的分支禁用安装；
- 已装的版本会标「当前已装」，此时换分支需要先卸载。

装的是**分支当前的头提交**：上游后续推送会改变它。要固定版本，还是等上游发 tag 后走正常安装。

分支列表由 Host 半边用 `git ls-remote --heads` 读取（不消耗 GitHub API 配额），失败才退回 GitHub REST。

### 检查更新

页面打开时会静默比对索引与已装版本，有可更新就在顶部提示；点「检查更新」可强制刷新索引缓存。

## 收录与来源标签

索引里的三种标签含义不同：

| 标签 | 含义 | 判定方式 |
|---|---|---|
| DSH 官方 | DSH 官方维护或官方收录 | 索引条目 `metadata.labels` 含 `official` |
| DeepSeekBox 收录 | 收录在本仓库维护的索引里 | 索引条目 `metadata.keywords` 含 `deepseekbox` |
| 第三方 | 来自其他订阅的索引源 | 以上都不满足 |

**「DeepSeekBox 收录」是本站的整理，不代表 DSH 官方背书。** 收录标准：仓库真实存在、确为 DSH 插件（声明 `dsh.bundle`、可被 `dsh plugin add` 安装）、版本与许可证可核对（仓库 package.json / LICENSE）、插件版本已发布或至少对应一个确定的提交。当前收录 10 个插件，覆盖阅读、学习、效率、界面增强、工具、模型六个分类。

想推荐插件：在本仓库开 issue，附仓库地址、目标版本号与许可证；核对通过后由维护者加入收录库。

## 插件索引源

索引随仓库发布，格式为 DSH 插件索引 `format: 1`，可被任何 DSH 实例订阅：

- GitHub Raw（始终最新 main，推荐）：
  `https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`
- jsDelivr（main 分支，CDN 缓存约 12 小时）：
  `https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json`
- jsDelivr（按提交固定，永不变化）：
  `https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@<commit-sha>/index.json`

索引由 `src/data/catalog.ts`（收录库）+ `src/data/pluginIndex.ts`（生成器）产出，`npm run build` 后同步到根目录 `index.json`，并用官方校验器 `@deepseek-ai/dsh-plugin-market-index` 验证。每个版本的 `source` 为 `{ type: "git", url, commit }`，`engines.dsh` 原样镜像该提交的 package.json——索引里省略表示「任意 DSH 版本」，所以不能想当然地留空。

jsDelivr 长时间不更新时，访问 `https://purge.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json` 手动刷新。

## 兼容性与边界

- 验收环境：DSH `0.2.1-rc.5`（npm `latest`）。宿主升级后建议重跑 `npm run check:engines` 核对索引。
- 兼容判定在宿主侧：`engines.dsh` 存在时只按它判断（忽略 peerDependencies），规则是 `semver.satisfies(运行时版本, range, { includePrerelease: true })`。
- 分支安装只展示分支声明的 `engines.dsh`，面板无法预判是否兼容（运行时版本没有暴露给页面），真正的判定发生在安装时。
- 索引每个插件只登记一个已发布版本；要装其他版本走分支安装，或等索引升版。
- 不提供插件配置界面（见上文原因）。

## 常见问题

**DeepSeekBox 和 DeepSeek Harness 自带的「发现」页有什么区别？**
两者读同一套宿主服务。自带的「发现」页一次浏览一个索引；DeepSeekBox 聚合多个索引源，额外提供作者分面、兼容性标记与按分支安装。

**「DeepSeekBox 收录」是 DSH 官方收录吗？**
不是。它只表示该插件被本仓库维护的索引收录。官方收录在索引里另有 `official` 标记。

**为什么某个插件显示「版本不符」？**
该版本声明的 `engines.dsh` 不包含你当前的 DSH 版本。卡片上会写出它要求的范围，升级 DSH 或等插件放宽声明后才能装。

**按分支安装和正常安装有什么不同？**
正常安装装的是索引登记的固定提交；分支安装装的是分支当前的头提交，会随上游推送变化，适合上游还没发版的修复。

**为什么装完要重启？**
插件的 Host 端代码在 DSH 启动时加载，前端资源可以热更，Host 代码不能。

**索引源加了但看不到插件？**
先确认 URL 可访问（浏览器打开应返回 JSON），再在插件中心点「检查更新」刷新缓存；jsDelivr 有约 12 小时缓存，必要时用上面的 purge 链接。

## 开发

```bash
npm install
npm run dev              # 开发服务器 http://localhost:5180，自带假宿主
npm run build            # 类型检查 + 构建到 web/，并跑索引与组合包校验
npm run preview          # 预览构建产物
npm run validate:index   # 单独跑官方索引校验
npm run validate:bundle  # 单独跑组合包自检
npm run check:engines    # 核对索引登记的 engines.dsh 与上游 package.json 是否一致
```

技术栈：Vue 3 `<script setup>` + TypeScript + Vite，不引入 UI 组件库与路由库，样式手写。`web/` 是随仓库提交的构建产物——DSH 从 git 安装时不执行构建，缺了会 503。

### 目录结构

```
index.js            Host 半边：/deepseekbox/ 静态路由 + /deepseekbox/api/rpc
client.js           Client 半边：侧栏入口 + 主面板 iframe
cordis.patch.yml    组合包 patch，插入插件中心这一行
locale/{zh,en}.json 插件管理器显示的标题与描述
src/                前端源码（components / stores / services / data / types / styles）
web/                前端构建产物（随仓库提交）
scripts/            索引与组合包校验、自条目同步、engines 巡检、dev 假宿主
index.json          对外发布的插件索引（构建时生成）
```

### 数据链路

页面只认 `src/services/pluginService.ts`，它把每个动作翻译成 `POST /deepseekbox/api/rpc` 的 `{ method, params }`，由 Host 半边转给 DSH 的 `pluginManager` / `pluginMarket`。方法表：`status`、`listBundles`、`listPlugins`、`setBundleEnabled`、`setPluginEnabled`、`removeBundle`、`installBundle`、`listIndexes`、`setIndexes`、`searchMarket`、`repoBranches`（唯一不来自 DSH 服务的方法，用于读仓库分支）。

接口只接受 POST + 同源请求，请求体上限 512 KiB；安装与卸载会跑 pnpm，可能持续数分钟。

## 生态与相关项目

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)：本项目运行的宿主，插件机制的来源。
- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)：社区维护的 DSH 插件清单，找插件可以从这里开始。
- 其他插件市场实现（`dsh-market`、`dsh-plugin-market` 等）各自维护自己的目录；DeepSeekBox 不替代它们，只是把索引源合并进一个面板，并额外提供兼容性标记与按分支安装。

## 相关文档

- [AGENTS.md](AGENTS.md)：工程结构、职责边界、红线与验证入口
- [ROADMAP.md](ROADMAP.md)：当前进度与历史记录
- [goals/](goals/)：施工记录

## English

**DeepSeekBox is a plugin center for DeepSeek Harness (DSH).** It lists, installs, updates, enables and disables DSH plugins in one panel, aggregates multiple plugin index sources, flags versions that your running DSH cannot load, and can install a plugin straight from a git branch when upstream has not published a release yet. The project is itself an installable DSH bundle and publishes a `format: 1` plugin index that any DSH instance can subscribe to:

`https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`

Keywords: DeepSeek Harness plugin, DSH plugin manager, DSH plugin market, plugin index, branch install. License: MIT.

## 许可证

MIT，见 [LICENSE](LICENSE)。
