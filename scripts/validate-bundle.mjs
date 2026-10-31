#!/usr/bin/env node
/**
 * 组合包自检：确认本包真的能被 DSH 当成插件装进去。
 *
 * 背景：`@deepseek-ai/dsh-plugin-market-index` 的校验器只检查索引格式，
 * 明确不检查「该包是否声明了组合包」。索引能过、装的时候却被
 * 「这个包没有声明组合包，不能作为插件管理」拒绝，就是漏了这一层。
 * 规则依据 DSH 的 @deepseek-ai/dsh-package-manifest 与插件开发指南。
 */
import { readFile, stat, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const problems = []

function fail(message) {
  problems.push(message)
}

async function exists(relative) {
  try {
    await stat(path.join(ROOT, relative))
    return true
  } catch {
    return false
  }
}

const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'))

// 1. 身份与组合包声明
if (typeof pkg.name !== 'string' || pkg.name.trim() === '') fail('package.json 缺少 name')
if (typeof pkg.version !== 'string' || pkg.version.trim() === '') fail('package.json 缺少 version')
if (pkg.type !== 'module') fail('package.json 的 type 必须为 module')

const patchDeclaration = pkg.dsh?.bundle?.patch
const patchFiles = Array.isArray(patchDeclaration) ? patchDeclaration : patchDeclaration ? [patchDeclaration] : []
if (patchFiles.length === 0) fail('package.json 未声明 dsh.bundle.patch —— DSH 会拒绝把它当插件管理')

for (const file of patchFiles) {
  if (!(await exists(file))) fail(`dsh.bundle.patch 指向的文件不存在：${file}`)
}

// 2. patch 里必须插入本包的一行
for (const file of patchFiles) {
  if (!(await exists(file))) continue
  let rows
  try {
    rows = parseYaml(await readFile(path.join(ROOT, file), 'utf8'))
  } catch (error) {
    fail(`${file} 不是合法 YAML：${error.message}`)
    continue
  }
  if (!Array.isArray(rows)) {
    fail(`${file} 顶层必须是数组（- insert: ...）`)
    continue
  }
  const inserted = rows.flatMap((row) => (Array.isArray(row?.insert) ? row.insert : []))
  if (inserted.length === 0) fail(`${file} 没有任何 insert 行`)
  for (const row of inserted) {
    if (typeof row?.id !== 'string' || row.id === '') fail(`${file} 的 insert 行缺少 id`)
    if (typeof row?.name !== 'string' || row.name === '') fail(`${file} 的 insert 行缺少 name`)
  }
  if (!inserted.some((row) => row?.name === pkg.name)) {
    fail(`${file} 没有插入名为 ${pkg.name} 的插件行`)
  }
}

// 3. 入口与导出
const exportsMap = pkg.exports ?? {}
if (!(await exists(String(exportsMap['.'] ?? ''))) ) fail('exports["."] 缺失或指向不存在的文件（Host 半边入口）')
if (pkg.dsh?.client) {
  if (pkg.dsh.client.platform !== 'web') fail('dsh.client.platform 必须为 web')
  if (!exportsMap['./client']) fail('声明了 dsh.client 但没有 exports["./client"]')
  else if (!(await exists(exportsMap['./client']))) fail(`exports["./client"] 指向的文件不存在：${exportsMap['./client']}`)
}
if (!exportsMap['./icon']) fail('缺少 exports["./icon"]，插件管理器读不到图标')
else if (!(await exists(exportsMap['./icon']))) fail(`exports["./icon"] 指向的文件不存在：${exportsMap['./icon']}`)

const iconFile = exportsMap['./icon']
if (iconFile && (await exists(iconFile))) {
  const { size } = await stat(path.join(ROOT, iconFile))
  if (size > 256 * 1024) fail(`图标超过 256 KiB：${size} 字节`)
}

// 4. 双语展示元数据
const localeDir = path.join(ROOT, 'locale')
let localeFiles = []
try {
  localeFiles = (await readdir(localeDir)).filter((f) => f.endsWith('.json'))
} catch {
  fail('缺少 locale/ 目录，插件管理器读不到标题与描述')
}
for (const lang of ['en', 'zh']) {
  if (!localeFiles.includes(`${lang}.json`)) fail(`缺少 locale/${lang}.json`)
}
for (const file of localeFiles) {
  const data = JSON.parse(await readFile(path.join(localeDir, file), 'utf8'))
  if (!data?.meta?.title) fail(`locale/${file} 缺少 meta.title`)
  if (!data?.meta?.description) fail(`locale/${file} 缺少 meta.description`)
}

// 5. 随包提交的前端产物：git 安装不跑构建，web/ 必须在仓库里
if (!(await exists('web/index.html'))) fail('缺少 web/index.html —— 组合包没有可访问的插件页面')
else {
  const html = await readFile(path.join(ROOT, 'web/index.html'), 'utf8')
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
  if (refs.length === 0) fail('web/index.html 没有引用任何资源')
  for (const ref of refs) {
    if (ref.startsWith('/')) fail(`web/index.html 用了绝对路径 ${ref}；挂到 /plugbox/ 下会 404（vite base 需为 './'）`)
    else if (!(await exists(path.join('web', ref.replace(/^\.\//, ''))))) fail(`web/index.html 引用的资源不存在：${ref}`)
  }
}

// 6. files 白名单要覆盖运行时文件（打包发布会按它过滤）
const listed = Array.isArray(pkg.files) ? pkg.files : []
if (listed.length > 0) {
  for (const required of ['index.js', 'client.js', 'cordis.patch.yml', 'web']) {
    if (!listed.some((entry) => entry === required || entry.startsWith(`${required}/`))) {
      fail(`files 未包含运行时必需的 ${required}`)
    }
  }
}

if (problems.length > 0) {
  console.error('✗ 组合包自检未通过：')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`✓ 组合包自检通过：${pkg.name}@${pkg.version}，patch ${patchFiles.join('、')}，Client 平台 ${pkg.dsh?.client?.platform ?? '无'}`)
