<script setup lang="ts">
import { pluginCenter } from '../../stores/pluginCenter'
import type { LocalFilter, StoreFilter } from '../../types/plugin'
import AppIcon from '../icons/AppIcon.vue'
import LocalPluginCard from './LocalPluginCard.vue'
import StorePluginCard from './StorePluginCard.vue'
import FilterSelect from '../ui/FilterSelect.vue'

const {
  state,
  localBase,
  localStats,
  storeStats,
  storeTruncated,
  authorFacets,
  setStoreAuthor,
  visibleStoreCount,
  filteredLocal,
  storeGroups,
  updateCount,
  switchTab,
  checkUpdates,
  updateAll,
  dismissUpdateNotice,
  openInstallDialog,
  openDevGuide,
  loadLocal,
  loadStore,
  scheduleStoreSearch,
  subscribeSelfIndex,
  gotoStore,
  setLocalFilter,
  setStoreFilter,
} = pluginCenter

/** 统计卡与筛选 chips 共用同一套分类，点统计卡即筛选 */
const LOCAL_CARDS = [
  { key: 'all', label: '全部插件', chip: '全部', icon: 'box', tint: '' },
  { key: 'official', label: '官方插件', chip: '官方', icon: 'shield-check', tint: 'green' },
  { key: 'third-party', label: '第三方插件', chip: '第三方', icon: 'users', tint: 'blue' },
  { key: 'local', label: '本地安装', chip: '本地', icon: 'monitor', tint: 'violet' },
] as const

const STORE_CARDS = [
  { key: 'all', label: '收录插件', chip: '全部', icon: 'box', tint: '' },
  { key: 'official', label: '官方收录', chip: '官方收录', icon: 'shield-check', tint: 'green' },
  { key: 'third-party', label: '第三方收录', chip: '第三方', icon: 'users', tint: 'blue' },
  { key: 'installed', label: '已安装', chip: '已安装', icon: 'circle-check', tint: 'amber' },
] as const

const LOCAL_CHIPS: ReadonlyArray<{ key: LocalFilter; label: string }> = LOCAL_CARDS.map(
  ({ key, chip }) => ({ key, label: chip }),
)

const STORE_CHIPS: ReadonlyArray<{ key: StoreFilter; label: string }> = [
  ...STORE_CARDS.map(({ key, chip }) => ({ key, label: chip })),
  { key: 'available', label: '可安装' },
]

const LOCAL_SORTS = [
  { value: 'status', label: '状态优先' },
  { value: 'name', label: '按名称' },
  { value: 'package', label: '按包名' },
  { value: 'origin', label: '按来源' },
]

const STORE_SORTS = [
  { value: 'index', label: '索引顺序' },
  { value: 'name', label: '按名称' },
  { value: 'author', label: '按作者' },
  { value: 'installable', label: '未安装优先' },
] as const

const SUBTITLE = {
  local: '管理已安装插件、查看来源并维护插件运行状态',
  store: '浏览已订阅索引源收录的插件，按需安装或更新',
}

/** 本包自带的索引文件：页面挂在 /deepseekbox/ 前缀下，必须用相对路径 */
function openIndexSource(): void {
  window.open('./index.json', '_blank', 'noopener')
}

const listLoading = (tab: 'local' | 'store') =>
  tab === 'local' ? state.localStatus === 'loading' : state.storeStatus === 'loading'

const listError = (tab: 'local' | 'store') =>
  tab === 'local' ? state.localStatus === 'error' : state.storeStatus === 'error'

const hostOffline = () => state.hostOnline === false

const localIdle = () => state.localStatus === 'ready' && !listError('local')

const nothingInstalled = () => localIdle() && localBase.value.length === 0

const noLocalMatch = () =>
  localIdle() && localBase.value.length > 0 && filteredLocal.value.length === 0

const noStoreMatch = () =>
  state.storeStatus === 'ready' && state.market.length > 0 && visibleStoreCount.value === 0

function clearLocalFilters(): void {
  state.localQuery = ''
  state.localFilter = 'all'
}

function clearStoreFilters(): void {
  state.storeQuery = ''
  state.storeFilter = 'all'
  state.storeAuthors = []
  void loadStore()
}

const indexErrorList = () => Object.entries(state.indexErrors)

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
</script>

<template>
  <div class="page">
    <div class="page__head">
      <div class="page__head-top">
        <div class="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="tabs__tab"
            :class="{ 'tabs__tab--active': state.activeTab === 'local' }"
            :aria-selected="state.activeTab === 'local'"
            @click="switchTab('local')"
          >
            插件管理
          </button>
          <button
            type="button"
            role="tab"
            class="tabs__tab"
            :class="{ 'tabs__tab--active': state.activeTab === 'store' }"
            :aria-selected="state.activeTab === 'store'"
            @click="switchTab('store')"
          >
            插件市场
          </button>
        </div>

        <div class="page__actions">
          <button
            type="button"
            class="btn btn--secondary"
            :disabled="state.checkingUpdates || listLoading(state.activeTab)"
            @click="checkUpdates()"
          >
            <span v-if="state.checkingUpdates" class="spinner" />
            <AppIcon v-else name="refresh" :size="16" />
            检查更新
          </button>

          <button
            v-if="state.activeTab === 'local' && updateCount > 0"
            type="button"
            class="btn btn--secondary"
            :disabled="state.updatingAll"
            @click="updateAll()"
          >
            <span v-if="state.updatingAll" class="spinner" />
            <AppIcon v-else name="download" :size="16" />
            一键更新
            <span class="chip__count">{{ updateCount }}</span>
          </button>

          <button
            type="button"
            class="btn btn--primary"
            :disabled="state.busy.installSpec"
            @click="openInstallDialog()"
          >
            <AppIcon name="plus" :size="16" />
            安装插件
          </button>

          <button type="button" class="btn btn--secondary" @click="openDevGuide()">
            <AppIcon name="book-open" :size="16" />
            开发指南
          </button>
        </div>
      </div>

      <p class="page__subtitle">{{ SUBTITLE[state.activeTab] }}</p>
    </div>

    <div v-if="updateCount > 0 && !state.updateNoticeDismissed" class="update-notice" role="status">
      <span class="update-notice__icon"><AppIcon name="download" :size="18" /></span>
      <div class="update-notice__text">
        <strong>发现 {{ updateCount }} 个可更新插件</strong>
        <span>版本来自你订阅的索引源，更新前不会自动改动任何东西</span>
      </div>
      <div class="update-notice__actions">
        <button
          type="button"
          class="btn btn--primary btn--sm"
          :disabled="state.updatingAll"
          @click="updateAll()"
        >
          <span v-if="state.updatingAll" class="spinner" />
          一键更新
        </button>
        <button type="button" class="btn btn--secondary btn--sm" @click="dismissUpdateNotice()">
          稍后
        </button>
      </div>
    </div>

    <!-- 插件管理 -->
    <template v-if="state.activeTab === 'local'">
      <section v-if="localIdle()" class="stats" aria-label="插件来源统计">
        <button
          v-for="card in LOCAL_CARDS"
          :key="card.key"
          type="button"
          class="stat"
          :class="{ 'stat--active': state.localFilter === card.key && card.key !== 'all' }"
          :aria-pressed="state.localFilter === card.key"
          @click="setLocalFilter(card.key)"
        >
          <span class="stat__icon" :class="card.tint ? `stat__icon--${card.tint}` : ''">
            <AppIcon :name="card.icon" :size="19" />
          </span>
          <span class="stat__text">
            <span class="stat__label">{{ card.label }}</span>
            <span class="stat__value">{{ localStats[card.key] }}</span>
          </span>
        </button>
      </section>

      <div class="filters">
        <div class="search">
          <span class="search__icon"><AppIcon name="search" :size="16" /></span>
          <input
            v-model="state.localQuery"
            type="search"
            class="search__input"
            placeholder="搜索插件名称或 ID"
            aria-label="搜索本地插件"
          />
          <button
            v-if="state.localQuery"
            type="button"
            class="search__clear"
            aria-label="清空搜索"
            @click="state.localQuery = ''"
          >
            <AppIcon name="x" :size="15" />
          </button>
        </div>

        <div class="chips" role="group" aria-label="按来源筛选">
          <button
            v-for="chip in LOCAL_CHIPS"
            :key="chip.key"
            type="button"
            class="chip"
            :class="{ 'chip--active': state.localFilter === chip.key }"
            @click="setLocalFilter(chip.key)"
          >
            {{ chip.label }}
            <span class="chip__count">{{ localStats[chip.key] }}</span>
          </button>
        </div>

        <div class="filters__tail">
          <FilterSelect
            v-model="state.localSort"
            :options="LOCAL_SORTS"
            prefix="排序"
            leading-icon="arrow-up-down"
            aria-label="插件管理排序方式"
          />
          <button
            type="button"
            class="filters__icon-btn"
            :disabled="listLoading('local')"
            aria-label="刷新插件列表"
            @click="loadLocal()"
          >
            <span v-if="listLoading('local')" class="spinner" />
            <AppIcon v-else name="refresh" :size="16" />
            刷新
          </button>
        </div>
      </div>

      <div v-if="listLoading('local')" class="card-grid">
        <div v-for="n in 6" :key="n" class="skeleton-card" />
      </div>

      <div v-else-if="listError('local')" class="state-box">
        <span class="state-box__icon"><AppIcon name="alert-circle" :size="40" /></span>
        <span class="state-box__title">{{ hostOffline() ? '没连上 DSH 宿主' : '插件列表加载失败' }}</span>
        <span class="state-box__hint">
          {{
            hostOffline()
              ? '插件中心要在 DeepSeek Harness 里打开；npm run dev 只用于调页面样式'
              : '宿主返回了错误，请稍后重试'
          }}
        </span>
        <button type="button" class="btn btn--secondary state-box__action" @click="loadLocal()">
          重试
        </button>
      </div>

      <div v-else-if="nothingInstalled()" class="state-box">
        <span class="state-box__icon"><AppIcon name="inbox" :size="40" /></span>
        <span class="state-box__title">这个 profile 还没有安装插件</span>
        <span class="state-box__hint">去插件市场挑一个，或用「安装插件」直接填包名</span>
        <button type="button" class="btn btn--primary state-box__action" @click="gotoStore()">
          前往插件市场
        </button>
      </div>

      <div v-else-if="noLocalMatch()" class="state-box">
        <span class="state-box__icon"><AppIcon name="search" :size="40" /></span>
        <span class="state-box__title">没有符合条件的插件</span>
        <span class="state-box__hint">换个包名片段、插件行名称，或回到全部分类</span>
        <button type="button" class="btn btn--secondary state-box__action" @click="clearLocalFilters()">
          清除搜索与筛选
        </button>
      </div>

      <div v-else class="card-grid">
        <LocalPluginCard v-for="bundle in filteredLocal" :key="bundle.name" :bundle="bundle" />
      </div>
    </template>

    <!-- 插件市场 -->
    <template v-else>
      <section v-if="state.storeStatus === 'ready'" class="stats" aria-label="收录来源统计">
        <button
          v-for="card in STORE_CARDS"
          :key="card.key"
          type="button"
          class="stat"
          :class="{ 'stat--active': state.storeFilter === card.key && card.key !== 'all' }"
          :aria-pressed="state.storeFilter === card.key"
          @click="setStoreFilter(card.key)"
        >
          <span class="stat__icon" :class="card.tint ? `stat__icon--${card.tint}` : ''">
            <AppIcon :name="card.icon" :size="19" />
          </span>
          <span class="stat__text">
            <span class="stat__label">{{ card.label }}</span>
            <span class="stat__value">{{ storeStats[card.key] }}</span>
          </span>
        </button>
      </section>

      <div class="filters">
        <div class="search">
          <span class="search__icon"><AppIcon name="search" :size="16" /></span>
          <input
            v-model="state.storeQuery"
            type="search"
            class="search__input"
            placeholder="搜索名称、作者或关键词"
            aria-label="搜索市场插件"
            @input="scheduleStoreSearch()"
          />
          <button
            v-if="state.storeQuery"
            type="button"
            class="search__clear"
            aria-label="清空搜索"
            @click="state.storeQuery = ''; loadStore()"
          >
            <AppIcon name="x" :size="15" />
          </button>
        </div>

        <div class="chips" role="group" aria-label="按来源筛选">
          <button
            v-for="chip in STORE_CHIPS"
            :key="chip.key"
            type="button"
            class="chip"
            :class="{ 'chip--active': state.storeFilter === chip.key }"
            @click="setStoreFilter(chip.key)"
          >
            {{ chip.label }}
            <span class="chip__count">{{ storeStats[chip.key] }}</span>
          </button>
        </div>

        <div v-if="authorFacets.length > 1" class="facets">
          <span class="facets__label">创作者</span>
          <button
            type="button"
            class="chip"
            :class="{ 'chip--active': state.storeAuthors.length === 0 }"
            @click="state.storeAuthors = []"
          >
            全部
          </button>
          <button
            v-for="facet in authorFacets"
            :key="facet.author"
            type="button"
            class="chip"
            :class="{ 'chip--active': state.storeAuthors.includes(facet.author) }"
            :aria-pressed="state.storeAuthors.includes(facet.author)"
            :title="facet.author"
            @click="setStoreAuthor(facet.author)"
          >
            <span class="chip__label">{{ facet.author }}</span>
            <span class="chip__count">{{ facet.count }}</span>
          </button>
          <span v-if="state.storeAuthors.length > 1" class="facets__hint">多选取任一命中</span>
        </div>

        <div class="filters__tail">
          <FilterSelect
            v-model="state.storeSort"
            :options="STORE_SORTS"
            prefix="排序"
            leading-icon="arrow-up-down"
            aria-label="插件市场排序方式"
          />
          <button type="button" class="filters__icon-btn" @click="openIndexSource()">
            <AppIcon name="rss" :size="16" />
            索引源
          </button>
          <button
            type="button"
            class="filters__icon-btn"
            :disabled="listLoading('store')"
            aria-label="刷新索引源"
            @click="loadStore(true)"
          >
            <span v-if="listLoading('store')" class="spinner" />
            <AppIcon v-else name="refresh" :size="16" />
            刷新
          </button>
        </div>
      </div>

      <div v-if="listLoading('store')" class="card-grid">
        <div v-for="n in 6" :key="n" class="skeleton-card" />
      </div>

      <div v-else-if="listError('store') || hostOffline()" class="state-box">
        <span class="state-box__icon"><AppIcon name="alert-circle" :size="40" /></span>
        <span class="state-box__title">{{ hostOffline() ? '没连上 DSH 宿主' : '插件市场加载失败' }}</span>
        <span class="state-box__hint">
          {{
            hostOffline()
              ? '插件中心要在 DeepSeek Harness 里打开；npm run dev 只用于调页面样式'
              : '宿主没有返回索引源列表，请稍后重试'
          }}
        </span>
        <button type="button" class="btn btn--secondary state-box__action" @click="loadStore()">
          重试
        </button>
      </div>

      <div v-else-if="!state.indexes.length" class="state-box">
        <span class="state-box__icon"><AppIcon name="inbox" :size="40" /></span>
        <span class="state-box__title">还没有配置索引源</span>
        <span class="state-box__hint">订阅 DeepSeekBox 索引后，这里会列出它收录的插件</span>
        <div class="state-box__actions">
          <button
            type="button"
            class="btn btn--primary"
            :disabled="state.busy.subscribe"
            @click="subscribeSelfIndex()"
          >
            <span v-if="state.busy.subscribe" class="spinner" />
            订阅 DeepSeekBox 索引
          </button>
          <button type="button" class="btn btn--secondary" @click="openIndexSource()">
            查看索引文件
          </button>
        </div>
      </div>

      <div v-else-if="noStoreMatch()" class="state-box">
        <span class="state-box__icon"><AppIcon name="search" :size="40" /></span>
        <span class="state-box__title">
          {{ state.market.length ? '没有符合条件的插件' : '索引里没有插件' }}
        </span>
        <span class="state-box__hint">换个关键词，或清空搜索与筛选条件</span>
        <button
          v-if="state.market.length"
          type="button"
          class="btn btn--secondary state-box__action"
          @click="clearStoreFilters()"
        >
          清除搜索与筛选
        </button>
      </div>

      <template v-else>
        <div v-if="indexErrorList().length" class="index-errors">
          <div v-for="[url, message] in indexErrorList()" :key="url" class="index-errors__item">
            <AppIcon name="alert-circle" :size="16" />
            <span><span class="mono">{{ hostOf(url) }}</span> 读取失败：{{ message }}</span>
          </div>
        </div>

        <p v-if="storeTruncated" class="index-errors__item" role="status">
          <AppIcon name="alert-circle" :size="16" />
          <span>索引共 {{ storeTruncated }} 个插件，已加载 {{ state.market.length }} 个（达到单次翻页上限）</span>
        </p>

        <section v-for="group in storeGroups" :key="group.url" class="store-group">
          <header class="store-group__header">
            <span class="store-group__name">{{ group.title }}</span>
            <span class="store-group__count">{{ group.entries.length }}</span>
            <span class="store-group__id">{{ hostOf(group.url) }}</span>
            <span class="store-group__rule" />
            <a
              class="store-group__link"
              :href="group.url"
              target="_blank"
              rel="noopener"
              :aria-label="`打开 ${group.title}`"
            >
              <AppIcon name="external-link" :size="14" />
            </a>
          </header>
          <div class="card-grid">
            <StorePluginCard v-for="entry in group.entries" :key="`${group.url}${entry.name}`" :entry="entry" />
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.update-notice {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  margin-bottom: 18px;
  border: 1px solid #fde68a;
  border-radius: 12px;
  background: var(--amber-bg);
  color: var(--amber-text);
}

.update-notice__icon {
  display: flex;
  flex: none;
}

.update-notice__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}

.update-notice__text strong {
  font-size: 14px;
  font-weight: 600;
}

.update-notice__actions {
  display: flex;
  gap: 8px;
  flex: none;
}

.state-box__actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.index-errors {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.index-errors__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #fde68a;
  background: var(--amber-bg);
  color: var(--amber-text);
  font-size: 13px;
}
</style>
