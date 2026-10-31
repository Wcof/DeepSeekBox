/**
 * 置顶判据检查入口（供 scripts/check-pinned-index.mjs 用）。
 * 存在的原因同 check-adapters-entry.ts：Node 认不了源码里省略扩展名的相对引用。
 */

export { isPinnedIndex } from '../src/data/pinnedIndex'
export { BRAND } from '../src/core/protocol/brand'
