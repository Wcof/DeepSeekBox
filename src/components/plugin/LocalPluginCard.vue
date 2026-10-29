<script setup lang="ts">
import { computed } from 'vue'
import type { InstalledPlugin } from '../../types/plugin'
import { authorLabel } from '../../types/plugin'
import { pluginCenter } from '../../stores/pluginCenter'
import AppIcon from '../icons/AppIcon.vue'
import { pluginIconName } from '../icons/pluginIcon'

const props = defineProps<{ plugin: InstalledPlugin }>()

const { state, updateOne, setEnabled, removeById, openConfig, gotoStore } = pluginCenter

const missing = computed(() => props.plugin.status === 'missing-file')
const running = computed(() => props.plugin.status === 'running')
const updatable = computed(() => pluginCenter.isUpdatable(props.plugin))

const busyKey = (key: string) => state.busy[key] === true

const updating = computed(() => busyKey(`update:${props.plugin.id}`))
const toggling = computed(() => busyKey(`toggle:${props.plugin.id}`))
const removing = computed(() => busyKey(`remove:${props.plugin.id}`))
/** 一键更新进行中时锁定单个更新，避免并发写 */
const updateLocked = computed(() => updating.value || state.updatingAll)

const statusTag = computed<{ text: string; class: string }>(() => {
  if (missing.value) return { text: '未找到插件文件', class: 'tag--amber' }
  if (running.value) return { text: '运行中', class: 'tag--green' }
  return { text: '已停用', class: 'tag--gray' }
})

function onToggle(): void {
  void setEnabled(props.plugin.id, !running.value)
}
</script>

<template>
  <article class="plugin-card">
    <div class="plugin-card__header">
      <div class="plugin-card__tile">
        <AppIcon :name="pluginIconName(plugin.icon)" :size="26" />
      </div>
      <div class="plugin-card__titles">
        <div class="plugin-card__name">{{ plugin.name }}</div>
        <div class="plugin-card__subtitle">
          {{ plugin.alias }} · <span class="mono">{{ plugin.id }}</span>
        </div>
      </div>
      <div class="plugin-card__tags">
        <span v-if="updatable" class="tag tag--amber">可更新 v{{ plugin.latestVersion }}</span>
        <span class="tag" :class="statusTag.class">{{ statusTag.text }}</span>
      </div>
    </div>

    <p class="plugin-card__desc">{{ plugin.description }}</p>

    <template v-if="!missing">
      <div class="plugin-card__meta">
        <template v-if="updatable">
          v{{ plugin.installedVersion }} → {{ plugin.latestVersion }} ·
          {{ authorLabel(plugin.author, plugin.authorName) }}
        </template>
        <template v-else>
          v{{ plugin.installedVersion }} · {{ authorLabel(plugin.author, plugin.authorName) }}
        </template>
      </div>
      <div v-if="plugin.filePath" class="plugin-card__meta-line">
        <span class="mono">{{ plugin.filePath }}</span>
      </div>
      <a
        v-if="plugin.repoUrl"
        class="btn btn--secondary btn--sm plugin-card__repo"
        :href="plugin.repoUrl"
        target="_blank"
        rel="noopener"
      >
        <AppIcon name="external-link" :size="16" />
        {{ plugin.repoLabel ?? plugin.name }}
      </a>
    </template>

    <div class="plugin-card__divider">
      <div class="plugin-card__actions plugin-card__actions--spread">
        <div class="plugin-card__actions-group">
          <template v-if="missing">
            <button type="button" class="btn btn--secondary btn--sm" @click="gotoStore()">
              <AppIcon name="download" :size="16" />
              前往商店下载
            </button>
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              @click="openConfig(plugin.id)"
            >
              <AppIcon name="sliders" :size="16" />
              配置
            </button>
          </template>
          <template v-else>
            <button
              v-if="updatable"
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="updateLocked"
              @click="updateOne(plugin.id)"
            >
              <span v-if="updating" class="spinner" />
              <AppIcon v-else name="download" :size="16" />
              更新
            </button>
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              :disabled="toggling"
              @click="onToggle"
            >
              <span v-if="toggling" class="spinner" />
              {{ running ? '停用' : '启用' }}
            </button>
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              @click="openConfig(plugin.id)"
            >
              <AppIcon name="sliders" :size="16" />
              配置
            </button>
          </template>
        </div>
        <button
          type="button"
          class="btn btn--danger-ghost btn--sm btn--icon"
          :disabled="removing"
          :aria-label="`删除 ${plugin.name}`"
          @click="removeById(plugin.id)"
        >
          <span v-if="removing" class="spinner" />
          <AppIcon v-else name="trash" :size="17" />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.plugin-card__tags {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
</style>
