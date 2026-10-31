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
import { isPinnedIndex } from '../src/data/pinnedIndex.ts'

const cases = [
  // 自家精选索引：不管从哪个 CDN、带不带参数，都要认
  {
    url: 'https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json',
    expected: true,
    note: 'GitHub raw 直链',
  },
  {
    url: 'https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json',
    expected: true,
    note: 'jsDelivr CDN',
  },
  {
    url: 'https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json?raw=1',
    expected: true,
    note: '带 ?raw=1 查询串',
  },
  {
    url: 'https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json#main',
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
    url: 'https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox-attacker@main/index.json',
    expected: false,
    note: '同 owner 下的相似仓库名',
  },
  {
    url: 'https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/community.json',
    expected: false,
    note: '自家社区目录不算精选',
  },
  {
    url: 'https://example.com/Wcof/DeepSeekBox/index.json',
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
console.log(`✓ 置顶判据断言全部通过（${cases.length} 条）`)
