#!/usr/bin/env node
/**
 * 把 scan-community-hub.mjs 的体检报告转成社区目录数据（data/community/entries.json）。
 *
 * 只接受体检通过（仓库可达 + 有 package.json + 声明 dsh.bundle + 版本是 semver）的条目；
 * 字段一律以仓库里的 package.json 为准，描述只用目录里的中文文案（英文目录有则一并带上）。
 *
 * 用法：node scripts/build-community.mjs --report /tmp/community-scan.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const args = process.argv.slice(2)
const value = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback
}

const reportPath = value('report', '/tmp/community-scan.json')
const outPath = value('out', 'data/community/entries.json')

/** 目录分类 → 本索引的分类键（索引 metadata.categories 里的那六个） */
const CATEGORY_MAP = {
  tools: 'tools',
  interface: 'ui',
  model: 'models',
  dev: 'tools',
  session: 'tools',
  integration: 'tools',
  agent: 'tools',
  knowledge: 'learning',
  workflow: 'productivity',
  fun: 'ui',
  memory: 'tools',
  media: 'ui',
  search: 'tools',
  data: 'tools',
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`)
  return response.json()
}

const report = JSON.parse(await readFile(reportPath, 'utf8'))
const zh = await fetchJson('https://api.dsh-plugin.org/plugins.zh.json').catch(() => [])
const en = await fetchJson('https://api.dsh-plugin.org/plugins.en.json').catch(() => [])

const descZh = new Map((Array.isArray(zh) ? zh : []).map((item) => [item.s, item.d ?? '']))
const descEn = new Map((Array.isArray(en) ? en : []).map((item) => [item.s, item.d ?? '']))

const byPackage = new Map()
let skippedDuplicate = 0

for (const item of report.results ?? []) {
  if (!item.ok) continue
  const id = item.packageName
  if (typeof id !== 'string' || id.trim() === '') continue
  const existing = byPackage.get(id)
  if (existing !== undefined) {
    skippedDuplicate += 1
    if ((item.stars ?? 0) <= (existing.stars ?? 0)) continue
  }
  byPackage.set(id, {
    id,
    repo: item.repo,
    version: item.version,
    commit: item.sha,
    enginesDsh: item.enginesDsh ?? null,
    license: item.license ?? null,
    category: CATEGORY_MAP[item.category] ?? 'tools',
    stars: item.stars ?? 0,
    updated: Date.parse(item.updated) || 0,
    descriptionZh: descZh.get(item.slug) ?? '',
    descriptionEn: descEn.get(item.slug) ?? '',
  })
}

const entries = [...byPackage.values()].sort((a, b) => b.stars - a.stars)

await mkdir('data/community', { recursive: true })
await writeFile(outPath, `${JSON.stringify(entries, null, 0)}\n`)

const withEngines = entries.filter((entry) => entry.enginesDsh !== null).length
const withLicense = entries.filter((entry) => entry.license !== null).length
console.log(`体检通过 ${(report.results ?? []).filter((item) => item.ok).length} 条`)
console.log(`去重后写入 ${entries.length} 条（跳过重复 ${skippedDuplicate}）`)
console.log(`  声明了 engines.dsh：${withEngines}`)
console.log(`  带 license 字段：${withLicense}`)
console.log(`输出：${outPath}`)
