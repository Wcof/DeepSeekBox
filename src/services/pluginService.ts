import type { InstalledPlugin, StorePlugin } from '../types/plugin'
import { compareVersions } from '../types/plugin'
import { STORE_CATALOG, createInitialInstalled } from '../data/catalog'

/**
 * 模拟插件内核接口层：内存状态 + 异步延迟。
 * 后续接入真实内核（IPC / HTTP）时，仅需保持本文件导出的函数签名不变。
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

const state = {
  installed: createInitialInstalled(),
  catalog: clone(STORE_CATALOG),
}

/** 插件文件扩展名白名单（本地安装校验） */
const PLUGIN_FILE_EXT = /\.(dylib|so|dll|zip|tar\.gz|tgz|plugin)$/i

function applyCatalogInfo(plugin: InstalledPlugin): void {
  const entry = state.catalog.find((c) => c.id === plugin.id)
  if (!entry) return
  plugin.latestVersion = entry.version
  plugin.repoLabel = plugin.repoLabel ?? entry.name
  plugin.repoUrl = plugin.repoUrl ?? `https://github.com/${entry.repo}`
  plugin.configSchema = plugin.configSchema ?? entry.configSchema
}

export async function listInstalled(): Promise<InstalledPlugin[]> {
  await sleep(500)
  return clone(state.installed)
}

export async function listStoreCatalog(): Promise<StorePlugin[]> {
  await sleep(600)
  return clone(state.catalog)
}

/** 检查更新：返回可更新的插件 id 列表与最新已安装列表 */
export async function checkUpdates(): Promise<{
  updatableIds: string[]
  installed: InstalledPlugin[]
}> {
  await sleep(900)
  const updatableIds: string[] = []
  for (const plugin of state.installed) {
    if (plugin.status === 'missing-file') continue
    applyCatalogInfo(plugin)
    const entry = state.catalog.find((c) => c.id === plugin.id)
    if (entry && compareVersions(entry.version, plugin.installedVersion) > 0) {
      updatableIds.push(plugin.id)
    } else {
      delete plugin.latestVersion
    }
  }
  return { updatableIds, installed: clone(state.installed) }
}

/** 更新单个插件；返回更新后的插件 */
export async function updatePlugin(id: string): Promise<InstalledPlugin> {
  await sleep(1100)
  const plugin = state.installed.find((p) => p.id === id)
  const entry = state.catalog.find((c) => c.id === id)
  if (!plugin || !entry) throw new Error(`PLUGIN_NOT_FOUND: ${id}`)
  if (compareVersions(entry.version, plugin.installedVersion) <= 0) {
    throw new Error(`UP_TO_DATE: ${id}`)
  }
  plugin.installedVersion = entry.version
  plugin.latestVersion = entry.version
  if (plugin.filePath) {
    plugin.filePath = plugin.filePath.replace(
      /-v[^/]+\.dylib$/,
      `-v${entry.version}.dylib`,
    )
  }
  return clone(plugin)
}

/** 启用 / 停用插件 */
export async function setPluginEnabled(id: string, enabled: boolean): Promise<InstalledPlugin> {
  await sleep(600)
  const plugin = state.installed.find((p) => p.id === id)
  if (!plugin) throw new Error(`PLUGIN_NOT_FOUND: ${id}`)
  if (plugin.status === 'missing-file') {
    throw new Error(`PLUGIN_FILE_MISSING: ${id}`)
  }
  plugin.status = enabled ? 'running' : 'stopped'
  return clone(plugin)
}

/** 删除插件（含配置） */
export async function removePlugin(id: string): Promise<void> {
  await sleep(500)
  const index = state.installed.findIndex((p) => p.id === id)
  if (index < 0) throw new Error(`PLUGIN_NOT_FOUND: ${id}`)
  state.installed.splice(index, 1)
}

/** 从商场安装：安装后为已停用状态 */
export async function installFromStore(id: string): Promise<InstalledPlugin> {
  await sleep(1000)
  const entry = state.catalog.find((c) => c.id === id)
  if (!entry) throw new Error(`STORE_PLUGIN_NOT_FOUND: ${id}`)
  if (state.installed.some((p) => p.id === id)) {
    throw new Error(`ALREADY_INSTALLED: ${id}`)
  }
  const plugin: InstalledPlugin = {
    id: entry.id,
    name: entry.name,
    alias: entry.alias,
    description: entry.description,
    installedVersion: entry.version,
    latestVersion: entry.version,
    author: entry.author,
    authorName: entry.authorName,
    status: 'stopped',
    filePath: `plugins/darwin/arm64/${entry.id}-v${entry.version}.dylib`,
    repoLabel: entry.name,
    repoUrl: `https://github.com/${entry.repo}`,
    icon: entry.icon,
    configSchema: entry.configSchema,
    config: Object.fromEntries(
      (entry.configSchema ?? []).map((f) => [
        f.key,
        f.type === 'boolean' ? false : f.type === 'number' ? 0 : f.options?.[0] ?? '',
      ]),
    ),
  }
  state.installed.push(plugin)
  return clone(plugin)
}

/** 本地安装：根据选择的文件名导入插件 */
export async function installLocalFile(fileName: string): Promise<InstalledPlugin> {
  await sleep(900)
  if (!PLUGIN_FILE_EXT.test(fileName)) {
    throw new Error(`UNSUPPORTED_PLUGIN_FILE: ${fileName}`)
  }
  const base = fileName.replace(/\.(dylib|so|dll|zip|tar\.gz|tgz|plugin)$/i, '')
  const id = base.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'local-plugin'
  if (state.installed.some((p) => p.id === id)) {
    throw new Error(`ALREADY_INSTALLED: ${id}`)
  }
  const plugin: InstalledPlugin = {
    id,
    name: base,
    alias: base,
    description: '通过本地安装导入的插件文件，配置为空，可在启用前进行设置。',
    installedVersion: '0.0.1',
    author: '本地',
    status: 'stopped',
    filePath: `plugins/local/${fileName}`,
    config: {},
  }
  state.installed.push(plugin)
  return clone(plugin)
}

/** 保存插件配置 */
export async function savePluginConfig(
  id: string,
  config: Record<string, string | number | boolean>,
): Promise<InstalledPlugin> {
  await sleep(500)
  const plugin = state.installed.find((p) => p.id === id)
  if (!plugin) throw new Error(`PLUGIN_NOT_FOUND: ${id}`)
  plugin.config = clone(config)
  return clone(plugin)
}
