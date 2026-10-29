# Goal：检索并收录 GitHub 上的 DeepSeek Harness 插件

- 创建时间：2026-10-30 00:06（北京时间）
- 状态：已完成（2026-10-30 00:16）

## 目标

检索 GitHub 上公开的 DeepSeek Harness（DSH）插件，核实后收录进插件中心的商场目录（DeepSeekBox），让商场除乔木官方收录外，还能展示其他创作者的第三方插件。

## 检索与核实结论

检索入口：GitHub API topic 检索（`topic:deepseek-harness`、`topic:dsh-plugin`）+ awesome-dsh-plugin 精选清单（收录标准：`dsh plugin add` 可安装、声明 `dsh.bundle` manifest）。候选中排除了桌面端发行版、插件市场、技能合集与 awesome 清单本身，也排除了非 DSH 宿主的插件。

最终收录 4 个第三方插件（均为 dsh-plugin 主题标签仓库，版本核对自 package.json、许可证核对自仓库 LICENSE）：

| 仓库 | 名称 | 别名 | 版本 | 许可证 |
| --- | --- | --- | --- | --- |
| 0xsline/dsh-spotlight | Spotlight | 命令面板 | 0.0.2 | MIT |
| asxiuxiu/dsh-quick-open | Quick Open | 快速打开 | 0.3.2 | MIT |
| btsd321/dsh-oh-my-terminal | Oh My Terminal | 终端面板 | 0.4.7 | Apache-2.0 |
| Ebony-Vinyl/dsh-our-free-model | Our Free Model | 免费模型接入 | 2.7.2 | MIT |

## 边界与约束

- 只收录确认真实存在、确为 DeepSeek Harness 插件的仓库；名称、别名、描述、版本、许可证、作者以仓库页面/README/Releases 为准，无法核实的字段标记「待确认」或不填写。
- 其他创作者的插件以 `source: 'third-party'`（第三方标签）收录，不写入官方收录库（`OFFICIAL_REGISTRY`）；新增 `THIRD_PARTY_REGISTRY` 数据结构并派生进商场目录。
- 非 DeepSeek Harness 宿主的插件（如 CLIProxyAPI 插件）不得收录。
- 收录后商场「其他创作者」分组与「第三方」标签、可安装/已安装筛选、下载流程必须正常工作。
- 不创建 Git 提交、不推送。

## 施工清单（检查点）

1. [x] 检索：GitHub API（topic:deepseek-harness、topic:dsh-plugin）+ awesome-dsh-plugin 清单找出候选仓库。
2. [x] 逐仓核实：4 个候选均确认为 DSH 插件，取 description、版本、许可证、作者。
3. [x] 数据层：新增 `THIRD_PARTY_REGISTRY`，`STORE_CATALOG` 由两区派生，补充 command/zap/square-terminal/folder-open 图标。
4. [x] 验证：`npm run build` 通过；浏览器核对商场分组（乔木 + 4 个第三方创作者）、第三方标签、可安装筛选与下载流程。
5. [x] 文档：AGENTS.md 收录边界更新、ROADMAP.md 完成与验证记录、本文档标记完成。

## 验收标准（核对结果）

- 收录 4 个经核实的第三方 DSH 插件 ✅（超过最少 1 个的要求）。
- 所有收录条目的描述/版本/许可证有仓库来源依据，无编造字段 ✅。
- 构建通过 ✅（2026-10-30 00:16 `npm run build` 含 vue-tsc 零错误）。
- 浏览器回归通过 ✅：第三方分组与标签、下载 Oh My Terminal → 本地出现为已停用、「可安装」筛选返回剩余 5 个。
- AGENTS.md / ROADMAP.md / 本文档同步更新 ✅。

## 交付结果

- 更新后的 `src/data/catalog.ts`（含第三方收录区）、`src/stores/pluginCenter.ts`、`src/components/icons/iconNames.ts`。
- 更新后的 goals 文档（本文件）、AGENTS.md、ROADMAP.md。
- 验证记录写入 ROADMAP.md「最近验证」。
