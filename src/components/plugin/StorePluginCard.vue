<script setup lang="ts">
import { computed } from 'vue'
import type { MarketEntry } from '../../types/plugin'
import { pluginCenter } from '../../stores/pluginCenter'
import AppIcon from '../icons/AppIcon.vue'
import PluginTile from './PluginTile.vue'

const props = defineProps<{ entry: MarketEntry }>()

const { state, installEntry, openDetail } = pluginCenter

const installing = computed(() => state.busy[`install:${props.entry.name}`] === true)

const preferredVersion = computed(
  () =>
    props.entry.versions.find((version) => version.version === props.entry.defaultVersion) ??
    props.entry.versions[0],
)

const incompatible = computed(() => preferredVersion.value?.compatible === false)

const labelTag = computed(() =>
  props.entry.label === 'official'
    ? { text: '官方收录', class: 'tag--green' }
    : { text: '第三方', class: 'tag--blue' },
)

const statusTag = computed<{ text: string; class: string } | null>(() => {
  const status = props.entry.installation.status
  if (status === 'installed') return { text: '已安装', class: 'tag--gray' }
  if (status === 'update-available') return { text: '可更新', class: 'tag--amber' }
  if (status === 'different-version') return { text: '已装其他版本', class: 'tag--amber' }
  if (status === 'provided') return { text: '随 DSH 提供', class: 'tag--blue' }
  return null
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
        <div class="plugin-card__name">{{ entry.title }}</div>
        <div class="plugin-card__subtitle">
          <span class="mono">{{ entry.name }}</span>
        </div>
      </div>
      <div class="plugin-card__tags">
        <span v-if="statusTag" class="tag" :class="statusTag.class">{{ statusTag.text }}</span>
        <span class="tag" :class="labelTag.class">{{ labelTag.text }}</span>
      </div>
    </div>

    <p class="plugin-card__desc">{{ entry.description || '该插件没有提供描述。' }}</p>

    <div class="plugin-card__meta">
      v{{ entry.defaultVersion ?? preferredVersion?.version ?? '未知' }} ·
      {{ entry.indexTitle }}
    </div>
    <div v-if="entry.author" class="plugin-card__meta-line">开发作者: {{ entry.author }}</div>
    <div v-if="repositoryLabel" class="plugin-card__meta-line">
      代码仓库: <span class="mono">{{ repositoryLabel }}</span>
    </div>
    <div v-if="incompatible" class="plugin-card__meta-line plugin-card__meta-line--warn">
      与当前 DSH 版本不兼容
    </div>

    <div class="plugin-card__divider">
      <div class="plugin-card__actions plugin-card__actions--end">
        <button
          v-if="action === 'detail'"
          type="button"
          class="btn btn--secondary btn--sm"
          @click="openDetail(entry.name)"
        >
          <AppIcon name="sliders" :size="16" />
          详情
        </button>
        <button
          v-else
          type="button"
          class="btn btn--primary btn--sm"
          :disabled="installing || incompatible"
          @click="installEntry(entry)"
        >
          <span v-if="installing" class="spinner" />
          <AppIcon v-else :name="action === 'update' ? 'refresh' : 'download'" :size="16" />
          {{ action === 'update' ? '更新' : '安装' }}
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.plugin-card__actions--end {
  justify-content: flex-end;
}

.plugin-card__tags {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.plugin-card__meta-line--warn {
  color: var(--amber-text);
}
</style>
