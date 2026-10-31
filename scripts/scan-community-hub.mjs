#!/usr/bin/env node
/**
 * dsh-plugin-hub 目录 → 本仓库收录库的「核实式」导入器。
 *
 * 原则：只信仓库本身，不信第三方目录的字段。
 * 每条都要过三关，任何一关不过就跳过并记录原因：
 *   1. 仓库存在：`git ls-remote <repo> HEAD` 能读到 HEAD（不存在/私有/改名都会失败）
 *   2. 包可读：在该 commit 上取到 package.json
 *   3. 是 DSH 组合包：package.json 声明 dsh.bundle，且有 semver 版本
 *
 * 用法：
 *   node scripts/scan-community-hub.mjs --limit 50            # 抽样体检
 *   node scripts/scan-community-hub.mjs --stars 100           # 只扫星数达标的
 *   node scripts/scan-community-hub.mjs --all --out /tmp/report.json
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile } from 'node:fs/promises'

const execFileAsync = promisify(execFile)
const SOURCE = 'https://api.dsh-plugin.org/plugins.zh.json'
const CONCURRENCY = 12

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const value = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback
}

const limit = Number.parseInt(value('limit', '0'), 10)
const minStars = Number.parseInt(value('stars', '0'), 10)
const outPath = value('out', '/tmp/community-scan.json')
const SAMPLE = /^v?\d+\.\d+\.\d+/

async function headOf(repo) {
  try {
    const { stdout } = await execFileAsync('git', ['ls-remote', `https://github.com/${repo}`, 'HEAD'], {
      timeout: 25_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })
    const line = stdout.trim().split('\n')[0] ?? ''
    const [sha] = line.split('\t')
    return /^[0-9a-f]{40}$/.test(sha ?? '') ? sha : null
  } catch {
    return null
  }
}

async function manifestAt(repo, sha) {
  try {
    const response = await fetch(`https://raw.githubusercontent.com/${repo}/${sha}/package.json`, {
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return null
    const manifest = await response.json()
    return typeof manifest === 'object' && manifest !== null ? manifest : null
  } catch {
    return null
  }
}

function licenseOf(manifest) {
  const raw = manifest?.license
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim()
  if (typeof raw?.type === 'string' && raw.type.trim() !== '') return raw.type.trim()
  return null
}

async function inspect(entry) {
  const repo = entry?.r?.repo
  const base = {
    repo,
    slug: entry.s,
    nameFromCatalog: entry.n,
    stars: entry.sg ?? 0,
    updated: entry.u,
    category: entry.c,
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '')) {
    return { ...base, ok: false, reason: 'repo-missing' }
  }
  const sha = await headOf(repo)
  if (sha === null) return { ...base, ok: false, reason: 'repo-unreachable', sha: null }

  const manifest = await manifestAt(repo, sha)
  if (manifest === null) return { ...base, ok: false, reason: 'no-package-json', sha }

  if (manifest.dsh?.bundle === undefined || manifest.dsh.bundle === null) {
    return { ...base, ok: false, reason: 'not-a-bundle', sha, packageName: manifest.name }
  }
  const version = String(manifest.version ?? '')
  if (!SAMPLE.test(version)) {
    return { ...base, ok: false, reason: 'bad-version', sha, packageName: manifest.name }
  }

  return {
    ...base,
    ok: true,
    sha,
    packageName: manifest.name,
    version,
    enginesDsh: typeof manifest.engines?.dsh === 'string' ? manifest.engines.dsh : null,
    license: licenseOf(manifest),
    peerDsh: Object.entries(manifest.peerDependencies ?? {})
      .filter(([name]) => name === 'dsh' || name.startsWith('@deepseek-ai/dsh'))
      .map(([name, range]) => `${name}@${range}`),
  }
}

const response = await fetch(SOURCE, { signal: AbortSignal.timeout(30_000) })
if (!response.ok) throw new Error(`拉取目录失败：HTTP ${response.status}`)
const catalog = await response.json()

let pool = catalog
if (minStars > 0) pool = pool.filter((entry) => (entry.sg ?? 0) >= minStars)
if (limit > 0) pool = pool.slice(0, limit)

console.log(`目录 ${catalog.length} 条；本次检查 ${pool.length} 条（stars≥${minStars}，limit=${limit || '不限'}）`)

const results = []
let cursor = 0
let done = 0
const started = Date.now()

async function worker() {
  while (cursor < pool.length) {
    const entry = pool[cursor++]
    results.push(await inspect(entry))
    done += 1
    if (done % 25 === 0) {
      const rate = done / ((Date.now() - started) / 1000)
      console.log(`  ${done}/${pool.length}  ${rate.toFixed(1)} 条/秒`)
    }
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pool.length) }, worker))

const ok = results.filter((item) => item.ok)
const reasons = new Map()
for (const item of results.filter((item) => !item.ok)) {
  reasons.set(item.reason, (reasons.get(item.reason) ?? 0) + 1)
}

console.log(`\n可用 ${ok.length} / ${results.length}（${((ok.length / results.length) * 100).toFixed(1)}%）`)
for (const [reason, count] of [...reasons.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  跳过 ${reason}: ${count}`)
}
console.log(`耗时 ${((Date.now() - started) / 1000).toFixed(1)}s`)

await writeFile(outPath, `${JSON.stringify({ scannedAt: new Date().toISOString(), total: results.length, ok: ok.length, results }, null, 2)}\n`)
console.log(`报告：${outPath}`)
