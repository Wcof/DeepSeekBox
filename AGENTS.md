# DeepSeekBox · DeepSeek Harness 桌面端

DeepSeek Harness 桌面端 APP 的前端工程，当前包含插件中心（安装、更新与管理插件）。

## 核心目录与职责

- `src/types/plugin.ts` —— 插件领域类型与纯函数（版本比较、作者展示），不依赖 UI。
- `src/data/catalog.ts` —— 插件收录库的唯一维护入口（官方收录库 + 第三方收录区，按创作者划分）；含初始本地插件与开发资料链接。
- `src/data/pluginIndex.ts` —— 插件市场索引源生成器：从收录库生成 DSH 插件索引（format 1），供「发现」页订阅。
- `src/services/pluginService.ts` —— 模拟插件内核接口层（内存状态 + 异步延迟）；接入真实内核时保持导出函数签名不变，UI 层无需改动。
- `src/stores/pluginCenter.ts` —— 插件中心唯一状态 owner（列表、搜索、筛选、busy、通知、确认弹窗），UI 只读 state 并调用 action。
- `src/components/plugin/` —— 插件中心页面：`PluginCenter`（双 Tab + 工具栏 + 列表状态）、本地/商场卡片、独立配置页。
- `src/components/ui/` —— 通用组件：通知条、确认弹窗、筛选下拉。
- `src/components/icons/` —— 图标常量与插件图标映射。
- `src/styles/global.css` —— 设计令牌与全局样式（按钮、标签、卡片、弹窗、通知条）。

## 技术栈与命令

- Vue 3 `<script setup>` + TypeScript + Vite；不引入 UI 组件库与路由库，样式手写。
- `npm run dev`（端口 5180）、`npm run build`（vue-tsc 类型检查 + 构建）、`npm run preview`。

## 工程边界

- 业务数据一律经 `pluginService`（未来为真实内核 client），UI 不直接改内存数据。
- 插件状态（运行中 / 已停用 / 未找到插件文件）与可用操作的映射只允许在卡片组件内实现，保持两 Tab 一致。
- 收录库分两区维护，均按创作者划分：
  - `OFFICIAL_REGISTRY`（官方收录）：仅收录用户确认的插件，当前为乔木 / joeseesun 系列；名称、别名、描述、版本、许可证需与插件仓库 README / Releases 一致。
  - `THIRD_PARTY_REGISTRY`（第三方收录）：经核实的社区 DSH 插件，标准相同——仓库真实存在、确为 DSH 插件（`dsh plugin add` 可装 / 声明 dsh.bundle），版本与许可证核对自仓库 package.json / LICENSE；展示时带「第三方」标签并按创作者分组。
- 收录检索入口参考 awesome-dsh-plugin 清单与 GitHub topic（`deepseek-harness`、`dsh-plugin`）；非 DeepSeek Harness 宿主的插件（如 CLIProxyAPI 插件）不得收录。
- 未收录进两个登记区的插件归入「其他创作者」分组；新增创作者在对应登记区新增分组，不为单条插件改分组逻辑。
- 索引源：`/index.json` 由 `vite.config.ts` 的 `pluginIndexSource` 插件提供（dev 中间件 + build 产物），格式为 DSH 插件索引 `format: 1`；仓库根目录的 `index.json` 由 `npm run build` 的 postbuild 脚本从 `dist/index.json` 同步生成并提交，供 raw / jsDelivr 稳定引用，禁止手工编辑。只改 `src/data/pluginIndex.ts` 的映射逻辑来调整索引输出。`versions[].publishTimestamp` 因仓库未提供发布时间而省略，属已知差异。对外索引 URL：`https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json` 与 `https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`。

## 验证入口

- 改动后运行 `npm run build`；涉及 UI 视觉时启动 `npm run dev` 并核对两个 Tab、配置页、通知条与确认弹窗。
- 涉及收录库或索引时：`npm run build` 后检查 `dist/index.json`（8 个插件、format 1），并用 `npm run preview` 确认 `/index.json` 可访问。
- 操作路径清单：检查更新 → 一键更新、单个更新、启用/停用、删除二次确认、商场下载、本地安装、配置页保存。

## 项目特有红线

- 不在 `data/catalog.ts` 中编造插件数据；版本、许可证等信息以插件仓库实际发布为准，无法核实处标记「待确认」。
- 界面参考图只约束视觉风格，不照搬图中的示例插件与示例操作。
