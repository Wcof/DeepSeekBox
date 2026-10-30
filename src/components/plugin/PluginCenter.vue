<script setup lang="ts">
import { pluginCenter } from '../../stores/pluginCenter'
import AppIcon from '../icons/AppIcon.vue'
import LocalPluginCard from './LocalPluginCard.vue'
import StorePluginCard from './StorePluginCard.vue'
import FilterSelect from '../ui/FilterSelect.vue'

const {
  state,
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
} = pluginCenter

const STORE_FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'available', label: '可安装' },
  { value: 'installed', label: '已安装' },
]

/** 索引源 URL：同源 /index.json，供「发现」页订阅 */
function openIndexSource(): void {
  window.open('/index.json', '_blank', 'noopener')
}

const listLoading = (tab: 'local' | 'store') =>
  tab === 'local' ? state.localStatus === 'loading' : state.storeStatus === 'loading'

const listError = (tab: 'local' | 'store') =>
  tab === 'local' ? state.localStatus === 'error' : state.storeStatus === 'error'

const hostOffline = () => state.hostOnline === false

const localEmpty = () =>
  state.localStatus === 'ready' && filteredLocal.value.length === 0 && !state.localQuery.trim()

const storeEmpty = () => state.storeStatus === 'ready' && state.market.length === 0

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

    <div class="page__tabs-row">
      <div class="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="tabs__tab"
          :class="{ 'tabs__tab--active': state.activeTab === 'local' }"
          :aria-selected="state.activeTab === 'local'"
          @click="switchTab('local')"
        >
          本地插件
        </button>
        <button
          type="button"
          role="tab"
          class="tabs__tab"
          :class="{ 'tabs__tab--active': state.activeTab === 'store' }"
          :aria-selected="state.activeTab === 'store'"
          @click="switchTab('store')"
        >
          插件商场
        </button>
      </div>
    </div>

    <div class="page__toolbar-row">
      <div class="toolbar">
        <div class="toolbar__search">
          <span class="toolbar__search-icon"><AppIcon name="search" :size="17" /></span>
          <input
            v-if="state.activeTab === 'local'"
            v-model="state.localQuery"
            type="search"
            class="toolbar__input"
            placeholder="搜索包名或插件行"
            aria-label="搜索本地插件"
          />
          <input
            v-else
            v-model="state.storeQuery"
            type="search"
            class="toolbar__input"
            placeholder="搜索名称、作者或关键词"
            aria-label="搜索商场插件"
            @input="scheduleStoreSearch()"
          />
        </div>

        <FilterSelect
          v-if="state.activeTab === 'store'"
          v-model="state.storeFilter"
          :options="STORE_FILTER_OPTIONS"
        />

        <button
          type="button"
          class="btn btn--secondary"
          :disabled="state.checkingUpdates || listLoading(state.activeTab)"
          @click="checkUpdates()"
        >
          <span v-if="state.checkingUpdates" class="spinner" />
          <AppIcon v-else name="refresh" :size="17" />
          检查更新
        </button>

        <button
          v-if="state.activeTab === 'local'"
          type="button"
          class="btn"
          :class="updateCount > 0 ? 'btn--primary' : 'btn--secondary'"
          :disabled="updateCount === 0 || state.updatingAll"
          @click="updateAll()"
        >
          <span v-if="state.updatingAll" class="spinner" />
          <AppIcon v-else name="download" :size="17" />
          一键更新 ({{ updateCount }})
        </button>

        <button
          type="button"
          class="btn btn--secondary"
          :disabled="state.busy.installSpec"
          @click="openInstallDialog()"
        >
          <AppIcon name="download" :size="17" />
          安装
        </button>

        <button type="button" class="btn btn--secondary" @click="openDevGuide()">
          <AppIcon name="external-link" :size="17" />
          {{ state.activeTab === 'local' ? '开发指南' : '开发资料' }}
        </button>

        <button
          v-if="state.activeTab === 'store'"
          type="button"
          class="btn btn--secondary"
          @click="openIndexSource()"
        >
          <AppIcon name="external-link" :size="17" />
          索引源
        </button>

        <button
          type="button"
          class="btn btn--secondary"
          :disabled="listLoading(state.activeTab)"
          @click="state.activeTab === 'local' ? loadLocal() : loadStore()"
        >
          <span v-if="listLoading(state.activeTab)" class="spinner" />
          <AppIcon v-else name="refresh" :size="17" />
          刷新
        </button>
      </div>
    </div>

    <!-- 本地插件列表 -->
    <template v-if="state.activeTab === 'local'">
      <div v-if="listLoading('local')" class="state-box">
        <span class="state-box__title is-loading-text">读取中…</span>
      </div>

      <div v-else-if="listError('local')" class="state-box">
        <span class="state-box__icon"><AppIcon name="alert-circle" :size="40" /></span>
        <span class="state-box__title">{{ hostOffline() ? '没连上 DSH 宿主' : '本地插件加载失败' }}</span>
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

      <div v-else-if="localEmpty()" class="state-box">
        <span class="state-box__icon"><AppIcon name="inbox" :size="40" /></span>
        <span class="state-box__title">当前 profile 没有装第三方插件</span>
        <span class="state-box__hint">去插件商场挑一个，或用「安装」直接填包名</span>
        <button type="button" class="btn btn--primary state-box__action" @click="gotoStore()">
          前往商场
        </button>
      </div>

      <div v-else-if="filteredLocal.length === 0" class="state-box">
        <span class="state-box__icon"><AppIcon name="search" :size="40" /></span>
        <span class="state-box__title">未找到匹配的插件</span>
        <span class="state-box__hint">试试包名片段或某个插件行的名字</span>
      </div>

      <div v-else class="card-grid">
        <LocalPluginCard v-for="bundle in filteredLocal" :key="bundle.name" :bundle="bundle" />
      </div>
    </template>

    <!-- 插件商场列表 -->
    <template v-else>
      <div v-if="listLoading('store')" class="state-box">
        <span class="state-box__title is-loading-text">读取中…</span>
      </div>

      <div v-else-if="listError('store') || hostOffline()" class="state-box">
        <span class="state-box__icon"><AppIcon name="alert-circle" :size="40" /></span>
        <span class="state-box__title">{{ hostOffline() ? '没连上 DSH 宿主' : '插件商场加载失败' }}</span>
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

      <div v-else-if="storeEmpty()" class="state-box">
        <span class="state-box__icon"><AppIcon name="inbox" :size="40" /></span>
        <span class="state-box__title">索引里没有匹配的插件</span>
        <span class="state-box__hint">试试其他关键词，或清空搜索与筛选条件</span>
      </div>

      <template v-else>
        <div v-if="indexErrorList().length" class="index-errors">
          <div v-for="[url, message] in indexErrorList()" :key="url" class="index-errors__item">
            <AppIcon name="alert-circle" :size="16" />
            <span><span class="mono">{{ hostOf(url) }}</span> 读取失败：{{ message }}</span>
          </div>
        </div>

        <section v-for="group in storeGroups" :key="group.url" class="store-group">
          <header class="store-group__header">
            <span class="store-group__name">{{ group.title }}</span>
            <span class="store-group__id">{{ hostOf(group.url) }}</span>
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
  font-size: 13.5px;
}

.update-notice__text strong {
  font-size: 14.5px;
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
  background: var(--amber-bg);
  color: var(--amber-text);
  font-size: 13.5px;
}
</style>
