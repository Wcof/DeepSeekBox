/**
 * 精选置顶判据的断言。
 *
 * 这条判据直接决定列表第一屏归谁，改坏了很难靠肉眼发现：
 * 「社区目录排在前面」看起来只是排序问题，实际是精选索引被挤走了。
 * 所以这里用 8 条用例把 isPinnedIndex 钉死，任何一条不通过就非零退出。
 *
 *   node scripts/check-pinned-index.mjs
 */
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// 与 check-adapters.mjs 同理：源码里省略扩展名的相对引用 Node 认不了，先打包再加载
const bundlePath = join(mkdtempSync(join(tmpdir(), 'plugbox-')), 'pinned.mjs')
await build({
  entryPoints: ['scripts/check-pinned-entry.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundlePath,
  logLevel: 'silent',
})
const { isPinnedIndex, BRAND } = await import(pathToFileURL(bundlePath).href)

/** 索引 URL 里的仓库必须就是品牌常量里登记的那个，否则自家索引会被判成第三方 */
const cases = [
  // 自家精选索引：不管从哪个 CDN、带不带参数，都要认
  {
    url: 'https://raw.githubusercontent.com/Wcof/PlugBox/main/index.json',
    expected: true,
    note: 'GitHub raw 直链',
  },
  {
    url: 'https://cdn.jsdelivr.net/gh/Wcof/PlugBox@main/index.json',
    expected: true,
    note: 'jsDelivr CDN',
  },
  {
    url: 'https://cdn.jsdelivr.net/gh/Wcof/PlugBox@main/index.json?raw=1',
    expected: true,
    note: '带 ?raw=1 查询串',
  },
  {
    url: 'https://cdn.jsdelivr.net/gh/Wcof/PlugBox@main/index.json#main',
    expected: true,
    note: '带 #hash',
  },
  // 别人的索引：同样是 index.json 也不能置顶，否则第一屏的展示位就送出去了
  {
    url: 'https://raw.githubusercontent.com/someone/their-repo/main/index.json',
    expected: false,
    note: '第三方仓库的同名索引',
  },
  {
    url: 'https://cdn.jsdelivr.net/gh/Wcof/PlugBox-attacker@main/index.json',
    expected: false,
    note: '同 owner 下的相似仓库名',
  },
  {
    url: 'https://raw.githubusercontent.com/Wcof/PlugBox/main/community.json',
    expected: false,
    note: '自家社区目录不算精选',
  },
  {
    url: 'https://example.com/Wcof/PlugBox/index.json',
    expected: false,
    note: '认不得的域名一律不置顶',
  },
]

let failed = 0
for (const testCase of cases) {
  const actual = isPinnedIndex(testCase.url)
  const ok = actual === testCase.expected
  if (!ok) failed += 1
  console.log(
    `${ok ? '✓' : '✗'} ${testCase.note}：期望 ${testCase.expected}，实际 ${actual}\n    ${testCase.url}`,
  )
}

assert.equal(failed, 0, `${failed} 条置顶判据断言未通过`)

// 用例里写的仓库地址必须就是品牌常量登记的那个：两边只要一边改名，另一边就会拦下来
const mismatched = cases.filter(
  (testCase) => testCase.expected && !testCase.url.includes(BRAND.repository),
)
assert.deepEqual(
  mismatched.map((testCase) => testCase.url),
  [],
  `正向用例里的仓库地址与 BRAND.repository（${BRAND.repository}）不一致`,
)

console.log(`✓ 置顶判据断言全部通过（${cases.length} 条，自家仓库 ${BRAND.repository}）`)
