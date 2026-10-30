#!/usr/bin/env node
/**
 * 把「插件中心」自身条目同步到当前 main 提交：
 * index.json 里的 deepseek-box 指向本仓库构建时的 HEAD
 * （version 取 package.json，commit / publishTimestamp 取 git）。
 * 必须在 index.json 生成之后、校验之前运行。
 *
 * 同时同步仓库根目录与 web/ 内的两份索引：前者供发现页订阅，
 * 后者是插件内「索引源」按钮在面板里读到的那份，两者必须一致。
 */
import { readFile, writeFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'

const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
const publishTimestamp = Number.parseInt(execSync('git log -1 --format=%ct HEAD', { encoding: 'utf8' }).trim(), 10)
const { version, engines } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

/** 自身条目的 DSH 版本要求同样取自 package.json，不写死空对象 */
const enginesDsh = typeof engines?.dsh === 'string' ? engines.dsh : undefined

async function sync(label, url) {
  let index
  try {
    index = JSON.parse(await readFile(url, 'utf8'))
  } catch (error) {
    if (label === 'web/index.json') return false
    throw error
  }
  const plugin = index.plugins.find((p) => p.name === 'deepseek-box')
  if (!plugin) throw new Error(`${label} 中不存在 deepseek-box 条目`)
  plugin.versions = [
    {
      version,
      publishTimestamp,
      source: { type: 'git', url: 'https://github.com/Wcof/DeepSeekBox', commit },
      engines: enginesDsh === undefined ? {} : { dsh: enginesDsh },
    },
  ]
  await writeFile(url, `${JSON.stringify(index, null, 2)}\n`)
  return true
}

await sync('index.json', new URL('../index.json', import.meta.url))
await sync('web/index.json', new URL('../web/index.json', import.meta.url))
console.log(`✓ 插件中心条目已同步：v${version} @ ${commit.slice(0, 8)} (${publishTimestamp})`)
