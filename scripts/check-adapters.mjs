/**
 * 适配器约束检查（node scripts/check-adapters.mjs）
 *
 * 「新增一个宿主只加适配器、不改核心」是一条很容易在下一个 PR 里被破坏的承诺：
 * 少映射一个方法、挂载前缀和别人撞车、没实测却声明支持……这些都不会立刻报编译错误，
 * 直到用户装机才发现。这里把那些约定变成断言，每次构建都会跑。
 *
 * 新增适配器时不用改这个脚本——它检查的是通用约束，不是某个宿主的实现细节。
 */
import { build } from 'esbuild'
import { mkdtempSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Node 认不了省略扩展名的 TS 相对引用，先用 esbuild 把入口打成单文件再加载
const bundlePath = join(mkdtempSync(join(tmpdir(), 'plugbox-')), 'adapters.mjs')
await build({
  entryPoints: ['scripts/check-adapters-entry.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundlePath,
  logLevel: 'silent',
})
const { ADAPTERS, adapterById, resolveAdapter, activeAdapter, BRAND, readManifest, writeManifest } =
  await import(pathToFileURL(bundlePath).href)

/** canonical 动词全集：适配器的方法映射必须覆盖到每一个 */
const CANONICAL_METHODS = [
  'status',
  'listBundles',
  'listPlugins',
  'setBundleEnabled',
  'setPluginEnabled',
  'removeBundle',
  'installBundle',
  'listIndexes',
  'setIndexes',
  'searchMarket',
  'repoBranches',
]

const failures = []
const notes = []

function fail(message) {
  failures.push(message)
}

/** cordis.patch.yml 只有两三层缩进，懒得多引一个 yaml 依赖进构建链 */
function parseSimpleYaml(text) {
  const out = {}
  const pattern = /^\s*-?\s*(id|name):\s*'?([^'\n]+)'?\s*$/
  for (const line of text.split('\n')) {
    const match = pattern.exec(line)
    if (match !== null) out[match[1]] = match[2].trim()
  }
  return out
}

/** 每条适配器都要满足的硬约束 */
function checkAdapter(adapter) {
  const at = `适配器 ${adapter.id}`

  if (adapter.methods === undefined) {
    fail(`${at}：没有 methods 映射`)
  } else {
    for (const method of CANONICAL_METHODS) {
      const mapped = adapter.methods[method]
      if (typeof mapped !== 'string' || mapped.length === 0) fail(`${at}：方法 ${method} 没映射`)
    }
  }

  if (!adapter.ui.routePrefix.startsWith('/')) fail(`${at}：routePrefix 必须是绝对路径`)
  if (adapter.ui.routePrefix.endsWith('/')) fail(`${at}：routePrefix 不要带尾斜杠`)
  if (!adapter.ui.rpcPath.startsWith(adapter.ui.routePrefix)) {
    fail(`${at}：rpcPath 必须挂在自己的 routePrefix 下`)
  }
  if (adapter.ui.slots.length === 0) fail(`${at}：没有声明要占用的 UI 槽位`)
  if (adapter.catalog.marker.length === 0) fail(`${at}：没有来源标记词`)
  if (adapter.id.length === 0) fail(`${at}：id 为空`)

  // 未实测的适配器必须写明待核实项，否则就是在不交付信息的情况下声称支持
  if (!adapter.verified && (adapter.openQuestions ?? []).length === 0) {
    fail(`${at}：verified 为 false 却没有 openQuestions`)
  }
  if (adapter.verified && (adapter.openQuestions ?? []).length > 0) {
    fail(`${at}：已实测却还挂着 openQuestions，要么清掉要么退回未实测`)
  }
  return adapter.id
}

const seenIds = new Map()
const seenRoutes = new Map()
for (const adapter of ADAPTERS) {
  checkAdapter(adapter)
  if (seenIds.has(adapter.id)) fail(`适配器 id 重复：${adapter.id}`)
  seenIds.set(adapter.id, adapter)
  if (seenRoutes.has(adapter.ui.routePrefix)) {
    fail(`挂载前缀撞车：${adapter.id} 与 ${seenRoutes.get(adapter.ui.routePrefix)} 都用 ${adapter.ui.routePrefix}`)
  }
  seenRoutes.set(adapter.ui.routePrefix, adapter.id)
}

/**
 * manifest 往返：同一份描述在不同宿主之间转格式时，身份信息不能丢。
 * 这一段是「一个插件转成另一个宿主需要的格式」这条承诺的最小证明。
 */
function checkRoundTrip(adapter) {
  const raw = {
    name: 'demo-plugin',
    version: '1.2.3',
    description: '示例插件',
    keywords: ['demo'],
    homepage: 'https://example.com',
    engines: { dsh: '>=0.2.1-rc.2 <0.3.0' },
    dsh: { bundle: { patch: './cordis.patch.yml' } },
  }
  const view = readManifest(raw, adapter)
  if (view.id !== 'demo-plugin') fail(`适配器 ${adapter.id}：extract 丢掉了包名`)
  if (view.version !== '1.2.3') fail(`适配器 ${adapter.id}：extract 丢掉了版本号`)
  if (adapter.manifest.pluginGate !== undefined && !adapter.manifest.pluginGate(view)) {
    fail(`适配器 ${adapter.id}：声明了 dsh.bundle 却没通过插件门槛判定`)
  }

  const key = adapter.manifest.requirementKeyOf('engines.dsh')
  if (!key.startsWith(`${adapter.id}/`)) {
    fail(`适配器 ${adapter.id}：兼容要求键没加命名空间前缀，跨宿主会串台`)
  }

  const written = writeManifest(
    {
      id: view.id,
      name: view.id,
      title: view.title ?? view.id,
      description: view.description ?? '',
      keywords: view.keywords,
      versions: [],
      resources: [],
      provenance: 'third-party',
      authors: [],
    },
    adapter,
    {
      version: view.version,
      requirements: view.requirements,
      hostFields: view.hostFields,
    },
  )
  const back = adapter.manifest.extract(written)
  if (back.id !== 'demo-plugin') fail(`适配器 ${adapter.id}：manifest 往返丢了包名`)
  if (back.version !== '1.2.3') fail(`适配器 ${adapter.id}：manifest 往返丢了版本号`)
  if (JSON.stringify(back.keywords) !== JSON.stringify(raw.keywords)) {
    fail(`适配器 ${adapter.id}：manifest 往返丢了 keywords`)
  }
  const range = back.requirements['engines.dsh']
  if (range !== '>=0.2.1-rc.2 <0.3.0') {
    fail(`适配器 ${adapter.id}：manifest 往返丢了 engines.dsh，得到 ${range}`)
  }
  return true
}

for (const adapter of ADAPTERS) checkRoundTrip(adapter)

/** UI 槽位：认领得住的要有 placement，认领不住的必须返回 null（不能假装接住） */
function checkResources(adapter) {
  const claimed = adapter.resources.map({
    kind: 'ui-slot',
    id: 'entry',
    payload: { slot: adapter.ui.slots[0] },
  })
  if (claimed === null) fail(`适配器 ${adapter.id}：连自己声明的槽位都认领不了`)
  else if (claimed.placement !== adapter.ui.slots[0]) fail(`适配器 ${adapter.id}：槽位 placement 不对`)

  const unclaimed = adapter.resources.map({ kind: 'model', id: 'm1', payload: {} })
  if (unclaimed !== null) {
    notes.push(`${adapter.id} 认领了 model 资源：确认这是真的支持，而不是默认放行`)
  }
  return true
}

for (const adapter of ADAPTERS) checkResources(adapter)

/** 默认宿主必须是实测过的那个 */
const resolved = activeAdapter()
if (!resolved.verified) fail(`默认适配器 ${resolved.id} 没有实测过`)
if (adapterById('unknown-host') !== undefined) fail('查一个没登记的宿主应该返回 undefined')

/** 未实测的适配器不许被自动选中：只有显式指定 id 才会命中它 */
for (const adapter of ADAPTERS) {
  if (adapter.verified) continue
  if (resolveAdapter().id === adapter.id) fail(`未实测的 ${adapter.id} 被当成了默认宿主`)
  if (resolveAdapter(adapter.id).id !== adapter.id) fail(`显式指定 ${adapter.id} 却没有命中它`)
}

/**
 * 宿主半边 ↔ 适配器的一致性。
 *
 * Host 半边（index.js）和组合包 patch（cordis.patch.yml）没法和面板共用一份 TS 常量，
 * 于是「路由前缀」「面板 id」「包名」就会出现两份真值。过去踩过一次钉子：
 * 适配器改了、宿主侧没改，选择器就哑了。这里直接读文本文件核对。
 */
async function checkHostWiring(adapter) {
  const host = await readFile('index.js', 'utf8')
  const routeMatch = /const ROUTE = '([^']+)'/.exec(host)
  if (routeMatch === null) {
    fail('index.js 里找不到 const ROUTE，主机挂载前缀改到别处了？同步更新这个检查')
  } else if (routeMatch[1] !== adapter.ui.routePrefix) {
    fail(
      `宿主挂载前缀不一致：index.js 挂 ${routeMatch[1]}，适配器声明 ${adapter.ui.routePrefix}`,
    )
  }
  const effectKey = /'([\w-]+:web-route)'/.exec(host)
  if (effectKey !== null && !effectKey[1].startsWith(adapter.ui.effectKeyPrefix)) {
    fail(`宿主 effect key 前缀与适配器不一致：${effectKey[1]} 应以 ${adapter.ui.effectKeyPrefix} 开头`)
  }

  const patch = parseSimpleYaml(await readFile('cordis.patch.yml', 'utf8'))
  if (patch.id !== undefined && patch.id !== adapter.ui.panelId) {
    fail(`cordis.patch.yml 的 id 是 ${patch.id}，适配器要求 ${adapter.ui.panelId}`)
  }
  if (patch.name !== undefined && patch.name !== BRAND.packageName) {
    fail(`cordis.patch.yml 的 name 是 ${patch.name}，包名应为 ${BRAND.packageName}`)
  }
}

const dsh = adapterById('dsh')
if (dsh === undefined) fail('缺少 dsh 适配器：它是当前唯一实测过的宿主')
else await checkHostWiring(dsh)

for (const adapter of ADAPTERS) {
  const tag = adapter.verified ? '已实测' : '未实测'
  console.log(
    `✓ ${adapter.id.padEnd(12)} ${tag}  族=${adapter.family}  前缀=${adapter.ui.routePrefix}  标记=${adapter.catalog.marker}`,
  )
  if (adapter.catalog.marker !== BRAND.catalogMarker) {
    notes.push(`${adapter.id} 的来源标记词是 ${adapter.catalog.marker}，与 BRAND.catalogMarker 不一致`)
  }
}

for (const note of notes) console.log(`· 提示：${note}`)

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} 条适配器约束未满足：`)
  for (const message of failures) console.error(`  - ${message}`)
  process.exit(1)
}

console.log(`✓ 适配器约束全部通过（${ADAPTERS.length} 个适配器）`)
