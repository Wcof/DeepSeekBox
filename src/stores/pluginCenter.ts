import { computed, reactive } from 'vue'
import type {
  InstalledPlugin,
  StoreFilter,
  StorePlugin,
  Toast,
  ToastType,
} from '../types/plugin'
import { authorLabel, compareVersions } from '../types/plugin'
import * as service from '../services/pluginService'
import { DEV_GUIDE_URL, OFFICIAL_REGISTRY, THIRD_PARTY_REGISTRY } from '../data/catalog'

export type TabKey = 'local' | 'store'
type ListStatus = 'loading' | 'ready' | 'error'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  danger?: boolean
}

/**
 * 插件中心唯一状态 owner：列表、搜索、筛选、busy、通知与确认弹窗。
 * UI 组件只读 state 并调用 action。
 */
const state = reactive({
  activeTab: 'local' as TabKey,
  view: 'list' as 'list' | 'config',
  configPluginId: null as string | null,

  localPlugins: [] as InstalledPlugin[],
  catalog: [] as StorePlugin[],

  localStatus: 'loading' as ListStatus,
  storeStatus: 'loading' as ListStatus,

  localQuery: '',
  storeQuery: '',
  storeFilter: 'all' as StoreFilter,

  checkingUpdates: false,
  updatingAll: false,
  /** 按操作键记录 busy，如 `update:freetier2api`、`install:jshandler` */
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

function replaceInstalled(plugin: InstalledPlugin): void {
  const index = state.localPlugins.findIndex((p) => p.id === plugin.id)
  if (index >= 0) state.localPlugins[index] = plugin
  else state.localPlugins.push(plugin)
}

function isUpdatable(plugin: InstalledPlugin): boolean {
  return (
    plugin.status !== 'missing-file' &&
    plugin.latestVersion !== undefined &&
    compareVersions(plugin.latestVersion, plugin.installedVersion) > 0
  )
}

// ============ 加载 ============

async function loadLocal(): Promise<void> {
  state.localStatus = 'loading'
  try {
    state.localPlugins = await service.listInstalled()
    state.localStatus = 'ready'
  } catch {
    state.localStatus = 'error'
  }
}

async function loadStore(): Promise<void> {
  state.storeStatus = 'loading'
  try {
    state.catalog = await service.listStoreCatalog()
    state.storeStatus = 'ready'
  } catch {
    state.storeStatus = 'error'
  }
}

function init(): void {
  void loadLocal()
  void loadStore()
}

// ============ 更新 ============

async function checkUpdates(): Promise<void> {
  await withBusy('checkUpdates', async () => {
    state.checkingUpdates = true
    try {
      const { updatableIds, installed } = await service.checkUpdates()
      state.localPlugins = installed
      if (updatableIds.length > 0) {
        toast('success', `发现可更新插件 (${updatableIds.length})`)
      } else {
        toast('info', '已是最新版本，暂无可用更新')
      }
    } catch {
      toast('error', '检查更新失败，请稍后重试')
    } finally {
      state.checkingUpdates = false
    }
  })
}

async function updateOne(id: string): Promise<void> {
  await withBusy(`update:${id}`, async () => {
    try {
      replaceInstalled(await service.updatePlugin(id))
      const plugin = state.localPlugins.find((p) => p.id === id)
      toast('success', `已将 ${plugin?.name ?? id} 更新到 v${plugin?.installedVersion}`)
    } catch {
      toast('error', '更新失败，请检查网络后重试')
    }
  })
}

async function updateAll(): Promise<void> {
  await withBusy('updateAll', async () => {
    state.updatingAll = true
    try {
      const targets = state.localPlugins.filter(isUpdatable)
      let success = 0
      for (const plugin of targets) {
        try {
          replaceInstalled(await service.updatePlugin(plugin.id))
          success += 1
        } catch {
          // 单个失败不阻断其余更新，结束统一反馈
        }
      }
      if (success === targets.length) {
        toast('success', `已更新 ${success} 个插件`)
      } else {
        toast('warning', `已更新 ${success} 个插件，${targets.length - success} 个失败`)
      }
    } finally {
      state.updatingAll = false
    }
  })
}

// ============ 启用 / 停用 / 删除 ============

async function setEnabled(id: string, enabled: boolean): Promise<void> {
  await withBusy(`toggle:${id}`, async () => {
    try {
      replaceInstalled(await service.setPluginEnabled(id, enabled))
      const plugin = state.localPlugins.find((p) => p.id === id)
      toast('success', `已${enabled ? '启用' : '停用'} ${plugin?.name ?? id}`)
    } catch {
      toast('error', enabled ? '启用失败' : '停用失败')
    }
  })
}

async function removeById(id: string): Promise<void> {
  const plugin = state.localPlugins.find((p) => p.id === id)
  if (!plugin) return
  const ok = await openConfirm({
    title: '删除插件',
    message: `确定要删除插件「${plugin.name}」吗？插件文件与配置将一并清除，此操作不可撤销。`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  await withBusy(`remove:${id}`, async () => {
    try {
      await service.removePlugin(id)
      state.localPlugins = state.localPlugins.filter((p) => p.id !== id)
      toast('success', `已删除 ${plugin.name}`)
    } catch {
      toast('error', '删除失败，请重试')
    }
  })
}

// ============ 安装 ============

async function installFromStore(id: string): Promise<void> {
  await withBusy(`install:${id}`, async () => {
    try {
      const plugin = await service.installFromStore(id)
      replaceInstalled(plugin)
      toast('success', `已下载 ${plugin.name}，可在本地插件中启用`)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      toast(
        'error',
        message.startsWith('ALREADY_INSTALLED') ? '该插件已下载' : '下载失败，请稍后重试',
      )
    }
  })
}

function pickLocalFile(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.dylib,.so,.dll,.zip,.tar.gz,.tgz,.plugin'
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) void installLocalFile(file.name)
  }
  input.click()
}

async function installLocalFile(fileName: string): Promise<void> {
  await withBusy('installLocal', async () => {
    try {
      const plugin = await service.installLocalFile(fileName)
      replaceInstalled(plugin)
      toast('success', `本地安装成功：${plugin.name}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.startsWith('UNSUPPORTED_PLUGIN_FILE')) {
        toast('warning', '未识别的插件文件类型，请选择 .dylib / .so / .zip 等插件包')
      } else if (message.startsWith('ALREADY_INSTALLED')) {
        toast('warning', '同名插件已存在，请先删除后再安装')
      } else {
        toast('error', '本地安装失败，请重试')
      }
    }
  })
}

// ============ 配置页 ============

function openConfig(id: string): void {
  state.configPluginId = id
  state.view = 'config'
}

function closeConfig(): void {
  state.view = 'list'
  state.configPluginId = null
}

async function saveConfig(
  id: string,
  config: Record<string, string | number | boolean>,
): Promise<boolean> {
  const result = await withBusy(`saveConfig:${id}`, async () => {
    try {
      replaceInstalled(await service.savePluginConfig(id, config))
      toast('success', '配置已保存')
      return true
    } catch {
      toast('error', '保存配置失败，请重试')
      return false
    }
  })
  return result === true
}

// ============ 派生数据 ============

function matchesQuery(
  plugin: {
    name: string
    alias: string
    id: string
    author: string
    authorName?: string
  },
  query: string,
  extra?: string[],
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [plugin.name, plugin.alias, plugin.id, plugin.author, plugin.authorName ?? '', ...(extra ?? [])]
    .some((text) => text.toLowerCase().includes(q))
}

const filteredLocal = computed(() =>
  state.localPlugins.filter((p) => matchesQuery(p, state.localQuery)),
)

function matchesStoreFilters(entry: StorePlugin): boolean {
  if (state.storeFilter === 'available' && isInstalled(entry.id)) return false
  if (state.storeFilter === 'installed' && !isInstalled(entry.id)) return false
  return matchesQuery(entry, state.storeQuery, [entry.repo])
}

/** 商场按创作者分组展示：官方收录库与第三方收录区在前，未收录创作者归入「其他创作者」 */
const storeGroups = computed(() => {
  const groups = [...OFFICIAL_REGISTRY, ...THIRD_PARTY_REGISTRY]
    .map(({ creator }) => ({
      creator,
      plugins: state.catalog.filter(
        (entry) => entry.author === creator.id && matchesStoreFilters(entry),
      ),
    }))
    .filter((group) => group.plugins.length > 0)

  const registeredIds = new Set(
    [...OFFICIAL_REGISTRY, ...THIRD_PARTY_REGISTRY].map((group) => group.creator.id),
  )
  const otherPlugins = state.catalog.filter(
    (entry) => !registeredIds.has(entry.author) && matchesStoreFilters(entry),
  )
  if (otherPlugins.length > 0) {
    groups.push({
      creator: { id: 'others', name: '其他创作者', homepage: '' },
      plugins: otherPlugins,
    })
  }
  return groups
})

function isInstalled(id: string): boolean {
  return state.localPlugins.some((p) => p.id === id)
}

const updateCount = computed(() => state.localPlugins.filter(isUpdatable).length)

const configPlugin = computed(
  () =>
    (state.view === 'config' &&
      state.configPluginId &&
      state.localPlugins.find((p) => p.id === state.configPluginId)) ||
    null,
)

/** 商场卡片需要的本地状态查询 */
function installedStatusOf(id: string): InstalledPlugin['status'] | null {
  return state.localPlugins.find((p) => p.id === id)?.status ?? null
}

function switchTab(tab: TabKey): void {
  state.activeTab = tab
}

function gotoStore(): void {
  state.storeQuery = ''
  state.storeFilter = 'all'
  state.activeTab = 'store'
}

function openDevGuide(): void {
  window.open(DEV_GUIDE_URL, '_blank', 'noopener')
}

export const pluginCenter = {
  state,
  init,
  switchTab,
  gotoStore,
  openDevGuide,

  loadLocal,
  loadStore,

  checkUpdates,
  updateOne,
  updateAll,
  setEnabled,
  removeById,

  installFromStore,
  pickLocalFile,

  openConfig,
  closeConfig,
  saveConfig,

  toast,
  dismissToast,
  resolveConfirm,

  isInstalled,
  installedStatusOf,
  isUpdatable,
  authorLabel,

  filteredLocal,
  storeGroups,
  updateCount,
  configPlugin,
}

export type PluginCenterStore = typeof pluginCenter
