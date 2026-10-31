import type {
  InstalledBundle,
  MarketEntry,
  MarketIndexSummary,
  MarketLabel,
  MarketVersion,
  OperationResult,
  PluginRow,
  RepoBranch,
} from '../types/plugin'

/**
 * 真实插件内核接口层：浏览器侧只做一次 JSON-RPC，落到本包 Host 半边的
 * `/deepseekbox/api/rpc`，由它在 DSH 进程里调用 pluginManager / pluginMarket 服务。
 *
 * 这里不做任何本地状态：每次调用都问宿主，避免 UI 与真实状态分叉。
 */

const ENDPOINT = './api/rpc'

export class PluginApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'PluginApiError'
    this.code = code
  }
}

interface RpcPayload<T> {
  ok: boolean
  result?: T
  error?: { code?: string; message?: string; diagnostic?: string }
}

async function rpc<T>(method: string, params?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method, params: params ?? {} }),
    })
  } catch {
    throw new PluginApiError('host-unreachable', '没有连上 DSH 宿主，插件中心需要在 DeepSeek Harness 里打开')
  }

  const payload = (await response.json().catch(() => null)) as RpcPayload<T> | null
  if (response.status === 404 || payload === null) {
    throw new PluginApiError('host-unreachable', '没有连上 DSH 宿主，插件中心需要在 DeepSeek Harness 里打开')
  }
  if (!response.ok || payload.ok !== true) {
    const code = payload.error?.code ?? 'operation-error'
    const message = payload.error?.diagnostic ?? payload.error?.message ?? `宿主返回 ${response.status}`
    throw new PluginApiError(code, message)
  }
  return payload.result as T
}

// ============ 原始结构（DSH 远程面） ============

type Localized = string | Record<string, string>

interface RawMeta {
  title?: Localized
  description?: Localized
  icon?: string
  error?: string
}

interface RawBundle {
  name: string
  official: boolean
  availability: 'profile' | 'installation' | 'missing'
  version?: string
  meta?: RawMeta
  description?: string
  enabled: boolean
  installed: boolean
  optional: boolean
  removable: boolean
  readOnlyReason?: 'management-required' | 'unaddressable'
  source?: string
  error?: { code: string; diagnostic?: string }
  rows: Array<{ rowId: string; moduleName: string; meta?: RawMeta; entryId?: string }>
}

interface RawPlugin {
  entryId: string
  moduleName: string
  meta?: RawMeta
  enabled: boolean
  fiberPhase: PluginRow['fiberPhase']
  readOnlyReason?: 'management-required' | 'unaddressable'
}

interface RawMarketEntry {
  name: string
  title?: Localized
  description?: Localized
  icon?: string
  author?: string
  homepage?: string
  repository?: { url: string; directory?: string }
  metadata: { category?: string; keywords: string[]; labels: string[] }
  versions: Array<{
    version: string
    install: { spec: string; registry?: string }
    compatibility: { compatible: boolean; requirements?: Record<string, string> }
  }>
  defaultVersion?: string
  installation: { status: MarketEntry['installation']['status']; installedVersion?: string }
}

interface RawSearchResult {
  url: string
  title: Localized
  fetchedAt?: number
  entries: RawMarketEntry[]
  total: number
  nextOffset: number | null
}

function localized(value: Localized | undefined): string | undefined {
  if (typeof value === 'string') return value
  if (value === undefined) return undefined
  return value.zh ?? value.en ?? Object.values(value)[0]
}

/**
 * 收录来源由索引自己声明：
 * - labels 里的 `official` 才算 DSH 官方（本 Box 的索引不写这个标记）；
 * - keywords 里的 `deepseekbox` 表示收录在本 Box 的索引里；
 * - 其余索引源一律按第三方处理。
 */
function marketLabelOf(metadata: RawMarketEntry['metadata']): MarketLabel {
  if ((metadata.labels ?? []).includes('official')) return 'official'
  if ((metadata.keywords ?? []).includes('deepseekbox')) return 'catalog'
  return 'third-party'
}

// ============ 本地组合包 ============

/** 拉一次宿主状态，把 bundle 行与 Loader 条目对上（行本身不带启停状态） */
export async function listBundles(): Promise<InstalledBundle[]> {
  const [bundles, plugins] = await Promise.all([
    rpc<RawBundle[]>('listBundles'),
    rpc<RawPlugin[]>('listPlugins'),
  ])

  const byEntry = new Map(plugins.map((plugin) => [plugin.entryId, plugin]))
  const byModule = new Map<string, RawPlugin>()
  for (const plugin of plugins) {
    if (!byModule.has(plugin.moduleName)) byModule.set(plugin.moduleName, plugin)
  }

  return bundles.map((bundle): InstalledBundle => {
    const rows = bundle.rows.map((row): PluginRow => {
      const entry = (row.entryId ? byEntry.get(row.entryId) : undefined) ?? byModule.get(row.moduleName)
      return {
        rowId: row.rowId,
        moduleName: row.moduleName,
        entryId: entry?.entryId,
        title: localized(row.meta?.title) ?? row.rowId,
        description: localized(row.meta?.description) ?? '',
        enabled: entry?.enabled ?? false,
        fiberPhase: entry?.fiberPhase ?? null,
        readOnlyReason: entry?.readOnlyReason,
      }
    })

    return {
      name: bundle.name,
      title: localized(bundle.meta?.title) ?? bundle.name,
      description: localized(bundle.meta?.description) ?? bundle.description ?? '',
      version: bundle.version,
      icon: bundle.meta?.icon,
      enabled: bundle.enabled,
      installed: bundle.installed,
      availability: bundle.availability,
      official: bundle.official,
      optional: bundle.optional,
      removable: bundle.removable,
      readOnlyReason: bundle.readOnlyReason,
      source: bundle.source,
      error: bundle.error,
      rows,
    }
  })
}

export async function setBundleEnabled(name: string, enabled: boolean): Promise<OperationResult> {
  return rpc<OperationResult>('setBundleEnabled', { name, enabled })
}

export async function setPluginEnabled(entryId: string, enabled: boolean): Promise<OperationResult> {
  return rpc<OperationResult>('setPluginEnabled', { entryId, enabled })
}

export async function removeBundle(name: string): Promise<OperationResult> {
  return rpc<OperationResult>('removeBundle', { name })
}

export async function installBundle(
  spec: string,
  options: { registry?: string | null; approvedBuilds?: string[] } = {},
): Promise<OperationResult> {
  return rpc<OperationResult>('installBundle', { spec, ...options })
}

export async function hostStatus(): Promise<{ pluginManager: boolean; pluginMarket: boolean }> {
  return rpc<{ pluginManager: boolean; pluginMarket: boolean }>('status')
}

// ============ 仓库分支 ============

/** 列出插件仓库的分支（宿主用 git ls-remote 读，不消耗 GitHub API 配额） */
export async function listRepoBranches(repo: string): Promise<RepoBranch[]> {
  const result = await rpc<{ repo: string; branches: RepoBranch[] }>('repoBranches', { repo })
  return result.branches ?? []
}

// ============ 插件商场 ============

export async function listIndexes(): Promise<MarketIndexSummary[]> {
  return rpc<MarketIndexSummary[]>('listIndexes')
}

export async function setIndexes(urls: string[]): Promise<void> {
  await rpc<null>('setIndexes', { urls })
}

/** 拉一页索引条目；offset / fetchedAt 由调用方串起来翻页 */
export async function searchIndex(
  url: string,
  query: {
    text?: string
    offset?: number
    limit?: number
    refresh?: boolean
    fetchedAt?: number
  } = {},
): Promise<{
  entries: MarketEntry[]
  indexTitle: string
  total: number
  nextOffset: number | null
  fetchedAt?: number
}> {
  const result = await rpc<RawSearchResult>('searchMarket', {
    url,
    query: {
      text: query.text ?? '',
      sort: { kind: 'index' },
      offset: query.offset ?? 0,
      limit: query.limit ?? 100,
      refresh: query.refresh === true,
      ...(query.fetchedAt === undefined ? {} : { fetchedAt: query.fetchedAt }),
    },
  })

  const indexTitle = localized(result.title) ?? url
  const entries = result.entries.map((entry): MarketEntry => {
    const versions: MarketVersion[] = entry.versions.map((version) => ({
      version: version.version,
      spec: version.install.spec,
      registry: version.install.registry,
      compatible: version.compatibility.compatible,
      requirements: version.compatibility.requirements,
    }))
    const preferred =
      versions.find((version) => version.version === entry.defaultVersion) ??
      versions.find((version) => version.compatible) ??
      versions[0]

    return {
      name: entry.name,
      title: localized(entry.title) ?? entry.name,
      description: localized(entry.description) ?? '',
      icon: entry.icon,
      author: entry.author,
      homepage: entry.homepage,
      repository: entry.repository?.url,
      category: entry.metadata.category,
      keywords: entry.metadata.keywords ?? [],
      labels: entry.metadata.labels ?? [],
      // 来源以索引的声明为准（labels 的 official / keywords 的 deepseekbox），不猜
      label: marketLabelOf(entry.metadata),
      defaultVersion: entry.defaultVersion ?? preferred?.version,
      versions,
      installation: entry.installation,
      indexUrl: result.url,
      indexTitle,
    }
  })

  return {
    entries,
    indexTitle,
    total: result.total,
    nextOffset: result.nextOffset,
    fetchedAt: result.fetchedAt,
  }
}
