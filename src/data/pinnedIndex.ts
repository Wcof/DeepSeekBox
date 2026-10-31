/**
 * 精选索引的置顶判据。
 *
 * 订阅进来的索引源里，本仓库自带的精选索引（index.json）永远排第一组，
 * 并且不被分批渲染的预算消耗——社区目录有 5,413 条，按条数排序会把它挤到看不见的地方。
 *
 * 判据必须同时满足三点，缺一不可：
 * 1. 路径末段是 index.json（去掉 ?query 与 #hash 之后再判断）；
 * 2. 能明确解析出 owner/repo（认得 raw.githubusercontent.com 与 jsdelivr /gh/ 两种常见写法）；
 * 3. owner/repo 就是本机这个仓库自己。
 *
 * 第 3 条是安全边界：第三方索引随便起个 index.json 就能置顶的话，
 * 等于把列表第一屏的展示位交给了订阅源。同理 Wcof/DeepSeekBox-attacker 必须判否。
 *
 * 本文件只导出纯函数，不 import 任何运行时依赖，好让 scripts/check-pinned-index.mjs 直接断言。
 */

/** 本仓库的 owner/repo，用于判定「是不是自己家的索引」 */
const SELF_REPO = { owner: 'wcof', repo: 'deepseekbox' }

/** 只有本仓库的这个文件才叫精选索引；同仓库的 community.json 不算 */
const FEATURED_BASENAME = 'index.json'

/**
 * 从索引 URL 里解析 owner/repo 并判断是否为精选索引。
 * 解析不出来（认不得的域名、路径不像索引文件）一律返回 false：宁可不置顶，也不误置顶。
 */
export function isPinnedIndex(url: string): boolean {
  let parsed: URL
  try {
    // 常见写法 .../index.json?raw=1 与 .../index.json#main 都要先剥干净
    const cleaned = url.split('#')[0].split('?')[0]
    parsed = new URL(cleaned)
  } catch {
    return false
  }

  if (!parsed.hostname.toLowerCase().endsWith('githubusercontent.com') && !parsed.hostname.toLowerCase().endsWith('github.com') && !parsed.hostname.toLowerCase().endsWith('jsdelivr.net')) {
    return false
  }

  const segments = parsed.pathname.split('/').filter((segment) => segment.length > 0)
  if (segments.length === 0) return false

  if (segments[segments.length - 1].toLowerCase() !== FEATURED_BASENAME) return false

  const host = parsed.hostname.toLowerCase()
  // cdn.jsdelivr.net/gh/<owner>/<repo>@<ref>/index.json
  if (host.endsWith('jsdelivr.net')) {
    const owner = segments[0] === 'gh' ? segments[1] : undefined
    // 没有 @ref 时末段就是仓库名本身
    const repo = segments[0] === 'gh' ? segments[2]?.split('@')[0] : undefined
    return sameRepo(owner, repo)
  }

  // raw.githubusercontent.com/<owner>/<repo>/<ref>/index.json
  // github.com/<owner>/<repo>/raw/<ref>/index.json
  return sameRepo(segments[0], segments[1])
}

function sameRepo(owner: string | undefined, repo: string | undefined): boolean {
  if (!owner || !repo) return false
  return (
    owner.toLowerCase() === SELF_REPO.owner && repo.toLowerCase() === SELF_REPO.repo
  )
}
