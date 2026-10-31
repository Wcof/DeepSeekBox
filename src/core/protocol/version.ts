/**
 * 版本工具。只实现「数字分段比较」这一件所有宿主都认的事；
 * semver 的范围语法是否支持 prerelease 之类的细节由适配器自决。
 */

/** 逐段比较版本号：1 表示 a 更新，-1 表示 b 更新，0 表示同版本 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d > 0 ? 1 : -1
  }
  return 0
}

/**
 * 兼容判定结果：'unknown' 是诚实答案——宿主没告诉核心它的语义库怎么用，
 * 宁可不标注也不能瞎说「兼容」。
 */
export type Compatibility = 'compatible' | 'incompatible' | 'unknown'

export function compatibilityOf(
  satisfies: ((range: string, runtime: string) => boolean) | undefined,
  range: string | undefined,
  runtime: string | undefined,
): Compatibility {
  if (range === undefined || runtime === undefined) return 'unknown'
  if (satisfies === undefined) return 'unknown'
  try {
    return satisfies(range, runtime) ? 'compatible' : 'incompatible'
  } catch {
    return 'unknown'
  }
}
