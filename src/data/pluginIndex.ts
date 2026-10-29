import { OFFICIAL_REGISTRY, THIRD_PARTY_REGISTRY } from './catalog'

/**
 * DeepSeekBox 插件市场索引源。
 * 生成符合 DSH 插件索引 format 1 的 index.json（对齐 awesome-dsh-plugin 索引结构），
 * 供 DeepSeek Harness「发现」页添加索引源后浏览本 Box 收录的全部插件。
 */

interface Bilingual {
  en: string
  zh: string
}

interface IndexCategory {
  title: Bilingual
}

interface IndexVersion {
  version: string
  publishTimestamp: number
  source: { type: 'github' }
  engines: Record<string, string>
}

interface IndexPlugin {
  name: string
  title: string
  description: Bilingual
  homepage: string
  repository: { url: string }
  metadata: {
    category: string
    keywords: string[]
    labels: string[]
    sortKeys: Record<string, never>
  }
  versions: IndexVersion[]
}

export interface PluginCatalogIndex {
  format: 1
  title: Bilingual
  description: Bilingual
  metadata: {
    categories: Record<string, IndexCategory>
    labels: Record<string, never>
    sortKeys: Record<string, never>
  }
  plugins: IndexPlugin[]
}

/** 插件分类（展示于「发现」页的分组） */
const CATEGORIES: Record<string, IndexCategory> = {
  reading: { title: { en: 'Reading', zh: '阅读' } },
  learning: { title: { en: 'Learning', zh: '学习' } },
  productivity: { title: { en: 'Productivity', zh: '效率' } },
  ui: { title: { en: 'UI Enhancements', zh: '界面增强' } },
  tools: { title: { en: 'Tools', zh: '工具' } },
  models: { title: { en: 'Models & Providers', zh: '模型与供应商' } },
}

/** 每个收录插件的英文描述（与中文描述同义） */
const DESCRIPTIONS_EN: Record<string, string> = {
  'qiaomu-rss-dsh':
    'Read RSS in DeepSeek Harness with native AI companion reading; supports OPML import/export and podcast transcript reading.',
  'qiaomu-reader-dsh':
    'Read EPUB, PDF and TXT in DeepSeek Harness with highlights, reading notes export and AI companion.',
  'qiaomu-ui-learn-dsh':
    'Harness port of Qiaomu UI Learn: 13,561 design references, 106 interaction specimens, aesthetic quizzes and Markdown study notes.',
  'qiaomu-home-dsh':
    'Qiaomu Home makes Harness the start of your day: conversation search, daily focus, todos, notes and a focus timer.',
  'dsh-spotlight':
    'A keyboard-first command palette for DeepSeek Harness Web: fuzzy-find slash commands, recent sessions, UI actions and plugin settings.',
  'dsh-quick-open':
    'VSCode-style Ctrl+P quick open for DSH: fuzzy workspace file search, in-file find, and code reference insertion into AI chats.',
  'dsh-oh-my-terminal':
    'A bottom terminal panel for DSH GUI: multi-session terminal on node-pty and xterm.js with split panes, session persistence and cross-platform support (ConPTY / openpty).',
  'dsh-our-free-model':
    'Use free models such as DeepSeek V4.1 Flash and Kimi K3 without login or API keys; includes a usage dashboard and an OpenAI-compatible local proxy.',
}

const CATEGORY_BY_PLUGIN: Record<string, string> = {
  'qiaomu-rss-dsh': 'reading',
  'qiaomu-reader-dsh': 'reading',
  'qiaomu-ui-learn-dsh': 'learning',
  'qiaomu-home-dsh': 'productivity',
  'dsh-spotlight': 'ui',
  'dsh-quick-open': 'ui',
  'dsh-oh-my-terminal': 'tools',
  'dsh-our-free-model': 'models',
}

/**
 * 各插件当前收录版本的发布时间（Unix 秒）。
 * 来源（gh api 核实于 2026-10-30）：Releases latest 的 published_at；
 * 未发 Release 或 Release 落后于收录版本的（dsh-spotlight、dsh-quick-open），
 * 取 package.json 最后一次变更提交的 committer.date。
 * 「发现」页校验要求该字段为整数 Unix 秒，收录新插件时必须在此登记。
 */
const PUBLISH_TIMESTAMPS: Record<string, number> = {
  'qiaomu-rss-dsh': 1793168802, // release v0.9.2 · 2026-10-28T06:26:42Z
  'qiaomu-reader-dsh': 1793158004, // release v1.1.1 · 2026-10-28T03:26:44Z
  'qiaomu-ui-learn-dsh': 1793158013, // release v0.1.2 · 2026-10-28T03:26:53Z
  'qiaomu-home-dsh': 1793157999, // release v0.3.1 · 2026-10-28T03:26:39Z
  'dsh-spotlight': 1787561813, // package.json 提交 471dee2 · 2026-08-24T08:56:53Z
  'dsh-quick-open': 1791618520, // package.json 提交 81b0405 · 2026-10-10T07:48:40Z
  'dsh-oh-my-terminal': 1793184490, // release v0.4.7 · 2026-10-28T10:48:10Z
  'dsh-our-free-model': 1792990970, // release v2.7.2 · 2026-10-26T05:02:50Z
}

/** 生成 DSH 插件索引（format 1）；收录库更新后索引随之更新 */
export function buildPluginCatalogIndex(): PluginCatalogIndex {
  const plugins = [...OFFICIAL_REGISTRY, ...THIRD_PARTY_REGISTRY].flatMap((group) =>
    group.plugins.map((plugin): IndexPlugin => {
      const publishTimestamp = PUBLISH_TIMESTAMPS[plugin.id]
      if (publishTimestamp === undefined) {
        throw new Error(
          `pluginIndex: ${plugin.id} 缺少 publishTimestamp，请在 PUBLISH_TIMESTAMPS 中登记（Releases published_at 或 package.json 变更提交时间）`,
        )
      }
      const url = `https://github.com/${plugin.repo}`
      return {
        name: plugin.id,
        title: `${plugin.repo}`,
        description: {
          en: DESCRIPTIONS_EN[plugin.id] ?? plugin.description,
          zh: plugin.description,
        },
        homepage: url,
        repository: { url },
        metadata: {
          category: CATEGORY_BY_PLUGIN[plugin.id] ?? 'tools',
          keywords: [plugin.alias, plugin.source === 'official' ? 'official' : 'third-party'],
          labels: [],
          sortKeys: {},
        },
        versions: [{ version: plugin.version, publishTimestamp, source: { type: 'github' }, engines: {} }],
      }
    }),
  )

  return {
    format: 1,
    title: { en: 'DeepSeekBox Plugin Catalog', zh: 'DeepSeekBox 插件索引' },
    description: {
      en: 'Curated DeepSeek Harness plugin catalog maintained by DeepSeekBox: official picks and verified community plugins.',
      zh: 'DeepSeekBox 维护的 DeepSeek Harness 插件收录索引：官方收录与经核实的社区插件。',
    },
    metadata: {
      categories: CATEGORIES,
      labels: {},
      sortKeys: {},
    },
    plugins,
  }
}
