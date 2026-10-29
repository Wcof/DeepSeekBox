#!/usr/bin/env node
/**
 * 用 DSH 官方校验器（@deepseek-ai/dsh-plugin-market-index）验证根目录 index.json，
 * 保证「发现」页可正常订阅；格式规则以官方实现为准。
 */
import { readFile } from 'node:fs/promises'
import { parseMarketIndex, MarketIndexError } from '@deepseek-ai/dsh-plugin-market-index'

const raw = await readFile(new URL('../index.json', import.meta.url), 'utf8')
try {
  const index = parseMarketIndex(JSON.parse(raw), 'https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json')
  console.log(`✓ 索引通过官方校验：format ${index.format}，${index.plugins.length} 个插件`)
} catch (error) {
  if (error instanceof MarketIndexError) {
    console.error(`✗ ${error.path} ${error.reason}`)
    process.exit(1)
  }
  throw error
}
