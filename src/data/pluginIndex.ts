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

/** 生成 DSH 插件索引（format 1）；收录库更新后索引随之更新 */
export function buildPluginCatalogIndex(): PluginCatalogIndex {
  const plugins = [...OFFICIAL_REGISTRY, ...THIRD_PARTY_REGISTRY].flatMap((group) =>
    group.plugins.map((plugin): IndexPlugin => {
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
        versions: [{ version: plugin.version, source: { type: 'github' }, engines: {} }],
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
