<script setup lang="ts">
import { computed } from 'vue'
import type { InstalledBundle } from '../../types/plugin'
import { pluginCenter } from '../../stores/pluginCenter'
import AppIcon from '../icons/AppIcon.vue'
import PluginTile from './PluginTile.vue'

const props = defineProps<{ bundle: InstalledBundle }>()

const { state, updateOne, setEnabled, removeByName, openDetail, gotoStore } = pluginCenter

const missing = computed(() => props.bundle.availability === 'missing')
const running = computed(() => props.bundle.enabled)
const updatable = computed(() => pluginCenter.isUpdatable(props.bundle))
const locked = computed(
  () => props.bundle.readOnlyReason !== undefined || !props.bundle.installed,
)

const busyKey = (key: string) => state.busy[key] === true
const updating = computed(() => busyKey(`update:${props.bundle.name}`))
const toggling = computed(() => busyKey(`toggle:${props.bundle.name}`))
const removing = computed(() => busyKey(`remove:${props.bundle.name}`))
const updateLocked = computed(() => updating.value || state.updatingAll)

const statusTag = computed<{ text: string; class: string }>(() => {
  if (missing.value) return { text: '包不可用', class: 'tag--amber' }
  if (running.value) return { text: '运行中', class: 'tag--green' }
  return { text: '已停用', class: 'tag--gray' }
})

const rowSummary = computed(() => {
  const total = props.bundle.rows.length
  if (total === 0) return '无可读插件行'
  const active = props.bundle.rows.filter((row) => row.enabled).length
  return `${active}/${total} 个插件行启用`
})

function onToggle(): void {
  void setEnabled(props.bundle.name, !running.value)
}
</script>

<template>
  <article class="plugin-card">
    <div class="plugin-card__header">
      <PluginTile :icon="bundle.icon" />
      <div class="plugin-card__titles">
        <div class="plugin-card__name">{{ bundle.title }}</div>
        <div class="plugin-card__subtitle">
          <span class="mono">{{ bundle.name }}</span>
        </div>
      </div>
      <div class="plugin-card__tags">
        <span v-if="updatable" class="tag tag--amber">可更新 v{{ bundle.latestVersion }}</span>
        <span v-if="bundle.official && bundle.optional" class="tag tag--blue">随附</span>
        <span class="tag" :class="statusTag.class">{{ statusTag.text }}</span>
      </div>
    </div>

    <p class="plugin-card__desc">{{ bundle.description || '该组合包没有提供描述。' }}</p>

    <div class="plugin-card__meta">
      <template v-if="updatable">
        v{{ bundle.version ?? '未知' }} → {{ bundle.latestVersion }}
      </template>
      <template v-else>v{{ bundle.version ?? '未知' }} · {{ rowSummary }}</template>
    </div>
    <div v-if="bundle.source" class="plugin-card__meta-line">
      来源: <span class="mono">{{ bundle.source }}</span>
    </div>
    <div v-if="bundle.error" class="plugin-card__meta-line plugin-card__meta-line--warn">
      加载失败: {{ bundle.error.code }}
    </div>

    <div class="plugin-card__divider">
      <div class="plugin-card__actions plugin-card__actions--spread">
        <div class="plugin-card__actions-group">
          <template v-if="missing">
            <button type="button" class="btn btn--secondary btn--sm" @click="gotoStore()">
              <AppIcon name="download" :size="16" />
              去商场重装
            </button>
          </template>
          <template v-else>
            <button
              v-if="updatable"
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="updateLocked"
              @click="updateOne(bundle.name)"
            >
              <span v-if="updating" class="spinner" />
              <AppIcon v-else name="download" :size="16" />
              更新
            </button>
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              :disabled="toggling || bundle.readOnlyReason !== undefined"
              :title="bundle.readOnlyReason ? '这个包是插件管理所需，不能停用' : undefined"
              @click="onToggle"
            >
              <span v-if="toggling" class="spinner" />
              {{ running ? '停用' : '启用' }}
            </button>
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              @click="openDetail(bundle.name)"
            >
              <AppIcon name="sliders" :size="16" />
              详情
            </button>
          </template>
        </div>
        <button
          v-if="bundle.removable && !bundle.readOnlyReason"
          type="button"
          class="btn btn--danger-ghost btn--sm btn--icon"
          :disabled="removing || locked"
          :aria-label="`卸载 ${bundle.title}`"
          @click="removeByName(bundle.name)"
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

.plugin-card__meta-line--warn {
  color: var(--amber-text);
}
</style>
