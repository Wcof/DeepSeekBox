/**
 * 索引目录侧的协议：一个「可安装的条目」长什么样，以及它的出处怎么判。
 *
 * 这里只有中立逻辑。判断「这条是不是宿主官方」依赖宿主索引自己给的标记，
 * 但**标记的名字**是每个宿主不同的（DSH 用 labels.official），
 * 所以判定规则由适配器提供（HostAdapter.catalog），核心只负责按规则算。
 */

import type { HostAdapterId } from '../../adapters/types'
import type { CanonicalPlugin, Provenance } from './plugin'

/** 索引源里的一条记录（宿主格式已由适配器解析过） */
export interface CatalogEntry {
  url: string
  title: string
  keywords: string[]
  labels: string[]
}

/**
 * 出处判定规则：由适配器声明自己的标记约定，核心不认识任何具体宿主的字段名。
 * 这样新增一个「自己用 keywords.vendor 表示官方」的宿主时，只加适配器不改这里。
 */
export interface ProvenancePolicy {
  /** 命中即算宿主官方 */
  vendorLabels?: string[]
  /** 命中即算本产品收录（一般是 BRAND.catalogMarker） */
  curatedKeywords?: string[]
}

export function provenanceOf(entry: CatalogEntry, policy: ProvenancePolicy): Provenance {
  if ((policy.vendorLabels ?? []).some((label) => entry.labels.includes(label))) return 'vendor'
  if ((policy.curatedKeywords ?? []).some((word) => entry.keywords.includes(word))) return 'curated'
  return 'third-party'
}

/** 索引源本身 */
export interface CatalogSource {
  url: string
  title?: string
  /** 提供这条索引的适配器 */
  adapter?: HostAdapterId
  error?: string
}

/** 把宿主索引里的一条翻译成 canonical 描述的通用部分（不含资源） */
export function describeCatalogEntry(entry: CatalogEntry): Pick<CanonicalPlugin, 'keywords'> {
  return { keywords: entry.keywords }
}
