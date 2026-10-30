# DeepSeekBox

DeepSeek Harness 桌面端 APP 的插件中心，本身是一个可安装的 DSH 插件组合包（bundle），同时作为 DSH 插件市场索引源：收录库中的插件（官方收录 + 经核实的社区插件）会生成标准索引文件，供 DeepSeek Harness「发现」页订阅浏览。

## 快速开始

```bash
npm install
npm run dev      # 开发服务器，http://localhost:5180
npm run build    # 类型检查 + 构建，产物在 web/（随仓库提交），并跑索引与组合包校验
npm run preview  # 本地预览构建产物
```

## 安装到 DeepSeek Harness

本包在 `package.json` 声明了 `dsh.bundle.patch`，因此可以被 DSH 当作插件管理：

1. 在「发现」页添加索引源（见下节），找到「插件中心」并安装；或在插件管理里用本地目录安装本仓库路径。
2. 安装后侧栏出现「插件中心」入口，主面板通过 `iframe` 打开 Host 半边提供的 `/deepseekbox/` 页面。
3. 页面用的就是 `web/` 里这份 Vue 构建产物，所以改动前端后需要 `npm run build` 并提交 `web/`——git 安装路径不会执行构建。

说明：`web/` 打开的是本仓库的插件中心单页应用，当前插件数据来自 `src/services/pluginService.ts` 的模拟内核；接入真实 DSH 插件管理需要换成 remote / IPC 实现。

### 组合包结构

| 文件 | 作用 |
|---|---|
| `package.json` | `dsh.bundle.patch` + `dsh.client.platform: web` + `exports` / `files` |
| `cordis.patch.yml` | 插入一行 `deepseekbox-plugin-center` → `deepseek-box` |
| `index.js` | Host 半边：`ctx.webServer.register({ kind: 'prefix' })` 提供 `/deepseekbox/` 静态路由 |
| `client.js` | Client 半边：侧栏入口 + 主面板 iframe |
| `locale/{zh,en}.json` | 插件管理器显示的标题与描述 |
| `web/` | 前端构建产物（入口页 + 哈希资源 + `/index.json`） |

`npm run validate:bundle` 会检查上述声明、patch 行、入口文件、locale 与 `web/` 资源引用；官方索引校验器不检查「是否声明了组合包」，这一步不能省。

## 插件市场索引源

索引文件随仓库一起发布（`npm run build` 后由 postbuild 同步到根目录 `index.json` 并用官方校验器验证），格式为 DSH 插件索引 `format: 1`。在 DeepSeek Harness 的「发现 → Index sources」中添加以下任一 URL 即可浏览本 Box 收录的全部插件：

- GitHub Raw（始终为最新 main，推荐）：`https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`
- jsDelivr CDN（main 分支，CDN 缓存可能有延迟）：`https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json`
- jsDelivr CDN（按提交固定，永不变化）：`https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@<commit-sha>/index.json`

开发环境由 Vite 中间件提供 `http://localhost:5180/index.json`；在插件中心「插件商场」Tab 右上角点击「索引源」也可直接打开当前环境的索引。

索引由 `src/data/pluginIndex.ts` 从收录库（`src/data/catalog.ts` 的官方收录库与第三方收录区）生成，收录库更新后运行 `npm run build` 即同步根目录 `index.json` 并自动通过官方校验器（`@deepseek-ai/dsh-plugin-market-index`）验证，无需手工维护。jsDelivr 分支 URL 若长时间未更新，可访问 `https://purge.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json` 手动刷新。

## 目录导航

- 项目结构、职责与工程边界见 [AGENTS.md](AGENTS.md)。
- 当前进度与验证记录见 [ROADMAP.md](ROADMAP.md)。
- Goal 施工记录见 [goals/](goals/)。
