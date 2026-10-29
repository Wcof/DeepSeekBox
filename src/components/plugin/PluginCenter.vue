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
  pickLocalFile,
  openDevGuide,
  loadLocal,
  loadStore,
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

const localEmpty = () =>
  state.localStatus === 'ready' && state.localPlugins.length === 0 && !state.localQuery.trim()

const storeEmpty = () =>
  state.storeStatus === 'ready' && state.catalog.length === 0 && !state.storeQuery.trim()
</script>

<template>
  <div class="page">
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
            placeholder="搜索名称、作者或插件 ID"
            aria-label="搜索本地插件"
          />
          <input
            v-else
            v-model="state.storeQuery"
            type="search"
            class="toolbar__input"
            placeholder="搜索名称、别名或作者"
            aria-label="搜索商场插件"
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
          :disabled="listLoading(state.activeTab) || state.busy.installLocal"
          @click="pickLocalFile()"
        >
          <span v-if="state.busy.installLocal" class="spinner" />
          <AppIcon v-else name="download" :size="17" />
          本地安装
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
        <span class="state-box__title">本地插件加载失败</span>
        <span class="state-box__hint">请检查插件目录权限后重试</span>
        <button type="button" class="btn btn--secondary state-box__action" @click="loadLocal()">
          重试
        </button>
      </div>

      <div v-else-if="localEmpty()" class="state-box">
        <span class="state-box__icon"><AppIcon name="inbox" :size="40" /></span>
        <span class="state-box__title">尚未安装任何插件</span>
        <span class="state-box__hint">前往插件商场浏览并安装所需插件</span>
        <button type="button" class="btn btn--primary state-box__action" @click="gotoStore()">
          前往商场下载
        </button>
      </div>

      <div v-else-if="filteredLocal.length === 0" class="state-box">
        <span class="state-box__icon"><AppIcon name="search" :size="40" /></span>
        <span class="state-box__title">未找到匹配的插件</span>
        <span class="state-box__hint">试试其他名称、作者或插件 ID 关键词</span>
      </div>

      <div v-else class="card-grid">
        <LocalPluginCard v-for="plugin in filteredLocal" :key="plugin.id" :plugin="plugin" />
      </div>
    </template>

    <!-- 插件商场列表 -->
    <template v-else>
      <div v-if="listLoading('store')" class="state-box">
        <span class="state-box__title is-loading-text">读取中…</span>
      </div>

      <div v-else-if="listError('store')" class="state-box">
        <span class="state-box__icon"><AppIcon name="alert-circle" :size="40" /></span>
        <span class="state-box__title">插件商场加载失败</span>
        <span class="state-box__hint">请检查网络连接后重试</span>
        <button type="button" class="btn btn--secondary state-box__action" @click="loadStore()">
          重试
        </button>
      </div>

      <div v-else-if="storeEmpty()" class="state-box">
        <span class="state-box__icon"><AppIcon name="inbox" :size="40" /></span>
        <span class="state-box__title">商店暂无可用插件</span>
        <span class="state-box__hint">稍后再来看看，或通过本地安装导入插件</span>
      </div>

      <div v-else-if="storeGroups.length === 0" class="state-box">
        <span class="state-box__icon"><AppIcon name="search" :size="40" /></span>
        <span class="state-box__title">未找到匹配的插件</span>
        <span class="state-box__hint">试试其他关键词，或切换筛选条件</span>
      </div>

      <template v-else>
        <section v-for="group in storeGroups" :key="group.creator.id" class="store-group">
          <header class="store-group__header">
            <span class="store-group__name">{{ group.creator.name }}</span>
            <span class="store-group__id">{{ group.creator.id }}</span>
            <a
              v-if="group.creator.homepage"
              class="store-group__link"
              :href="group.creator.homepage"
              target="_blank"
              rel="noopener"
              :aria-label="`查看 ${group.creator.name} 的主页`"
            >
              <AppIcon name="external-link" :size="14" />
            </a>
          </header>
          <div class="card-grid">
            <StorePluginCard v-for="entry in group.plugins" :key="entry.id" :entry="entry" />
          </div>
        </section>
      </template>
    </template>
  </div>
</template>
