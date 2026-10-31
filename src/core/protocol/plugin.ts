/**
 * 宿主无关的插件协议。
 *
 * 这个文件是 PlugBox 的立身之本：它描述「一个插件是什么」，
 * 不涉及「某个引擎怎么装它」。任何宿主细节泄漏到这里都算架构退化——
 * 那些东西属于 src/adapters/ 下的适配器。
 *
 * 约定：这里只出现所有宿主都能理解的概念。某个概念如果只有一种宿主有
 * （比如 DSH 的 bundle patch、某个 CLI 的命令名），它应当作为 resources
 * 里的一个 payload 存在，而不是成为这里的顶层字段。
 */

import type { HostAdapterId } from '../../adapters/types'

/** 多语言文本：宿主们各不相同，这里统一成 zh/en + 可选原文 */
export type I18nText = string | { zh?: string; en?: string; [locale: string]: string | undefined }

export interface Author {
  name: string
  /** 展示名（例如中文名），没有就用 name */
  displayName?: string
  homepage?: string
}

/** 插件的安装来源 */
export type SourceType = 'git' | 'registry' | 'local'

export interface PluginSource {
  type: SourceType
  /** git 地址 / npm 包名 / 本地路径，按 type 解释 */
  locator: string
  /** 精确到 commit（只有可靠的版本定位方式才有） */
  ref?: string
}

/**
 * 兼容性要求：键是本的代表性要求 id，值是 semver 范围。
 *
 * 注意这里刻意不用 `dsh` 之类的名字当键——那是宿主的字段名，属于适配器。
 * 核心只认 `requirements['<宿主id>/<要求名>']` 这种带命名空间的键，
 * 由各自适配器把自己的字段映射过来（见 src/adapters/dsh/manifest.ts）。
 */
export type RequirementKey = `${HostAdapterId}/${string}` | string

export type Requirements = Partial<Record<RequirementKey, string>>

export interface PluginVersion {
  version: string
  sources: PluginSource[]
  requirements: Requirements
  publishedAt?: number
}

/**
 * 插件资源的统一抽象。
 *
 * 「资源」指的是插件交付给宿主的可用能力：命令、工具、技能、模型、
 * 配置、文件、UI 槽位。同一份资源在不同宿主里要落成不同结构
 * （比如 UI 槽位在 DSH 里是 sidebar.panellist + main），
 * 这份差异由适配器里的资源映射表负责（详见 HostAdapter.resources）。
 */
export type ResourceKind =
  | 'command'
  | 'tool'
  | 'skill'
  | 'model'
  | 'prompt'
  | 'config'
  | 'file'
  | 'ui-slot'
  | 'transport'

export interface PluginResource<Payload = unknown> {
  kind: ResourceKind
  /** 资源在本插件内的 id，跨宿主保持稳定 */
  id: string
  title?: string
  description?: string
  /** 宿主相关的原始负载，解析权完全交给适配器 */
  payload: Payload
}

/** 插件的出处判定：决定了 UI 上那枚来源标签 */
export type Provenance =
  /** 宿主官方发布 */
  | 'vendor'
  /** PlugBox 自己的索引收录 */
  | 'curated'
  /** 第三方索引源 */
  | 'third-party'
  /** 从本地目录安装 */
  | 'local'

export interface CanonicalPlugin {
  /** 归一化身份，通常取包名 */
  id: string
  name: string
  title: string
  description: string
  icon?: string
  authors: Author[]
  license?: string
  homepage?: string
  repository?: string
  category?: string
  keywords: string[]
  versions: PluginVersion[]
  /** 默认安装版本；不兼容的升级目标不要在这里推荐 */
  defaultVersion?: string
  resources: PluginResource[]
  provenance: Provenance
  /** 它是从哪个适配器提供的索引里来的 */
  discoveredVia?: HostAdapterId
}

/** 版本与其来源的定位串，交给适配器翻译成宿主的安装参数 */
export function installSpecOf(plugin: CanonicalPlugin, version?: string): string | undefined {
  const target =
    version === undefined
      ? plugin.versions.find((item) => item.version === plugin.defaultVersion) ?? plugin.versions[0]
      : plugin.versions.find((item) => item.version === version)
  if (target === undefined) return undefined
  const spec =
    target.sources.find((source) => source.type === 'git') ??
    target.sources.find((source) => source.type === 'registry') ??
    target.sources[0]
  if (spec === undefined) return undefined
  return spec.ref === undefined ? spec.locator : `${spec.locator}#${spec.ref}`
}
