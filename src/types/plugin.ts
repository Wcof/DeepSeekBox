export type StoreFilter = 'all' | 'available' | 'installed'

/** 组合包在磁盘上的可读位置：profile 依赖、随安装附带、或已缺失 */
export type BundleAvailability = 'profile' | 'installation' | 'missing'

export type ReadOnlyReason = 'management-required' | 'unaddressable'

/** 组合包内的一行 Loader 插件 */
export interface PluginRow {
  rowId: string
  moduleName: string
  /** Loader 条目身份，来自 listPlugins；缺失时该行不可单独启停 */
  entryId?: string
  title: string
  description: string
  enabled: boolean
  fiberPhase: 'failed' | 'pending' | 'active' | 'loading' | 'unloading' | null
  readOnlyReason?: ReadOnlyReason
}

export interface BundleError {
  code: string
  diagnostic?: string
}

/** 已安装（或被随附）的组合包，数据来自 DSH 的 pluginManager.listBundles */
export interface InstalledBundle {
  /** 包名，唯一标识 */
  name: string
  title: string
  description: string
  version?: string
  /** 包内导出的图标，data: URL */
  icon?: string
  enabled: boolean
  installed: boolean
  availability: BundleAvailability
  official: boolean
  optional: boolean
  removable: boolean
  readOnlyReason?: ReadOnlyReason
  /** profile 里保存的安装来源（git / 本地路径等） */
  source?: string
  error?: BundleError
  rows: PluginRow[]
  /** 检查更新后填充 */
  latestVersion?: string
  updateSpec?: string
}

export interface MarketVersion {
  version: string
  spec: string
  registry?: string
  compatible: boolean
  requirements?: Record<string, string>
}

/** 索引源里的一个插件，数据来自 DSH 的 pluginMarket.search */
export interface MarketEntry {
  name: string
  title: string
  description: string
  icon?: string
  author?: string
  homepage?: string
  repository?: string
  category?: string
  keywords: string[]
  label: 'official' | 'third-party'
  defaultVersion?: string
  versions: MarketVersion[]
  installation: {
    status: 'not-installed' | 'installed' | 'update-available' | 'different-version' | 'provided'
    installedVersion?: string
  }
  indexUrl: string
  indexTitle: string
}

export interface MarketIndexSummary {
  url: string
  title?: string
  error?: string
}

/** 启停 / 删除 / 安装这类操作的统一结果 */
export interface OperationResult {
  changed: boolean
  application: 'cancelled' | 'failed' | 'applied' | 'restart-required' | 'overridden'
  stage: 'remove' | 'install' | 'enable'
  target: string
  enabled?: boolean
  restartReason?: string
  error?: BundleError & { message?: string }
  warnings?: string[]
}

/** 通知条类型 */
export type ToastType = 'success' | 'info' | 'warning' | 'error'

export interface Toast {
  id: number
  type: ToastType
  text: string
}

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

/** 作者展示：full 显示 “id（中文名）”，否则优先中文名 */
export function authorLabel(author: string, authorName?: string, full = false): string {
  if (!authorName) return author
  return full ? `${author}（${authorName}）` : authorName
}
