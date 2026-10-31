import { computed, reactive } from 'vue'
import type {
  BundleOrigin,
  InstalledBundle,
  LocalFilter,
  LocalSortKey,
  MarketEntry,
  MarketIndexSummary,
  OperationResult,
  RepoBranch,
  StoreFilter,
  StoreSortKey,
  Toast,
  ToastType,
} from '../types/plugin'
import { bundleOrigin } from '../types/plugin'
import * as service from '../services/pluginService'
import { DEV_GUIDE_URL } from '../data/catalog'

export type TabKey = 'local' | 'store'
type ListStatus = 'loading' | 'ready' | 'error'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  danger?: boolean
}

/** 本 Box 发布的索引源，供「一键订阅」使用 */
const SELF_INDEX_URL = 'https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json'

/**
 * 社区目录：从 dsh-plugin.org 同步的 5,000+ 条，逐条做过仓库级核实。
 * 单独发布、单独订阅——精选索引不掺沙子，需要全量的用户点一下就有。
 */
const COMMUNITY_INDEX_URL = 'https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/community.json'

/**
 * 插件中心唯一状态 owner：所有数据来自 DSH 宿主的 pluginManager / pluginMarket，
 * UI 只读 state 并调用 action，不持有任何本地副本。
 */
const state = reactive({
  activeTab: 'local' as TabKey,
  view: 'list' as 'list' | 'detail',
  detailName: null as string | null,

  bundles: [] as InstalledBundle[],
  market: [] as MarketEntry[],
  indexes: [] as MarketIndexSummary[],
  indexErrors: {} as Record<string, string>,
  indexTotals: {} as Record<string, number>,

  hostOnline: null as boolean | null,
  localStatus: 'loading' as ListStatus,
  storeStatus: 'loading' as ListStatus,

  localQuery: '',
  storeQuery: '',
  localFilter: 'all' as LocalFilter,
  storeFilter: 'all' as StoreFilter,
  /** 创作者多选，空数组表示不限；命中语义为「任一」 */
  storeAuthors: [] as string[],
  /** 分类多选（对应索引 metadata.category），空数组表示不限 */
  storeCategories: [] as string[],
  /** 社区目录有上千位作者，分面默认只显示前 12 位 */
  authorFacetsExpanded: false,
  localSort: 'status' as LocalSortKey,
  storeSort: 'index' as StoreSortKey,

  checkingUpdates: false,
  updatingAll: false,
  installOpen: false,
  /** 启动时静默检查出可更新后，用户点过「稍后」就收起提示条 */
  updateNoticeDismissed: false,
  /** 市场列表一次渲染多少条：社区目录有几千条，全渲染会卡住页面 */
  storeRenderLimit: 120,
  busy: {} as Record<string, boolean>,

  toasts: [] as Toast[],
  confirm: null as (ConfirmOptions & { resolve: (ok: boolean) => void }) | null,
})

let toastSeq = 0

function toast(type: ToastType, text: string): void {
  const id = ++toastSeq
  state.toasts.push({ id, type, text })
  setTimeout(() => dismissToast(id), 3800)
}

function dismissToast(id: number): void {
  const index = state.toasts.findIndex((t) => t.id === id)
  if (index >= 0) state.toasts.splice(index, 1)
}

function openConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    state.confirm = { ...options, resolve }
  })
}

function resolveConfirm(ok: boolean): void {
  state.confirm?.resolve(ok)
  state.confirm = null
}

async function withBusy<T>(key: string, fn: () => Promise<T>): Promise<T | undefined> {
  if (state.busy[key]) return undefined
  state.busy[key] = true
  try {
    return await fn()
  } finally {
    delete state.busy[key]
  }
}

const ERROR_TEXT: Record<string, string> = {
  'host-unreachable': '没连上 DSH 宿主，请在 DeepSeek Harness 里打开插件中心',
  'service-unavailable': '当前 profile 没有装载插件管理服务',
  'management-required': '这个包是插件管理所需，不能停用或卸载',
  unaddressable: '当前 profile 的 patch 无法唯一定位这一项',
  'unknown-plugin': '找不到这个插件',
  'invalid-spec': '包名或地址无法识别',
  'already-installed': '这个包已经安装；要换版本请先卸载',
  'not-bundle': '这个包没有声明组合包，不能作为插件管理',
  'not-removable': '这个包不属于当前 profile，或者是插件管理所需的组件',
  'stop-profile': '当前 profile 没有启用 HMR，无法在线卸载',
  'bundle-in-use': '还有配置在使用这个组合包的组件，请先停用它们',
  'stale-approval': '待允许的安装脚本列表已变化，请重新安装',
  'incompatible-version': '这个插件与当前 DSH 版本不兼容',
  'github-rate-limited': 'GitHub 接口被限流了，过几分钟再试',
  'repo-unavailable': '找不到这个仓库或它没有可读的分支',
  'github-unavailable': '读不到 GitHub 上的分支',
  'operation-error': '宿主操作失败',
}

function describe(error: unknown): string {
  if (error instanceof service.PluginApiError) {
    const text = ERROR_TEXT[error.code] ?? error.message
    // 兼容性拒绝的 diagnostic 里带着具体未满足的版本要求，不要被固定文案吞掉
    if (error.code === 'incompatible-version' && error.message && error.message !== text) {
      return `${text}：${error.message}`
    }
    return text
  }
  return error instanceof Error ? error.message : '未知错误'
}

/** 操作结果里的失败原因优先用 code 翻成中文，其余按原文展示 */
function resultMessage(result: OperationResult): string | null {
  if (result.error) {
    const text = ERROR_TEXT[result.error.code] ?? result.error.code
    return result.error.diagnostic ? `${text}：${result.error.diagnostic}` : text
  }
  if (result.application === 'failed') return `操作在「${result.stage}」阶段失败`
  return null
}

function applyBundles(bundles: InstalledBundle[]): void {
  // 合并上一次检查更新得到的最新版本，避免刷新后标签消失
  const previous = new Map(state.bundles.map((bundle) => [bundle.name, bundle]))
  state.bundles = bundles.map((bundle) => {
    const known = previous.get(bundle.name)
    return known?.latestVersion && known.updateSpec
      ? { ...bundle, latestVersion: known.latestVersion, updateSpec: known.updateSpec }
      : bundle
  })
}

function withoutUpdate(bundle: InstalledBundle): InstalledBundle {
  const next = { ...bundle }
  delete next.latestVersion
  delete next.updateSpec
  return next
}

/**
 * 用刚拿到的商场数据给已装组合包打「可更新」标记。
 * 只读索引，不装任何东西；返回可更新数量。
 * 默认版本与当前 DSH 不兼容时不打标记：宿主的安装前检查会拒掉它，提示「可更新」只会让人白点一次。
 */
function applyUpdateFlags(): number {
  const byName = new Map(state.market.map((entry) => [entry.name, entry]))
  let count = 0
  state.bundles = state.bundles.map((bundle) => {
    const entry = byName.get(bundle.name)
    if (entry?.installation.status !== 'update-available' || !entry.defaultVersion) {
      return withoutUpdate(bundle)
    }
    const target = entry.versions.find((version) => version.version === entry.defaultVersion)
    if (!target || target.compatible === false) return withoutUpdate(bundle)
    count += 1
    return {
      ...withoutUpdate(bundle),
      latestVersion: entry.defaultVersion,
      updateSpec: target.spec,
    }
  })
  return count
}

// ============ 加载 ============

/** 宿主 search 单页上限 100，且必须靠 nextOffset 翻页才能拿全一个索引 */
const MARKET_PAGE_SIZE = 100
/** 社区目录有 5,000+ 条，上限放到 60 页（6,000 条）；超出才在列表上方提示 */
const MARKET_MAX_PAGES = 60
/** 首页之后的翻页并发数：串行 55 页要等十几秒 */
const MARKET_PAGE_CONCURRENCY = 6

async function fetchIndexPages(
  url: string,
  refresh: boolean,
): Promise<{ entries: MarketEntry[]; total: number }> {
  const query = { text: state.storeQuery, limit: MARKET_PAGE_SIZE }
  const first = await service.searchIndex(url, { ...query, offset: 0, refresh })
  const total = first.total
  const fetchedAt = first.fetchedAt

  // 按页号存，最后按顺序拼回去：并发请求不能打乱「索引顺序」
  const pages: MarketEntry[][] = [first.entries]
  const nextOffset = first.nextOffset ?? 0
  const hasMore = first.nextOffset !== null && first.entries.length < total
  const remaining = hasMore
    ? Math.min(Math.ceil((total - nextOffset) / MARKET_PAGE_SIZE), MARKET_MAX_PAGES - 1)
    : 0

  if (remaining > 0) {
    let cursor = 0
    const fetchPage = async (): Promise<void> => {
      while (cursor < remaining) {
        const page = cursor++
        const result = await service.searchIndex(url, {
          ...query,
          offset: nextOffset + page * MARKET_PAGE_SIZE,
          // 同一份文档的后续页用首次读取时间固定，避免翻页时文档被换掉导致漏条或重条
          fetchedAt,
        })
        pages[page + 1] = result.entries
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(MARKET_PAGE_CONCURRENCY, remaining) }, fetchPage),
    )
  }

  return { entries: pages.flatMap((page) => page ?? []), total }
}

async function loadLocal(): Promise<void> {
  state.localStatus = 'loading'
  try {
    const bundles = await service.listBundles()
    applyBundles(bundles)
    state.hostOnline = true
    state.localStatus = 'ready'
  } catch (error) {
    state.hostOnline = false
    state.localStatus = 'error'
    state.indexErrors = {}
    console.warn('[deepseekbox] listBundles failed:', describe(error))
  }
}

async function loadStore(refresh = false): Promise<void> {
  resetStoreRenderLimit()
  state.storeStatus = 'loading'
  state.indexErrors = {}
  state.indexTotals = {}
  try {
    const indexes = await service.listIndexes()
    state.indexes = indexes
    if (indexes.length === 0) {
      state.market = []
      state.storeStatus = 'ready'
      applyUpdateFlags()
      return
    }

    const collected: MarketEntry[] = []
    for (const index of indexes) {
      if (index.error) {
        state.indexErrors[index.url] = index.error
        continue
      }
      try {
        const { entries, total } = await fetchIndexPages(index.url, refresh)
        collected.push(...entries)
        state.indexTotals[index.url] = total
      } catch (error) {
        state.indexErrors[index.url] = describe(error)
      }
    }
    state.market = collected
    state.storeStatus = 'ready'
    applyUpdateFlags()
  } catch (error) {
    state.storeStatus = 'error'
    console.warn('[deepseekbox] listIndexes failed:', describe(error))
  }
}

async function init(): Promise<void> {
  // 打开即静默比一次版本：只标记「可更新」，装不装由用户决定。
  await Promise.all([loadLocal(), loadStore()])
  applyUpdateFlags()
}

function dismissUpdateNotice(): void {
  state.updateNoticeDismissed = true
}

let searchTimer: ReturnType<typeof setTimeout> | undefined

/** 商场搜索走后端索引匹配，输入停顿后再请求 */
function scheduleStoreSearch(): void {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchTimer = undefined
    void loadStore()
  }, 260)
}

/** 订阅本 Box 的索引源（已有则忽略） */
async function subscribeSelfIndex(): Promise<void> {
  await withBusy('subscribe', async () => {
    try {
      const indexes = await service.listIndexes()
      if (indexes.some((index) => index.url === SELF_INDEX_URL)) {
        toast('info', '已经订阅过 DeepSeekBox 索引源')
        return
      }
      await service.setIndexes([...indexes.map((index) => index.url), SELF_INDEX_URL])
      toast('success', '已订阅 DeepSeekBox 索引源')
      await loadStore(true)
    } catch (error) {
      toast('error', `订阅失败：${describe(error)}`)
    }
  })
}

/** 订阅本 Box 的社区目录（条目多，订阅后首次加载会慢一些） */
async function subscribeCommunityIndex(): Promise<void> {
  await withBusy('subscribe', async () => {
    try {
      const indexes = await service.listIndexes()
      if (indexes.some((index) => index.url === COMMUNITY_INDEX_URL)) {
        toast('info', '已经订阅过社区目录')
        return
      }
      await service.setIndexes([...indexes.map((index) => index.url), COMMUNITY_INDEX_URL])
      toast('success', '已订阅社区目录：条目较多，搜索比翻列表快')
      await loadStore(true)
    } catch (error) {
      toast('error', `订阅失败：${describe(error)}`)
    }
  })
}

// ============ 更新 ============

async function checkUpdates(): Promise<void> {
  await withBusy('checkUpdates', async () => {
    state.checkingUpdates = true
    try {
      await loadStore(true)
      const count = state.bundles.filter(isUpdatable).length
      if (count > 0) state.updateNoticeDismissed = false
      toast(count > 0 ? 'success' : 'info', count > 0 ? `发现 ${count} 个可更新插件` : '已是最新版本，暂无可用更新')
    } catch (error) {
      toast('error', `检查更新失败：${describe(error)}`)
    } finally {
      state.checkingUpdates = false
    }
  })
}

async function updateOne(name: string): Promise<void> {
  await withBusy(`update:${name}`, async () => {
    const bundle = state.bundles.find((item) => item.name === name)
    if (!bundle?.updateSpec) return
    try {
      const result = await service.installBundle(bundle.updateSpec)
      const failure = resultMessage(result)
      if (failure) {
        toast('error', `更新失败：${failure}`)
        return
      }
      toast(
        result.application === 'restart-required' ? 'warning' : 'success',
        result.application === 'restart-required'
          ? `已更新 ${bundle.title}，重启 DSH 后生效`
          : `已将 ${bundle.title} 更新到 v${bundle.latestVersion}`,
      )
      await loadLocal()
      await loadStore()
    } catch (error) {
      toast('error', `更新失败：${describe(error)}`)
    }
  })
}

async function updateAll(): Promise<void> {
  await withBusy('updateAll', async () => {
    state.updatingAll = true
    try {
      const targets = state.bundles.filter(
        (bundle): bundle is InstalledBundle & { updateSpec: string } =>
          bundle.updateSpec !== undefined && bundle.availability !== 'missing',
      )
      let success = 0
      let restart = false
      for (const bundle of targets) {
        try {
          const result = await service.installBundle(bundle.updateSpec)
          if (resultMessage(result) === null) {
            success += 1
            restart = restart || result.application === 'restart-required'
          }
        } catch {
          // 单个失败不阻断其余更新，结束时统一反馈
        }
      }
      const suffix = restart ? '，部分改动重启后生效' : ''
      if (success === targets.length) toast('success', `已更新 ${success} 个插件${suffix}`)
      else toast('warning', `已更新 ${success} 个，${targets.length - success} 个失败${suffix}`)
      await loadLocal()
      await loadStore()
    } finally {
      state.updatingAll = false
    }
  })
}

// ============ 启用 / 停用 / 删除 ============

async function setEnabled(name: string, enabled: boolean): Promise<void> {
  await withBusy(`toggle:${name}`, async () => {
    const bundle = state.bundles.find((item) => item.name === name)
    try {
      const result = await service.setBundleEnabled(name, enabled)
      const failure = resultMessage(result)
      if (failure) {
        toast('error', `${enabled ? '启用' : '停用'}失败：${failure}`)
        return
      }
      const restart = result.application === 'restart-required'
      toast(
        restart ? 'warning' : 'success',
        `已${enabled ? '启用' : '停用'} ${bundle?.title ?? name}${restart ? '，重启 DSH 后生效' : ''}`,
      )
      await loadLocal()
      await loadStore()
    } catch (error) {
      toast('error', `${enabled ? '启用' : '停用'}失败：${describe(error)}`)
    }
  })
}

async function removeByName(name: string): Promise<void> {
  const bundle = state.bundles.find((item) => item.name === name)
  if (!bundle) return
  const ok = await openConfirm({
    title: '卸载组合包',
    message: `确定要卸载「${bundle.title}」吗？依赖会被移除，profile 里的插件行随之消失，此操作不可撤销。`,
    confirmText: '卸载',
    danger: true,
  })
  if (!ok) return
  await withBusy(`remove:${name}`, async () => {
    try {
      const result = await service.removeBundle(name)
      const failure = resultMessage(result)
      if (failure) {
        toast('error', `卸载失败：${failure}`)
        return
      }
      toast(
        result.application === 'restart-required' ? 'warning' : 'success',
        `已卸载 ${bundle.title}${result.application === 'restart-required' ? '，重启 DSH 后生效' : ''}`,
      )
      if (state.detailName === name) closeDetail()
      await loadLocal()
      await loadStore()
    } catch (error) {
      toast('error', `卸载失败：${describe(error)}`)
    }
  })
}

// ============ 安装 ============

async function installEntry(entry: MarketEntry): Promise<void> {
  await withBusy(`install:${entry.name}`, async () => {
    const version = entry.defaultVersion
    const target = entry.versions.find((item) => item.version === version)
    if (!target) {
      toast('warning', '这个插件没有可安装的版本')
      return
    }
    // 宿主的安装前检查会按真实 package.json 拒绝不兼容版本并回滚，这里先拦一次，省掉一轮安装卸载
    if (target.compatible === false) {
      const range = target.requirements?.['engines.dsh']
      toast(
        'warning',
        range
          ? `${entry.title} v${version} 要求 DSH ${range}，当前宿主不满足，装不进去`
          : `${entry.title} v${version} 与当前 DSH 版本不兼容，装不进去`,
      )
      return
    }
    try {
      const result = await service.installBundle(target.spec, { registry: target.registry ?? null })
      const failure = resultMessage(result)
      if (failure) {
        toast('error', `安装失败：${failure}`)
        return
      }
      toast(
        result.application === 'restart-required' ? 'warning' : 'success',
        `已安装 ${entry.title} v${version}${result.application === 'restart-required' ? '，重启 DSH 后生效' : ''}`,
      )
      await loadLocal()
      await loadStore()
    } catch (error) {
      toast('error', `安装失败：${describe(error)}`)
    }
  })
}

async function installSpec(spec: string): Promise<boolean> {
  const trimmed = spec.trim()
  if (!trimmed) {
    toast('warning', '请输入包名、git 地址或本地目录')
    return false
  }
  const done = await withBusy('installSpec', async () => {
    try {
      const result = await service.installBundle(trimmed)
      const failure = resultMessage(result)
      if (failure) {
        toast('error', `安装失败：${failure}`)
        return false
      }
      toast(
        result.application === 'restart-required' ? 'warning' : 'success',
        `已安装 ${result.target}${result.application === 'restart-required' ? '，重启 DSH 后生效' : ''}`,
      )
      state.installOpen = false
      await loadLocal()
      await loadStore()
      return true
    } catch (error) {
      toast('error', `安装失败：${describe(error)}`)
      return false
    }
  })
  return done === true
}

// ============ 按分支安装 ============

/**
 * 分支是上游的活口：卡片左下角的版本号点开就是分支列表，装在卡片内联完成。
 * 装的是该分支当前的头提交——上游后续推送会改变它，所以不假装它是固定版本。
 */
async function installBranchAt(
  entry: MarketEntry,
  repo: string,
  branch: RepoBranch,
): Promise<boolean> {
  if (!branch.bundle) {
    toast('warning', `${branch.name} 分支没有声明组合包，装进来也不能按插件管理`)
    return false
  }
  const done = await withBusy(`branch-install:${repo}#${branch.name}`, async () => {
    const spec = `git+https://github.com/${repo}#${branch.name}`
    try {
      const result = await service.installBundle(spec)
      const failure = resultMessage(result)
      if (failure) {
        toast('error', `安装失败：${failure}`)
        return false
      }
      const version = branch.version ? ` v${branch.version}` : ''
      const restart = result.application === 'restart-required'
      toast(
        restart ? 'warning' : 'success',
        `已安装 ${entry.title}${version}（${branch.name} 分支）${restart ? '，重启 DSH 后生效' : ''}`,
      )
      await loadLocal()
      await loadStore()
      return true
    } catch (error) {
      toast('error', `安装失败：${describe(error)}`)
      return false
    }
  })
  return done === true
}

/** 读分支列表：失败原因在这里翻成中文，卡片只负责展示 */
async function loadRepoBranches(
  repo: string,
): Promise<{ ok: boolean; branches: RepoBranch[]; error?: string }> {
  try {
    return { ok: true, branches: await service.listRepoBranches(repo) }
  } catch (error) {
    return { ok: false, branches: [], error: describe(error) }
  }
}

// ============ 详情页 ============

function openDetail(name: string): void {
  state.detailName = name
  state.view = 'detail'
}

function closeDetail(): void {
  state.view = 'list'
  state.detailName = null
}

async function setRowEnabled(entryId: string, enabled: boolean): Promise<void> {
  await withBusy(`row:${entryId}`, async () => {
    try {
      const result = await service.setPluginEnabled(entryId, enabled)
      const failure = resultMessage(result)
      if (failure) {
        toast('error', `${enabled ? '启用' : '停用'}失败：${failure}`)
        return
      }
      toast('success', `已${enabled ? '启用' : '停用'}该插件行`)
      await loadLocal()
    } catch (error) {
      toast('error', `${enabled ? '启用' : '停用'}失败：${describe(error)}`)
    }
  })
}

// ============ 派生数据 ============

const byTitle = (a: { title: string }, b: { title: string }) =>
  a.title.localeCompare(b.title, 'zh-Hans-CN')

const ORIGIN_RANK: Record<BundleOrigin, number> = { official: 0, 'third-party': 1, local: 2 }

const INSTALL_RANK: Record<MarketEntry['installation']['status'], number> = {
  'not-installed': 0,
  'update-available': 1,
  'different-version': 2,
  installed: 3,
  provided: 4,
}

/** 管理 Tab 的基表：当前 profile 里已安装或随 DSH 附带的组合包 */
const localBase = computed(() =>
  state.bundles.filter((bundle) => bundle.installed || bundle.availability === 'installation'),
)

/** 来源统计只看基表，不随搜索与筛选变化，数字才不会跳 */
const localStats = computed(() => {
  const counts: Record<LocalFilter, number> = {
    all: localBase.value.length,
    official: 0,
    'third-party': 0,
    local: 0,
  }
  for (const bundle of localBase.value) counts[bundleOrigin(bundle)] += 1
  return counts
})

const storeStats = computed(() => {
  const counts: Record<StoreFilter, number> = {
    all: state.market.length,
    official: 0,
    catalog: 0,
    'third-party': 0,
    installed: 0,
    available: 0,
  }
  for (const entry of state.market) {
    counts[entry.label] += 1
    counts[entry.installation.status === 'not-installed' ? 'available' : 'installed'] += 1
  }
  return counts
})

function matchesLocalQuery(bundle: InstalledBundle, q: string): boolean {
  if (!q) return true
  return [bundle.title, bundle.name, bundle.description]
    .concat(bundle.rows.map((row) => `${row.title} ${row.moduleName}`))
    .some((text) => text.toLowerCase().includes(q))
}

const filteredLocal = computed(() => {
  const q = state.localQuery.trim().toLowerCase()
  const list = localBase.value.filter(
    (bundle) =>
      (state.localFilter === 'all' || bundleOrigin(bundle) === state.localFilter) &&
      matchesLocalQuery(bundle, q),
  )
  const sorters: Record<LocalSortKey, (a: InstalledBundle, b: InstalledBundle) => number> = {
    status: (a, b) => Number(b.enabled) - Number(a.enabled) || byTitle(a, b),
    name: byTitle,
    package: (a, b) => a.name.localeCompare(b.name),
    origin: (a, b) => ORIGIN_RANK[bundleOrigin(a)] - ORIGIN_RANK[bundleOrigin(b)] || byTitle(a, b),
  }
  return list.sort(sorters[state.localSort])
})

function matchesStoreFilter(entry: MarketEntry): boolean {
  switch (state.storeFilter) {
    case 'official':
    case 'catalog':
    case 'third-party':
      return entry.label === state.storeFilter
    case 'available':
      return entry.installation.status === 'not-installed'
    case 'installed':
      return entry.installation.status !== 'not-installed'
    default:
      return true
  }
}

/** 索引声明的总条数与已加载条数不一致时（翻页上限），如实告诉用户列表不全 */
const storeTruncated = computed(() => {
  const declared = Object.values(state.indexTotals).reduce((sum, n) => sum + n, 0)
  return declared > state.market.length ? declared : 0
})

/** 索引条目没有 author 时归入这一档，保证创作者分面的计数加起来等于当前结果数 */
const UNKNOWN_AUTHOR = '未标注作者'

const authorOf = (entry: MarketEntry): string => entry.author?.trim() || UNKNOWN_AUTHOR

/**
 * 创作者分面：只按来源筛选统计，因此选中某个创作者后其他档的计数不会塌成 0。
 * 每条索引条目只有一个 author，所以多选是「任一命中」，不做「同时属于多人」的交集。
 */
const AUTHOR_FACET_LIMIT = 8
const AUTHOR_FACET_EXPANDED = 24
/** 作者数超过这个量级时，chip 已经没有筛选价值，改用搜索 */
const AUTHOR_FACET_OVERFLOW = 200

const authorFacetAll = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of state.market) {
    if (!matchesStoreFilter(entry)) continue
    const author = authorOf(entry)
    counts.set(author, (counts.get(author) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count || a.author.localeCompare(b.author, 'zh-Hans-CN'))
})

const authorFacetTotal = computed(() => authorFacetAll.value.length)
const authorFacetOverflow = computed(() => authorFacetTotal.value > AUTHOR_FACET_OVERFLOW)

/** 几千条社区条目会带来上千位作者，分面只展示头部，其余交给搜索 */
const authorFacets = computed(() =>
  authorFacetAll.value.slice(
    0,
    state.authorFacetsExpanded ? AUTHOR_FACET_EXPANDED : AUTHOR_FACET_LIMIT,
  ),
)

const authorFacetsHidden = computed(() =>
  Math.max(0, authorFacetAll.value.length - authorFacets.value.length),
)

function toggleAuthorFacets(): void {
  state.authorFacetsExpanded = !state.authorFacetsExpanded
}

/** 分类分面：计数只受来源与作者影响，选中分类后其他档不塌陷 */
const categoryFacets = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of state.market) {
    if (!matchesStoreFilter(entry) || !matchesStoreAuthor(entry)) continue
    const key = entry.category ?? ''
    if (key === '') continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
})

function matchesStoreCategory(entry: MarketEntry): boolean {
  return (
    state.storeCategories.length === 0 ||
    state.storeCategories.includes(entry.category ?? '')
  )
}

function setStoreCategory(category: string): void {
  const index = state.storeCategories.indexOf(category)
  if (index >= 0) state.storeCategories.splice(index, 1)
  else state.storeCategories.push(category)
}

function matchesStoreAuthor(entry: MarketEntry): boolean {
  return state.storeAuthors.length === 0 || state.storeAuthors.includes(authorOf(entry))
}

function setStoreAuthor(author: string): void {
  const index = state.storeAuthors.indexOf(author)
  if (index >= 0) state.storeAuthors.splice(index, 1)
  else state.storeAuthors.push(author)
}

const storeGroups = computed(() => {
  const groups = new Map<string, { title: string; url: string; entries: MarketEntry[] }>()
  for (const entry of state.market) {
    if (!matchesStoreFilter(entry) || !matchesStoreAuthor(entry) || !matchesStoreCategory(entry))
      continue
    const group = groups.get(entry.indexUrl) ?? {
      title: entry.indexTitle,
      url: entry.indexUrl,
      entries: [],
    }
    group.entries.push(entry)
    groups.set(entry.indexUrl, group)
  }
  const sorters: Partial<Record<StoreSortKey, (a: MarketEntry, b: MarketEntry) => number>> = {
    name: byTitle,
    author: (a, b) => (a.author ?? '').localeCompare(b.author ?? '') || byTitle(a, b),
    installable: (a, b) =>
      INSTALL_RANK[a.installation.status] - INSTALL_RANK[b.installation.status] || byTitle(a, b),
  }
  const sorter = sorters[state.storeSort]
  const result = [...groups.values()].sort((a, b) => b.entries.length - a.entries.length)
  if (sorter) for (const group of result) group.entries.sort(sorter)
  return result
})

const visibleStoreCount = computed(() =>
  storeGroups.value.reduce((sum, group) => sum + group.entries.length, 0),
)

/** 按预算切片渲染，避免一次把几千张卡片塞进 DOM；搜索或筛选变化时重置 */
const renderedStoreGroups = computed(() => {
  let budget = state.storeRenderLimit
  const groups: Array<{ title: string; url: string; entries: MarketEntry[]; total: number }> = []
  for (const group of storeGroups.value) {
    if (budget <= 0) break
    const entries = group.entries.slice(0, budget)
    budget -= entries.length
    groups.push({ ...group, entries, total: group.entries.length })
  }
  return groups
})

const storeHasMore = computed(() => visibleStoreCount.value > state.storeRenderLimit)

function showMoreStore(): void {
  state.storeRenderLimit += 120
}

function resetStoreRenderLimit(): void {
  state.storeRenderLimit = 120
}

/** 统计卡与 chips 共用：再次点击已选中的分类回到全部 */
function setLocalFilter(value: LocalFilter): void {
  state.localFilter = state.localFilter === value && value !== 'all' ? 'all' : value
}

function setStoreFilter(value: StoreFilter): void {
  state.storeFilter = state.storeFilter === value && value !== 'all' ? 'all' : value
}

function isUpdatable(bundle: InstalledBundle): boolean {
  return bundle.updateSpec !== undefined && bundle.latestVersion !== undefined
}

const updateCount = computed(() => state.bundles.filter(isUpdatable).length)

const detailBundle = computed(
  () => (state.view === 'detail' && state.detailName
    ? state.bundles.find((bundle) => bundle.name === state.detailName) ?? null
    : null),
)

const hasIndexes = computed(() => state.indexes.length > 0)

const installedVersionOf = (name: string): string | undefined =>
  state.bundles.find((bundle) => bundle.name === name)?.version

function switchTab(tab: TabKey): void {
  state.activeTab = tab
}

function gotoStore(): void {
  state.storeQuery = ''
  state.storeFilter = 'all'
  state.storeAuthors = []
  state.storeCategories = []
  state.activeTab = 'store'
  void loadStore()
}

function openDevGuide(): void {
  window.open(DEV_GUIDE_URL, '_blank', 'noopener')
}

function openInstallDialog(): void {
  state.installOpen = true
}

function closeInstallDialog(): void {
  state.installOpen = false
}

export const pluginCenter = {
  state,
  init,
  switchTab,
  gotoStore,
  openDevGuide,

  loadLocal,
  loadStore,
  scheduleStoreSearch,
  subscribeSelfIndex,
  subscribeCommunityIndex,

  checkUpdates,
  updateOne,
  updateAll,
  dismissUpdateNotice,
  setEnabled,
  removeByName,

  installEntry,
  installSpec,
  openInstallDialog,
  closeInstallDialog,

  installBranchAt,
  loadRepoBranches,

  openDetail,
  closeDetail,
  setRowEnabled,

  toast,
  dismissToast,
  resolveConfirm,

  isUpdatable,
  installedVersionOf,
  hasIndexes,

  filteredLocal,
  storeGroups,
  renderedStoreGroups,
  storeHasMore,
  showMoreStore,
  updateCount,
  detailBundle,

  localBase,
  localStats,
  storeStats,
  storeTruncated,
  authorFacets,
  authorFacetsHidden,
  authorFacetTotal,
  authorFacetOverflow,
  toggleAuthorFacets,
  setStoreAuthor,
  categoryFacets,
  setStoreCategory,
  visibleStoreCount,
  setLocalFilter,
  setStoreFilter,
}

export type PluginCenterStore = typeof pluginCenter
