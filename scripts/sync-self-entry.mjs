#!/usr/bin/env node
/**
 * 把「插件中心」自身条目同步到当前 main 提交：
 * index.json 里的 deepseekbox-plugin-center 指向本仓库构建时的 HEAD
 * （version 取 package.json，commit / publishTimestamp 取 git）。
 * 必须在 index.json 生成之后、校验之前运行。
 */
import { readFile, writeFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'

const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
const publishTimestamp = Number.parseInt(execSync('git log -1 --format=%ct HEAD', { encoding: 'utf8' }).trim(), 10)
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

const path = new URL('../index.json', import.meta.url)
const index = JSON.parse(await readFile(path, 'utf8'))
const plugin = index.plugins.find((p) => p.name === 'deepseekbox-plugin-center')
if (!plugin) throw new Error('index.json 中不存在 deepseekbox-plugin-center 条目')
plugin.versions = [
  { version, publishTimestamp, source: { type: 'git', url: 'https://github.com/Wcof/DeepSeekBox', commit }, engines: {} },
]
await writeFile(path, `${JSON.stringify(index, null, 2)}\n`)
console.log(`✓ 插件中心条目已同步：v${version} @ ${commit.slice(0, 8)} (${publishTimestamp})`)
