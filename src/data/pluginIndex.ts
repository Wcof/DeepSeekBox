import { OFFICIAL_REGISTRY, THIRD_PARTY_REGISTRY } from './catalog'
import { authorLabel } from '../types/plugin'

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
  source: { type: 'git'; url: string; commit: string }
  engines: Record<string, string>
}

interface IndexPlugin {
  name: string
  title: Bilingual
  description: Bilingual
  author?: string
  icon?: string
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
  'deepseek-box':
    'The DeepSeek Harness plugin center: reads and writes the live plugin state (install, enable, remove, index sources); also published as the DeepSeekBox catalog index.',
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
  'deepseek-box': 'tools',
  'qiaomu-rss-dsh': 'reading',
  'qiaomu-reader-dsh': 'reading',
  'qiaomu-ui-learn-dsh': 'learning',
  'qiaomu-home-dsh': 'productivity',
  'dsh-spotlight': 'ui',
  'dsh-quick-open': 'ui',
  'dsh-oh-my-terminal': 'tools',
  'dsh-our-free-model': 'models',
}

/** 英文展示名（title 的 en 键；zh 键使用收录库的展示名称） */
const TITLE_EN: Record<string, string> = {
  'deepseek-box': 'DeepSeekBox Plugin Center',
  'qiaomu-rss-dsh': 'Qiaomu RSS',
  'qiaomu-reader-dsh': 'Qiaomu Reader',
  'qiaomu-ui-learn-dsh': 'Qiaomu UI Learn',
  'qiaomu-home-dsh': 'Qiaomu Home',
  'dsh-spotlight': 'Spotlight',
  'dsh-quick-open': 'Quick Open',
  'dsh-oh-my-terminal': 'Oh My Terminal',
  'dsh-our-free-model': 'Our Free Model',
}

/**
 * 各插件的项目图标，直接引用其所在仓库的图标文件（按收录版本的提交固定）；
 * 项目未提供图标的（乔木 RSS、Spotlight、Quick Open）使用作者 GitHub 头像。
 * 全部 URL 已用 curl 核实（200，2026-10-30）。
 */
const INDEX_ICONS: Record<string, string> = {
  'deepseek-box':
    'https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/icons/deepseekbox-plugin-center.svg',
  'qiaomu-rss-dsh': 'https://github.com/joeseesun.png',
  'qiaomu-reader-dsh':
    'https://raw.githubusercontent.com/joeseesun/qiaomu-reader-dsh/af0a5a283deee91157efd42eeb2b06372c79b230/icon.svg',
  'qiaomu-ui-learn-dsh':
    'https://raw.githubusercontent.com/joeseesun/qiaomu-ui-learn-dsh/80ac9520f19bfdea79a906f5134d80a2bf68a099/icon.svg',
  'qiaomu-home-dsh':
    'https://raw.githubusercontent.com/joeseesun/qiaomu-home-dsh/45f0c1af9b7dacce424eb87c80d4f3a3c5ab4f70/icon.svg',
  'dsh-spotlight': 'https://github.com/0xsline.png',
  'dsh-quick-open': 'https://github.com/asxiuxiu.png',
  'dsh-oh-my-terminal':
    'https://raw.githubusercontent.com/btsd321/dsh-oh-my-terminal/e40df7b16a162b4df57bd9f77001474d347da748/icon.jpg',
  'dsh-our-free-model':
    'https://raw.githubusercontent.com/Ebony-Vinyl/dsh-our-free-model/e1b347aec9cc956eda70a766219f028a811078e2/icon.svg',
}

/**
 * 各插件当前收录版本的来源登记表。
 * 「发现」页校验（deepseek-ai/deepseek-harness packages/util/plugin-market-index）要求：
 * - publishTimestamp 为整数 Unix 秒；
 * - source.type 为 "npm" 或 "git"，git 必须携带 https 仓库 URL 与 40 位小写 commit SHA。
 * 数据来源（gh api 核实于 2026-10-30）：publishTimestamp 取 Releases latest 的 published_at，
 * 未发 Release 或 Release 落后于收录版本的（dsh-spotlight、dsh-quick-open）取 package.json
 * 最后一次变更提交的 committer.date；commit 取 Release tag / 变更提交的完整 SHA。
 * 收录新插件或升版时必须同步登记，缺失时构建直接报错。
 */
const VERSION_SOURCES: Record<string, { publishTimestamp: number; commit: string }> = {
  'deepseek-box': { publishTimestamp: 1793318933, commit: '26f9321ada24ceff750e9e565d91bef3e519c52d' }, // 本仓库 main；postbuild 由 scripts/sync-self-entry.mjs 同步到最新提交
  'qiaomu-rss-dsh': { publishTimestamp: 1793168802, commit: '7f2deb7ed9583675927663de74d97f70b277c52e' }, // release v0.9.2 · 2026-10-28T06:26:42Z
  'qiaomu-reader-dsh': { publishTimestamp: 1793158004, commit: 'af0a5a283deee91157efd42eeb2b06372c79b230' }, // release v1.1.1 · 2026-10-28T03:26:44Z
  'qiaomu-ui-learn-dsh': { publishTimestamp: 1793158013, commit: '80ac9520f19bfdea79a906f5134d80a2bf68a099' }, // release v0.1.2 · 2026-10-28T03:26:53Z
  'qiaomu-home-dsh': { publishTimestamp: 1793157999, commit: '45f0c1af9b7dacce424eb87c80d4f3a3c5ab4f70' }, // release v0.3.1 · 2026-10-28T03:26:39Z
  'dsh-spotlight': { publishTimestamp: 1787561813, commit: '471dee2c528bc7203669f3e540d38181b657abe4' }, // package.json 提交 · 2026-08-24T08:56:53Z
  'dsh-quick-open': { publishTimestamp: 1791618520, commit: '81b04057d2ce6f7ad585b0d94a3de895c4f26143' }, // package.json 提交 · 2026-10-10T07:48:40Z
  'dsh-oh-my-terminal': { publishTimestamp: 1793184490, commit: 'e40df7b16a162b4df57bd9f77001474d347da748' }, // release tag v0.4.7 解包 · 2026-10-28T10:48:10Z
  'dsh-our-free-model': { publishTimestamp: 1792990970, commit: 'e1b347aec9cc956eda70a766219f028a811078e2' }, // release v2.7.2 · 2026-10-26T05:02:50Z
}

/** 生成 DSH 插件索引（format 1）；收录库更新后索引随之更新 */
export function buildPluginCatalogIndex(): PluginCatalogIndex {
  const plugins = [...OFFICIAL_REGISTRY, ...THIRD_PARTY_REGISTRY].flatMap((group) =>
    group.plugins.map((plugin): IndexPlugin => {
      const versionSource = VERSION_SOURCES[plugin.id]
      if (versionSource === undefined) {
        throw new Error(
          `pluginIndex: ${plugin.id} 缺少版本来源登记，请在 VERSION_SOURCES 中登记 publishTimestamp 与 commit SHA`,
        )
      }
      const url = `https://github.com/${plugin.repo}`
      return {
        name: plugin.id,
        title: { zh: plugin.name, en: TITLE_EN[plugin.id] ?? plugin.name },
        description: {
          en: DESCRIPTIONS_EN[plugin.id] ?? plugin.description,
          zh: plugin.description,
        },
        author: authorLabel(plugin.author, plugin.authorName, true),
        icon: INDEX_ICONS[plugin.id],
        homepage: url,
        repository: { url },
        metadata: {
          category: CATEGORY_BY_PLUGIN[plugin.id] ?? 'tools',
          keywords: [plugin.alias, plugin.source === 'official' ? 'official' : 'third-party'],
          labels: [],
          sortKeys: {},
        },
        versions: [
          {
            version: plugin.version,
            publishTimestamp: versionSource.publishTimestamp,
            source: { type: 'git', url, commit: versionSource.commit },
            engines: {},
          },
        ],
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
