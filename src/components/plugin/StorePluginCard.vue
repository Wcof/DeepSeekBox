<script setup lang="ts">
import { computed } from 'vue'
import type { MarketEntry } from '../../types/plugin'
import { MARKET_LABEL_TEXT } from '../../types/plugin'
import { pluginCenter } from '../../stores/pluginCenter'
import AppIcon from '../icons/AppIcon.vue'
import PluginTile from './PluginTile.vue'

const props = defineProps<{ entry: MarketEntry }>()

const { state, installEntry, openDetail, openBranches } = pluginCenter

const installing = computed(() => state.busy[`install:${props.entry.name}`] === true)

/** 只有能定位到 GitHub 仓库的条目才谈得上按分支安装 */
const canPickBranch = computed(() =>
  /github\.com\//i.test(props.entry.repository ?? props.entry.homepage ?? ''),
)

const preferredVersion = computed(
  () =>
    props.entry.versions.find((version) => version.version === props.entry.defaultVersion) ??
    props.entry.versions[0],
)

/**
 * 不兼容只针对「当前推荐的这个版本」：标注跟着收录版本走，
 * 上游发布兼容的新版本、索引换成新版后，这里自然就不再显示。
 */
const incompatible = computed(() => preferredVersion.value?.compatible === false)

/** 宿主给出的未满足要求，键为 engines.dsh 或 DSH peer 包名 */
const requiredRange = computed(() => preferredVersion.value?.requirements?.['engines.dsh'])

/** 文案里带上具体版本号：说的是这一版装不上，不是整个插件被拉黑 */
const incompatibilityLead = computed(() => {
  const version = preferredVersion.value?.version
  return `${version ? `v${version} ` : '这一版'}与当前 DSH 版本不兼容`
})

const incompatibilityText = computed(() =>
  requiredRange.value
    ? `${incompatibilityLead.value}（要求 DSH ${requiredRange.value}）`
    : incompatibilityLead.value,
)

const installedVersion = computed(() => props.entry.installation.installedVersion)

const status = computed<{ text: string; class: string }>(() => {
  const installation = props.entry.installation.status
  // 推荐版本装不上时，状态栏不能再写「可安装 / 可更新」
  if (
    incompatible.value &&
    (installation === 'not-installed' || installation === 'update-available')
  ) {
    return {
      text: installation === 'update-available' ? '更新受阻' : '不可安装',
      class: 'status--warn',
    }
  }
  switch (installation) {
    case 'update-available':
      return { text: '可更新', class: 'status--warn' }
    case 'different-version':
      return { text: '已装其他版本', class: 'status--warn' }
    case 'installed':
      return { text: '已安装', class: 'status--running' }
    case 'provided':
      return { text: '随 DSH 提供', class: 'status--running' }
    default:
      return { text: '可安装', class: 'status--stopped' }
  }
})

const action = computed<'install' | 'update' | 'detail'>(() => {
  if (props.entry.installation.status === 'update-available') return 'update'
  if (props.entry.installation.status === 'not-installed') return 'install'
  return 'detail'
})

const repositoryLabel = computed(() => {
  const url = props.entry.repository
  if (!url) return ''
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
})
</script>

<template>
  <article class="plugin-card">
    <div class="plugin-card__header">
      <PluginTile :icon="entry.icon" />
      <div class="plugin-card__titles">
        <div class="plugin-card__titlerow">
          <span class="plugin-card__name">{{ entry.title }}</span>
          <span
            class="tag"
            :class="entry.label === 'official' ? 'tag--green' : 'tag--blue'"
          >
            {{ MARKET_LABEL_TEXT[entry.label] }}
          </span>
          <span v-if="incompatible" class="tag tag--amber">版本不符</span>
        </div>
        <div class="plugin-card__id">{{ entry.name }}</div>
      </div>
      <span class="status plugin-card__status" :class="status.class">
        <span class="status__dot" />
        {{ status.text }}
      </span>
    </div>

    <p class="plugin-card__desc">{{ entry.description || '该插件没有提供描述。' }}</p>

    <div class="plugin-card__facts">
      <div v-if="entry.author" class="plugin-card__fact">
        <span><AppIcon name="users" :size="14" /></span>
        <span>{{ entry.author }}</span>
      </div>
      <div v-if="repositoryLabel" class="plugin-card__fact">
        <span><AppIcon name="link" :size="14" /></span>
        <span class="mono">{{ repositoryLabel }}</span>
      </div>
      <div v-if="incompatible" class="plugin-card__fact plugin-card__fact--warn">
        <span><AppIcon name="alert-circle" :size="14" /></span>
        <span>{{ incompatibilityLead }}<template v-if="requiredRange">（要求 DSH <span class="mono">{{ requiredRange }}</span>）</template></span>
      </div>
    </div>

    <div class="plugin-card__divider">
      <div class="plugin-card__foot">
        <span class="plugin-card__version mono">
          v{{ entry.defaultVersion ?? preferredVersion?.version ?? '未知' }}
        </span>
        <template v-if="installedVersion">
          <span class="plugin-card__dot">·</span>
          <span class="plugin-card__rows">已装 v{{ installedVersion }}</span>
        </template>

        <span class="plugin-card__actions">
          <button
            v-if="canPickBranch"
            type="button"
            class="btn btn--secondary btn--sm"
            title="挑一个分支安装（上游没发版时的活口）"
            @click="openBranches(entry)"
          >
            分支
          </button>
          <button
            v-if="action === 'detail'"
            type="button"
            class="btn btn--secondary btn--sm"
            @click="openDetail(entry.name)"
          >
            <AppIcon name="sliders" :size="15" />
            详情
          </button>
          <button
            v-else
            type="button"
            class="btn btn--primary btn--sm"
            :disabled="installing || incompatible"
            :title="incompatible ? incompatibilityText : undefined"
            @click="installEntry(entry)"
          >
            <span v-if="installing" class="spinner" />
            <AppIcon v-else :name="action === 'update' ? 'refresh' : 'download'" :size="15" />
            {{ action === 'update' ? '更新' : '安装' }}
          </button>
        </span>
      </div>
    </div>
  </article>
</template>
