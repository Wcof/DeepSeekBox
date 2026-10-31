/**
 * 适配器登记表 —— 新增宿主的唯一入口。
 *
 * 接一个新宿主的步骤就三步：
 *   1. 在 src/adapters/<宿主id>/ 下提供一个 HostAdapter（同族宿主复用 ../cordis.ts 的工厂）；
 *   2. 把它加进下面的 ADAPTERS；
 *   3. 跑 npm run check:adapters，它会替你盯住 id 冲突、挂载前缀撞车、
 *      方法映射漏项这类「改一个文件忘了另一个」的错误。
 * 除此之外不需要动 src/core/ 里任何一行。
 */

import { dshAdapter } from './dsh'
import { zcodeDshAdapter } from './zcode-dsh'
import type { HostAdapter, HostAdapterId } from './types'

/** 已登记的全部适配器 */
export const ADAPTERS: readonly HostAdapter[] = [dshAdapter, zcodeDshAdapter]

/** 默认宿主：必须是实测过的那个，不然一上来就落到没验证的适配器上 */
const DEFAULT_ADAPTER_ID: HostAdapterId = dshAdapter.id

export function adapterById(id: HostAdapterId | undefined): HostAdapter | undefined {
  if (id === undefined) return undefined
  return ADAPTERS.find((adapter) => adapter.id === id)
}

/**
 * 取当前运行时宿主。
 *
 * 未验证的适配器不会被自动选中——除非显式声明了目标宿主 id，
 * 否则即使某个新适配器登记了，也不会意外成为默认值。
 */
export function resolveAdapter(hostId?: string | undefined): HostAdapter {
  const explicit = adapterById(hostId)
  if (explicit !== undefined) return explicit
  const fallback = adapterById(DEFAULT_ADAPTER_ID)
  if (fallback !== undefined) return fallback
  return dshAdapter
}

function readHostFlag(): string | undefined {
  // 不在浏览器里时（构建期跑 Node）没有宿主标记，直接走默认适配器
  const scope = globalThis as typeof globalThis & { __PLUGBOX_HOST__?: unknown }
  const value = scope.__PLUGBOX_HOST__
  return typeof value === 'string' ? value : undefined
}

/** 当前面板跑在哪个宿主里；只能在运行时读，别在模块顶层缓存成常量 */
export function activeAdapter(): HostAdapter {
  return resolveAdapter(readHostFlag())
}
