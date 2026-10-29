export type PluginSource = 'official' | 'third-party'

/** 本地插件运行状态 */
export type PluginStatus = 'running' | 'stopped' | 'missing-file'

/** 商场筛选 */
export type StoreFilter = 'all' | 'available' | 'installed'

/** 插件配置项类型 */
export type ConfigFieldType = 'text' | 'number' | 'boolean' | 'select'

export interface ConfigField {
  key: string
  label: string
  type: ConfigFieldType
  /** select 可选项 */
  options?: string[]
  /** number 输入的步长 */
  step?: number
  placeholder?: string
}

/** 商场中的插件条目 */
export interface StorePlugin {
  id: string
  /** 展示名称 */
  name: string
  /** 别名（如创作者使用的产品名） */
  alias: string
  description: string
  version: string
  /** 作者 GitHub ID */
  author: string
  /** 作者中文名等展示名 */
  authorName?: string
  license: string
  source: PluginSource
  /** 代码仓库 owner/repo */
  repo: string
  /** 卡片图标名（AppIcon 支持的名称，缺省为拼图） */
  icon?: string
  configSchema?: ConfigField[]
}

/** 已安装（本地）插件 */
export interface InstalledPlugin {
  id: string
  name: string
  alias: string
  description: string
  installedVersion: string
  /** 检查更新后填充；与 installedVersion 不同即可更新 */
  latestVersion?: string
  author: string
  authorName?: string
  status: PluginStatus
  /** 插件文件相对路径，missing-file 时为空 */
  filePath?: string
  /** 仓库外链展示名，如 “乔木 RSS” */
  repoLabel?: string
  repoUrl?: string
  /** 卡片图标名（AppIcon 支持的名称，缺省为拼图） */
  icon?: string
  configSchema?: ConfigField[]
  config: Record<string, string | number | boolean>
}

/** 通知条类型 */
export type ToastType = 'success' | 'info' | 'warning' | 'error'

export interface Toast {
  id: number
  type: ToastType
  text: string
}

/** 作者展示：full 显示 “id（中文名）”，否则优先中文名 */
export function authorLabel(author: string, authorName?: string, full = false): string {
  if (!authorName) return author
  return full ? `${author}（${authorName}）` : authorName
}

/** 版本号比较：a > b 返回 1，a < b 返回 -1，相等返回 0 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d > 0 ? 1 : -1
  }
  return 0
}
