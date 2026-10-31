# DeepSeek Harness（DSH）宿主契约 · DSH 适配器

> **归属：这是 DSH 适配器的宿主契约文档，不属于 PlugBox 核心层。**
> PlugBox 的核心层（`src/core/`）定义与引擎无关的插件协议；本文描述的是**某个具体宿主**——DeepSeek Harness——的协议细节，全部由 DSH 适配器（`src/adapters/dsh/`）负责翻译与落地。换一个宿主就有另一份契约文档，本文不适用于其他宿主。
> 正文中出现的 `dsh.bundle`、`cordis.patch.yml`、`dsh plugin add`、`engines.dsh`、`pluginManager` / `pluginMarket` 等都是 **DeepSeek Harness 自己的协议字段、命令与服务名**，是宿主契约的一部分，**不要当作产品文案改写**——改掉就装不进 DSH。

> 目的：把既有项目拆成若干可被 DeepSeek Harness（DSH）安装、启停、发布的插件组合包。
> 读者：执行拆分的另一个引擎 / 工程师，或需要新增 / 维护 DSH 适配器的人。本文可直接作为施工契约，不需要再读本仓库源码。
> 证据分级：**✅ 已验证**（官方类型、官方校验器实现、本机真实安装的插件）｜**⚠️ 未验证**（有实例但无权威定义，勿当硬规则）。

---

## 0. 先分清三个不同的东西

拆项目最容易混的，是"包""插件行""索引条目"被当成一回事。它们层级不同：

| 概念 | 是什么 | 物理形态 | 谁读它 |
|---|---|---|---|
| **组合包 bundle** | 一个 npm 包，声明了 `dsh.bundle.patch` | 仓库 / npm 包 | profile 启动器 |
| **插件行 entry** | 组合包 patch 里插入的一行，是运行时一个可启停节点 | `cordis.patch.yml` 里的一条 `insert` | Cordis 加载器 |
| **索引条目 plugin** | 插件市场里的一条可安装记录，含版本与来源 | `index.json`（`format: 1`） | `pluginMarket` 服务 |

关系：**一个 bundle ≥ 1 条 entry；一个索引条目指向一个 bundle 的某个确定版本。**
装的是 bundle，启停的是 entry。

---

## 1. 权威来源

| 来源 | 位置 | 能证明什么 |
|---|---|---|
| `@deepseek-ai/dsh-package-manifest` 的 `types.d.ts` | `node_modules/@deepseek-ai/dsh-package-manifest/lib/types/types.d.ts` | `package.json.dsh` 全部公共字段与语义 ✅ |
| `@deepseek-ai/dsh-plugin-market-index` 的 `lib/index.js` | 同上 | 索引 format 1 的逐条硬规则（校验器即规范）✅ |
| 本仓库 `scripts/validate-bundle.mjs` | 本项目 | 组合包自检的**更严**子集（项目自定，不是 DSH 强制）✅ |
| 本机已装插件 | `~/.dsh/profiles/desktop/node_modules/{qiaomu-home-dsh,qiaomu-ui-learn-dsh}` | 真实可用的第二种写法 ✅ |
| `~/.dsh/profiles/desktop/package.json` | 本机 | 组合顺序：`dsh.profile.bundles` 数组 ✅ |

官方校验器**不检查**"这个包是不是组合包"，也不检查版本号是否与包一致。索引过审 ≠ 装得上。

---

## 2. 一个组合包的最小文件集

```
your-plugin/
├── package.json          # 必须：身份 + dsh.bundle 声明 + exports
├── cordis.patch.yml      # 必须：插入插件行
├── index.js              # 必须：Host 半边（exports.apply）
├── client.js             # 有 UI 才需要：Client 半边（手写，不走构建）
├── locale/
│   ├── en.json           # 必须（本项目自检要求；DSH 插件管理器读）
│   └── zh.json
├── icon.svg              # 必须：图标（根 icon 字段 或 exports["./icon"]）
└── web/                  # 仅"自有 SPA"形态需要：构建产物，**随包提交**
    └── index.html
```

`web/` 之所以要提交：**DSH 从 git 安装时不执行构建**，缺了页面直接 503。

---

## 3. `package.json` 契约

### 3.1 字段表

| 字段 | 必需 | 规则 | 后果 |
|---|---|---|---|
| `name` | ✅ | 合法 npm 包名，全小写 | 加载器按它解析模块 |
| `version` | ✅ | 精确 SemVer | 索引与安装钉版本 |
| `type` | ✅ | 必须 `"module"` | Host 半边用 `export function apply` |
| `private` | 建议 | `true` 阻止误发 npm；要发 npm 时删掉 | git 安装不受影响 |
| `description` | 建议 | 一句话 | 展示兜底 |
| `engines.dsh` | 强烈建议 | SemVer 范围，可含预发布 | 宿主用 `semver.satisfies(运行时, range, { includePrerelease: true })` 判定；不写=任意版本 |
| `engines.node` | 可选 | 如 `">=22"` | 声明性质 |
| `icon` | 二选一 | 包根相对路径，SVG/PNG/JPEG/WebP，≤256 KiB | 插件管理器图标 |
| `exports["."]` | ✅ | 指向 Host 入口 | 缺失则加载不到 |
| `exports["./client"]` | 有 UI 时必需 | 指向 Client 入口 | 声明了 `dsh.client` 却缺它 → 报错 |
| `exports["./icon"]` | 二选一 | 指向图标文件 | 本项目自检要求；`icon` 字段亦可 |
| `exports["./locale/*.json"]` | 建议 | 通配导出 | 插件管理器读双语元数据 |
| `exports["./package.json"]` | 建议 | 导出自身 | 便于宿主读 manifest |
| `files` | 建议 | 必须覆盖**全部**运行时文件（含 `web`、`cordis.patch.yml`、`locale`、图标） | 打包按它过滤（npm 发布、pnpm 的 git 安装都会走打包），漏一项就是安装后缺文件 |
| `dsh.bundle.patch` | ✅ | 字符串或字符串数组（数组按序应用） | 缺失 → 「这个包没有声明组合包，不能作为插件管理」 |
| `dsh.client.platform` | 有 UI 时 | 必须 `"web"` | 否则客户端构建不选它 |
| `dsh.client.immediately` | 可选 | `true` = 第一阶段注册屏障 | 面板要在首屏可用就设 `true` |
| `dsh.client.inject` | 可选 | 包名数组，仅信息性 | 不是 Cordis 服务注入 |
| `dsh.client.external` | 可选 | 额外模块表请求，如 `"react-dom/client"` | 缺省只有基线外部模块 |
| `dsh.manifestVersion` | 可选 | 目前只有 `1` | 本项目未声明，不声明也可 |
| `dsh.profile.bundles` | 仅 profile | 有序包名数组 | 决定组合顺序，插件包不要写 |

### 3.2 完整样例

```json
{
  "name": "your-plugin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "一句话说明这个插件做什么。",
  "engines": { "dsh": "0.2.1-rc.5" },
  "icon": "./icon.svg",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./icon": "./icon.svg",
    "./locale/*.json": "./locale/*.json",
    "./package.json": "./package.json"
  },
  "files": [
    "index.js",
    "client.js",
    "cordis.patch.yml",
    "locale/*.json",
    "icon.svg",
    "web"
  ],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "immediately": true }
  }
}
```

> 只做后台能力、没有界面时：删掉 `./client`、`dsh.client`、`client.js`、`web`，其余不变。

---

## 4. `cordis.patch.yml` 契约

顶层必须是**数组**。已确认的两种条目：

### 4.1 插入插件行（插件包唯一必需的写法）

```yaml
- insert:
    - id: your-plugin          # 加载器里这一行的唯一 id，短横线命名，发布后不要改
      name: 'your-plugin'      # 模块说明符 = 包名（不是路径）
      # config:                # 可选：传给 apply 的配置对象
      #   someOption: true
```

规则：

- `insert` 必须是数组，可以插多行（一个包内多个子插件）；**但启停粒度跟着行走，多行会被一起装/一起卸**。
- 每行必须有 `id` 与 `name`。
- **必须有一行的 `name` 等于 `package.json.name`**（本项目自检强制；否则加载器按包名寻址会失败）。
- `id` 全局唯一，避免与宿主内置行（如 `ui-chat`）撞名。

### 4.2 按 id 覆盖已有行（消费方用，插件包一般不用）

```yaml
- id: ui-settings
  name: '@deepseek-ai/dsh-client-ui-settings'
  config:
    enabled: true
```

组合顺序（本机 profile 验证）：`dsh.profile.bundles` 数组顺序应用各包 patch → profile 自己的 `cordis.patch.yml` → 命令行 `--patch` 覆盖。
**后应用的层覆盖前面的**，这是"插件默认配置 + 用户覆盖"的实现方式。

> ⚠️ 未验证：禁用/移除行的确切语法。加载器注释提到"id-targeted config overrides, disables, and insert lists"，但本机没有 disable 实例。不要凭空写 `remove:` 之类；要禁用行，用宿主的 `setPluginEnabled` 接口。

---

## 5. Host 半边（`index.js`）

### 5.1 契约

- ESM 模块，导出 `apply(ctx)`（Cordis 插件体）。
- 可选导出 `name`、`inject`（依赖的服务名数组）。
- 在 `apply` 里**只做注册**，副作用必须包在 `ctx.effect(..., label)` 里以便卸载时清理。
- 需要宿主服务时：`ctx.get('serviceName')` 取可选服务（取不到返回 `undefined`，要给出可读的降级提示）；`ctx.inject(['a','b'], scoped => ...)` 等依赖就绪后再注册。

### 5.2 最小可运行样例（纯静态页 + JSON 接口）

```js
export const name = 'your-plugin'
export const inject = []

export function apply(ctx) {
  ctx.inject(['webServer'], (scoped) => {
    scoped.effect(
      () => scoped.webServer.register({
        kind: 'prefix',
        path: '/your-plugin',
        handler: (req, res) => {
          // 静态文件 + /your-plugin/api/rpc
        },
      }),
      'your-plugin:web-route',
    )
  })
}
```

已验证的宿主能力（来自本项目与已装插件）：

| 能力 | 用法 | 说明 |
|---|---|---|
| 挂 HTTP 前缀路由 | `ctx.webServer.register({ kind: 'prefix', path, handler })` | 必须 `ctx.inject(['webServer'])`；卸载时自动撤销 |
| 取宿主服务 | `ctx.get('pluginManager')` / `ctx.get('pluginMarket')` | 缺失时降级，不要抛到顶层 |
| 注册远程服务 | `TypertRemoteService` + `Remote`（`@deepseek-ai/dsh-typert-protocol`） | 另一种前后端通道，见 `qiaomu-ui-learn-dsh` |
| 持久化 | 自己写 `~/.dsh/storages` 或包内 `state.json`（原子 rename + revision 校验） | 宿主不代管 |

⚠️ 未验证：模型工具（tool）、命令（command）、配置 schema 的注册 API。若拆分后需要"让模型调用"，不要照本文猜接口，先对 DSH 源码确认。

### 5.3 路由自查项（本项目踩过的）

- 前缀路径**不带尾斜杠**时要 308 补 `/`，否则相对资源解析到站点根。
- 静态文件做路径穿越防护：`path.resolve` 后必须仍在 `WEB_ROOT` 内；`..`、`%2e%2e`、`\0` 一律拒。
- 写接口只接受 `POST` + 同源（`sec-fetch-site !== 'cross-site'`，`origin.host === host`），请求体设上限（本项目 512 KiB）。
- `web/index.html` 缺失时返回 **503 + 可执行修复提示**，不要空白页。
- 长任务（跑 pnpm 安装）要摘掉连接空闲超时：`req.setTimeout(0)`。

---

## 6. Client 半边（`client.js`）

### 6.1 契约

**手写，不参与构建**，因为 DSH 直接把它当浏览器模块加载。必须自包含：

```js
window.__ModuleLoader__.load({
  id: 'your-plugin',                 // 与包名一致
  factory(require) {
    const React = require('react')   // React 由浏览器模块表提供
    // ...组件...
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register('yourPlugin', COPY), 'your-plugin:copy')
        const t = ctx.locale.bind('yourPlugin')

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'your-plugin',
              order: 30,
              label: () => t('panel.title'),
              locale: 'yourPlugin',
            },
            IconComponent,
          ),
        )
        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: 'your-plugin', locale: 'yourPlugin' }, Panel),
        )
      },
    }
  },
})
```

禁止：

- `require('@deepseek-ai/dsh-client-*')` —— 这些包不在浏览器模块表里，运行时报错。
- 相对路径 import 未打包的源码 —— 浏览器只拿到 `client.js` 一个文件。
- 顶层执行副作用 —— 必须放在 `apply` 里，否则停用插件时清不掉。

### 6.2 已验证的槽位

| 槽位 | 用途 | 建议字段 |
|---|---|---|
| `sidebar.panellist` | 左侧栏图标入口 | `id`、`order`（数字，小的靠上）、`label()`、`locale` |
| `main` | 主面板内容区 | `key`（与 `sidebar.panellist` 的 `id` 配对）、`locale` |

两处 `id` / `key` 必须配对，点侧栏才能在主区打开对应面板。除这两个槽位外，**没有验证过别的槽位名**，不要臆造。

### 6.3 组件必须自己处理

- 主题：继承 `color: inherit` / `currentColor`，不要写死深浅色。
- 尺寸：面板容器给的是全高，`iframe` 用 `width/height: 100%`。
- 文案：中英双语必须都有（见 §7），不要只写中文。

---

## 7. locale 与图标

### 7.1 `locale/{en,zh}.json`

```json
{
  "meta": {
    "title": "插件名",
    "description": "一句话描述，插件管理器列表里显示。"
  }
}
```

- 两个语言文件都要有，`meta.title` 与 `meta.description` 都不能空（本项目自检强制）。
- 语言键用小写语言 id，`en` 必须存在（官方索引校验器同规则）。
- 客户端自己的 UI 文案不放在这里，放在 `client.js` 的 `COPY` 里，用 `ctx.locale.register` 注册。

### 7.2 图标

- 二选一：包根 `icon: "./icon.svg"`，或 `exports["./icon"]`（本项目两者都有）。
- 格式：SVG / PNG / JPEG / WebP；**≤ 256 KiB**（manifest 类型声明）。
- 图标要能单色适配：用 `currentColor` 描边，别用大面积实色底。

> ⚠️ `package.json.dsh.meta.title` / `.description` 被两个已装插件用于展示，但它**不在官方公共类型里**，属于宿主内部字段。要兼容性最好，以 `locale/*.json` 为准，`dsh.meta` 作补充。

---

## 8. 前端形态三选一（拆分时最关键的决策）

| | **A 纯客户端** | **B 自有 SPA（iframe）** | **C Host 服务 + 轻客户端** |
|---|---|---|---|
| Host 半边 | `apply() {}` 空 | `webServer` 挂 `web/` + RPC | 注册服务/接口 |
| Client 半边 | React 组件直挂槽位 | 只做 iframe 壳 | 薄 UI，调接口 |
| 构建 | esbuild 打成单文件 `client.js` | 两套：前端构建 → `web/`，`client.js` 手写 | 同 A |
| 需要 Node 能力 | ❌ | ✅（fs / net / child_process） | ✅ |
| 复用既有前端工程 | 要重写成 React 模块 | **零重写**，直接搬 | 部分复用 |
| 安装体积 | 最小 | 大（含构建产物） | 小 |
| 样式隔离 | 与宿主同层，需自律 | iframe 天然隔离 | 同层 |
| 适用 | 小工具、列表、仪表盘 | 已有完整 SPA 的项目 | 后台能力强、界面简单 |

**判定顺序**（回答三个问题即可）：

1. 这个功能需要读写本机文件 / 起子进程 / 长驻连接吗？→ 需要就必须有 Host 半边（B 或 C）。
2. 它已经有独立前端工程（Vue/React SPA、自己的路由）吗？→ 有就选 B，别重写。
3. 界面只是几个表单和列表吗？→ 选 A，最轻。

一个包里不要混用 A 和 B：既挂 iframe 又直挂 React 面板，会让"停用插件"的清理路径出现两套，容易漏。

---

## 9. 对外发布才需要：索引 `format: 1`

不发布到市场就跳过本节；只要能被 `dsh plugin add` 装，前三节够了。

### 9.1 文档骨架

```json
{
  "format": 1,
  "title": { "en": "Your Index", "zh": "你的索引" },
  "description": { "en": "...", "zh": "..." },
  "metadata": {
    "categories": { "tools": { "title": { "en": "Tools", "zh": "工具" } } },
    "labels": {},
    "sortKeys": {}
  },
  "plugins": [
    {
      "name": "your-plugin",
      "title": { "en": "Your Plugin", "zh": "你的插件" },
      "description": { "en": "...", "zh": "..." },
      "author": "Your Name",
      "icon": "https://raw.githubusercontent.com/you/repo/<commit>/icon.svg",
      "homepage": "https://github.com/you/repo",
      "repository": { "url": "https://github.com/you/repo" },
      "metadata": { "category": "tools", "keywords": ["your-plugin"], "labels": [], "sortKeys": {} },
      "versions": [
        {
          "version": "0.1.0",
          "publishTimestamp": 1790000000,
          "source": {
            "type": "git",
            "url": "https://github.com/you/repo",
            "commit": "0123456789abcdef0123456789abcdef01234567"
          },
          "engines": { "dsh": "0.2.1-rc.5" }
        }
      ]
    }
  ]
}
```

### 9.2 校验器硬规则（逐条，违反即报错并给出 JSON 路径）

**顶层**

- `format` 必须严格等于 `1`。
- `title` 必需；`description` 可选。
- `LocalizedText` 是字符串，或**必须含 `en`** 的语言映射；语言键必须匹配 `^[a-z]{2,8}(-[a-z0-9]{1,8})*$`。
- 未定义的成员会被**静默丢弃**（不是报错），别指望带自定义字段。

**plugin**

- `name` 合法 npm 包名、≤214 字符、索引内唯一。
- `metadata.category` / `labels` / `sortKeys` 的 id **必须先在顶层 `metadata` 里声明**，否则报 `references undeclared id`。
- `labels` 不许重复。
- `repository.url` 绝对 http(s)，不带凭据/查询/片段；`directory` 只能是安全相对路径（无 `.`/`..`）。
- `homepage` 绝对 http(s)，允许 `#readme` 这类片段。

**version**

- `versions` 非空、同插件内版本不重复；校验器会按 SemVer 降序排序。
- `version` 必须是精确 SemVer（`1.0.0`，不能 `^1.0.0`）。
- `publishTimestamp` 必须是**整数 Unix 秒**，范围 `[0, 1e11)`；写成毫秒会被拒。
- `source.type` 只允许 `"npm"` 或 `"git"`：
  - `git`：`url` 必须是**规范化的 https** 仓库地址（≥2 段路径、不能是 tarball、不能带 `.git` 以外的修饰），`commit` 必须是**40 位小写 hex**，`path` 可选（包在仓库子目录时）。
  - `npm`：`registry` 可选。
- `engines.dsh` 必须是合法 SemVer 范围，且不许 `workspace:` 前缀；**省略 = 任意 DSH 版本**。

**icon**

- `data:` URL：只允许 SVG/PNG/JPEG/WebP 的 base64，解码后 ≤ **32 KiB**。
- 普通 URL：必须解析为 `https:`，或与索引同源。相对路径按索引 URL 解析。

### 9.3 安装串怎么生成

| 来源 | pnpm spec |
|---|---|
| npm | `name@version` |
| git | `git+<url>.git#<commit>`，有子目录时追加 `&path:/<dir>` |

例：`git+https://github.com/you/repo.git#0123456789abcdef0123456789abcdef01234567&path:/packages/plugin`

### 9.4 生成器义务（校验器**不**替你做）

- `version` / `engines.dsh` 必须与该 commit 上的 `package.json` 一致；升版必须重抓，否则兼容标注会挂着旧范围。
- `publishTimestamp` 取 Release 发布时间，未发版取 `package.json` 变更提交时间。
- 索引只登记**已发布**版本；分支是活口，不要写进索引。
- 自己的索引不要写 `metadata.labels: ["official"]`——`official` 语义是 DSH 官方收录。

---

## 10. 拆分方法论

### 10.1 按这个顺序判定切分点

1. **启停价值**：用户会不会想单独关掉它？会 → 独立包。
2. **运行时依赖**：需要 Node 能力吗？需要 → 该包必须有 Host 半边。
3. **前端形态**：有独立 SPA 吗？有 → B 形态，整块搬，不重写。
4. **共享状态**：两个功能读写同一份状态吗？是 → **不要拆**，拆了要同步两份，必然漂移。
5. **发布节奏**：版本是否独立演进？独立 → 独立包。

### 10.2 粒度

- 一个包 = 一个用户可感知的功能块 = 一条 patch 行 = 一个侧栏入口（如果它需要 UI）。
- 一个包里多个子能力：可以插多行，但**启停会绑在一起**，只适合"必须同生共死"的组合。
- 不要按技术分层切（"所有 API 一个包、所有 UI 一个包"）：那会得到一个装不上也卸不掉的巨包 + 一堆空壳。

### 10.3 共享代码

| 类型 | 做法 |
|---|---|
| 宿主提供的（`@deepseek-ai/cordis`、`dsh-typert-protocol`） | `peerDependencies` + `peerDependenciesMeta.optional`，不要打进产物 |
| 自己写的公共库 | 独立 npm 包，或同仓 `path:` 子目录，普通 `dependencies` |
| bundle 之间 | **禁止**相对路径 import 另一个 bundle。卸载一个就会连带崩另一个 |

### 10.4 命名

- 包名：小写连字符；社区惯例 `xxx-dsh` 或 `dsh-xxx`，二选一并统一。
- patch 行 `id`：短横线，发布后不改（用户配置按 id 定位）。
- `client.js` 的 `id`：与包名一致。
- 面板 `id` / `key`：稳定，改了会丢用户的布局记忆。

### 10.5 反模式

- ❌ 原项目原样塞进一个包 —— 等于没拆，启停粒度仍是 0 或 1。
- ❌ 为了"看起来拆了"而把 `client.js` 拆成多个包共用一个 iframe 页面 —— 路由会打架。
- ❌ bundle 之间互相 import。
- ❌ `web/` 不提交，指望安装时构建。
- ❌ `vite base` 用绝对路径（`/`），挂到 `/xxx/` 前缀下全部 404。
- ❌ 索引里写浮动版本、分支名、`workspace:`。
- ❌ 给自己的索引条目加 `official` 标签。

---

## 11. 交接模板（给执行引擎的施工单）

### Step 1 · 盘点（先出表，不动代码）

| 模块 | 现状形态 | 归属包 | 形态 A/B/C | 需要的宿主服务 | 启停价值 | 优先级 |
|---|---|---|---|---|---|---|
| | | | | | 高/中/低 | P0/P1/P2 |

产出后先确认三件事：包数量、每个包的形态、哪些代码要被复制而不是共享。

### Step 2 · 目标树

```
repo/
├── packages/
│   ├── plugin-a/   (A 形态)
│   │   ├── package.json  cordis.patch.yml  index.js  client.js
│   │   ├── locale/{en,zh}.json  icon.svg
│   │   └── src/ (client.js 的源，构建产物覆盖 client.js)
│   └── plugin-b/   (B 形态)
│       ├── package.json  cordis.patch.yml  index.js  client.js
│       ├── web/ (随包提交)  src/ (SPA 源)
│       └── locale/  icon.svg
└── index.json (可选，对外发布时)
```

### Step 3 · 逐包施工顺序（顺序不能换）

1. `package.json`（含 `dsh.bundle.patch`、`exports`、`engines.dsh`）
2. `cordis.patch.yml`（`name` 必须等于包名）
3. `index.js`（先空 `apply()`，跑通加载再填逻辑）
4. `locale/{en,zh}.json` + 图标
5. `client.js`（或 `web/` 构建产物）
6. 自检 → 本地安装 → 重启 DSH → 面板可见
7. 再补业务逻辑，每步重跑自检

### Step 4 · 验收命令

```bash
# 1) 组合包自检（本仓库口径，最严）
npm run validate:bundle

# 2) 构建（B 形态才有；产物必须进 web/ 并提交）
npm run build

# 3) 索引校验（有 index.json 时）
node scripts/validate-index.mjs index.json

# 4) 本地安装（开发期）
dsh plugin --profile <profile> add /absolute/path/to/plugin

# 5) 按提交安装（模拟用户）
dsh plugin --profile <profile> add github:owner/repo
```

手工核查（B 形态必做）：

- `/your-plugin/` → 200，页面可见
- `/your-plugin`（无尾斜杠）→ 308 到带斜杠
- `/your-plugin/../../etc/passwd` → 非 200
- 删掉 `web/` → 503 且带"请运行 npm run build"提示
- 停用插件 → 侧栏入口消失、路由 404；再启用 → 恢复

---

## 12. 红线

1. 不伪造 `engines.dsh`：必须和该 commit 的 `package.json` 一致。
2. 不在 `client.js` 里 `require` `@deepseek-ai/dsh-client-*`。
3. 不在插件包里写 profile 的 `dsh.profile.bundles`。
4. 不手改 `~/.dsh` 下的 `cordis.yml`（组合靠 patch 层，改根文件会被覆盖）。
5. 索引只收发布版本，commit 必须 40 位小写 hex。
6. `official` 标签只属于 DSH 官方。
7. 一个包不要既挂自有 SPA 又直挂 React 面板。

---

## 13. 未验证事项（动之前先对源码）

| 事项 | 状态 |
|---|---|
| patch 里禁用 / 移除行的语法 | 只有 insert 与 id 覆盖的实例；禁用请走 `setPluginEnabled` |
| 多行 `insert` 的加载顺序是否严格按数组序 | 推测是，未验证 |
| 除 `main` / `sidebar.panellist` 外的槽位名 | 未验证，勿臆造 |
| 模型工具 / 命令 / 配置 schema 的注册 API | 未验证；需要时读 DSH 源码 |
| `dsh.meta.title` 是否所有 DSH 版本都读 | 两个已装插件在用，但不在公共类型里 |

---

## 14. 可直接粘贴给执行引擎的启动指令

```text
任务：把现有项目按 DSH 插件（组合包）规范拆分，规范见 docs/hosts/dsh-spec.md，严格执行，不要自创字段。

第一步（只读，不改代码）：产出模块盘点表，列 模块 / 现状形态 / 归属包 / 形态(A|B|C) / 需要的宿主服务 / 启停价值 / 优先级。
切分判据依次是：能否独立启停 → 是否需要 Node 能力 → 是否有独立 SPA → 是否共享同一份状态（共享则不拆）→ 是否独立发版。

第二步：给出目标仓库树与每个包的 package.json 草案，等我确认。

第三步：逐包施工，顺序固定：package.json → cordis.patch.yml（name 必须等于包名）→ index.js 空 apply() 跑通 →
locale/{en,zh}.json + 图标 → client.js 或 web/ 产物 → 自检 → 本地安装 → 重启 DSH 验证面板。

每一步必须跑 npm run validate:bundle；B 形态必须提交 web/ 且 vite base 为 './'。
禁止：client.js 里 require @deepseek-ai/dsh-client-*；bundle 之间相对路径 import；索引写分支或浮动版本；给条目加 official 标签。
未在规范里验证过的接口（工具/命令/配置 schema、main 与 sidebar.panellist 之外的槽位）先停下来问我，不要猜。
```
