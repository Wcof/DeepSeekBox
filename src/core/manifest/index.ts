/**
 * 清单双向转换：宿主原始 manifest ⇄ 代表 ⇄ canonical。
 *
 * 为什么要经过「中间视图」这一层：宿主的插件资格字段（例如 DSH 要求 package.json
 * 里声明 dsh.bundle.patch）是宿主专属的，直接塞进 canonical 会把核心污染回去；
 * 完全丢掉又会让插件在目标宿主上装不起来。所以让 canonical 只描述「这个插件是什么」，
 * 装得装不装得上由适配器在 View 这一层补回去。
 */

import type { CanonicalPlugin, Author, PluginVersion, Requirements } from '../protocol/plugin'
import { installSpecOf } from '../protocol/plugin'
import { compareVersions } from '../protocol/version'
import type { HostAdapter, ManifestView, RawManifest } from '../../adapters/types'

/** 宿主原始 manifest → 中间视图 */
export function readManifest(raw: RawManifest, adapter: HostAdapter): ManifestView {
  return adapter.manifest.extract(raw)
}

function repositoryOf(raw: RawManifest): string | undefined {
  if (typeof raw.repository === 'string') return raw.repository
  return raw.repository?.url
}

function authorsOf(raw: RawManifest): Author[] {
  const author = raw.author
  if (typeof author === 'string') return [{ name: author }]
  if (author !== null && typeof author === 'object') {
    const record = author as { name?: string; displayName?: string; url?: string }
    if (record.name !== undefined) {
      return [{ name: record.name, displayName: record.displayName, homepage: record.url }]
    }
  }
  return []
}

/**
 * 中间视图 → canonical。
 *
 * 资源列表在这里是空的：一个插件到底交付了哪些能力属于宿主语义
 * （bundle patch、命令注册、UI 槽位…），只能由适配器读懂，
 * 见 HostAdapter.resources.map 与 src/core/resources/。
 */
export function toCanonical(raw: RawManifest, adapter: HostAdapter): CanonicalPlugin {
  const view = readManifest(raw, adapter)
  const requirements: Requirements = {}
  for (const field of Object.keys(view.requirements)) {
    const range = view.requirements[field]
    if (range !== undefined) requirements[adapter.manifest.requirementKeyOf(field)] = range
  }
  const version: PluginVersion = {
    version: view.version ?? '0.0.0',
    sources: [],
    requirements,
  }
  return {
    id: view.id,
    name: view.id,
    title: view.title ?? view.id,
    description: view.description ?? '',
    icon: view.icon,
    authors: authorsOf(raw),
    license: view.license,
    homepage: view.homepage,
    repository: view.repository ?? repositoryOf(raw),
    keywords: view.keywords,
    versions: view.version === undefined ? [] : [version],
    defaultVersion: view.version,
    resources: [],
    provenance: 'third-party',
    discoveredVia: adapter.id,
  }
}

/** 反过来：canonical + 资源 → 目标宿主的 package.json 片段 */
export function writeManifest(
  plugin: CanonicalPlugin,
  adapter: HostAdapter,
  extra: Partial<ManifestView> = {},
): Record<string, unknown> {
  const target = plugin.versions.find((item) => item.version === plugin.defaultVersion) ?? plugin.versions[0]
  const view: ManifestView = {
    id: plugin.id,
    version: target?.version ?? plugin.defaultVersion,
    title: plugin.title,
    description: plugin.description,
    license: plugin.license,
    keywords: plugin.keywords,
    homepage: plugin.homepage,
    repository: plugin.repository,
    icon: plugin.icon,
    requirements: collectRequirements(target?.requirements ?? {}, (key) => stripNamespace(key, adapter)),
    hostFields: {},
    ...extra,
  }
  return adapter.manifest.compose(view)
}

/** requirementKeyOf 加过命名空间，写回去时要剥掉 */
function stripNamespace(key: string, adapter: HostAdapter): string {
  const prefix = `${adapter.id}/`
  return key.startsWith(prefix) ? key.slice(prefix.length) : key
}

/** 逐个搬运要求并对键做改写：FromEntries 会把可选值带成 string | undefined */
function collectRequirements(
  source: Requirements,
  rewriteKey: (key: string) => string,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of Object.keys(source)) {
    const range = source[key]
    if (range !== undefined) out[rewriteKey(key)] = range
  }
  return out
}

/**
 * 取某个宿主原始字段对应的兼容要求。
 *
 * 宿主返回的要求表里，键是它自己的字段名（'engines.dsh'）；
 * 适配器把它登记成带命名空间的形式（'dsh/engines.dsh'）。
 * 两种键都要能在运行时读到，所以查两次。
 */
export function hostRequirementOf(
  adapter: HostAdapter,
  requirements: Requirements | undefined,
  field: string,
): string | undefined {
  if (requirements === undefined) return undefined
  return requirements[adapter.manifest.requirementKeyOf(field)] ?? requirements[field]
}

/** canonical → 该宿主的安装参数串 */
export function toInstallSpec(plugin: CanonicalPlugin, adapter: HostAdapter, version?: string): string | undefined {
  return adapter.installSpec(plugin, version) ?? installSpecOf(plugin, version)
}

/** 排序用：把新版本排前面 */
export function newestFirst(versions: PluginVersion[]): PluginVersion[] {
  return [...versions].sort((a, b) => compareVersions(b.version, a.version))
}
