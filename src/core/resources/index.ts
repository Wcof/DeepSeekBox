/**
 * 资源映射：把一种能力的「代表说法」翻译成某个宿主的说法。
 *
 * 这是「同一批插件能落到不同宿主」的关键机制。典型例子：
 * UI 槽位在 Cordis 系宿主里是 `sidebar.panellist` + `main` 两个槽位，
 * 在另一个宿主里可能压根没有侧栏，那就由适配器返回 null 表示接不住，
 * 由上层决定降级（渲染成普通卡片）还是报错。
 */

import type { CanonicalPlugin, PluginResource } from '../protocol/plugin'
import type { HostAdapter, ResourceClaim } from '../../adapters/types'

/** 把插件的全部资源映射到目标宿主；接不住的资源不会出现在结果里 */
export function mapResources(plugin: CanonicalPlugin, adapter: HostAdapter): ResourceClaim[] {
  const claims: ResourceClaim[] = []
  for (const resource of plugin.resources) {
    const claim = adapter.resources.map(resource)
    if (claim !== null) claims.push(claim)
  }
  return claims
}

/** 某个宿主能不能接住这类资源 */
export function supports(adapter: HostAdapter, probe: PluginResource): boolean {
  return adapter.resources.map(probe) !== null
}

/** 映射失败的降级：把接不住的资源摊平成可读的一句话，UI 上如实降级展示 */
export function unsupportedResources(plugin: CanonicalPlugin, adapter: HostAdapter): PluginResource[] {
  return plugin.resources.filter((resource) => adapter.resources.map(resource) === null)
}
