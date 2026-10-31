<script setup lang="ts">
import { computed } from 'vue'
import { pluginCenter } from '../../stores/pluginCenter'
import { BUNDLE_ORIGIN_LABEL, BUNDLE_ORIGIN_TAG, bundleOrigin, HOST } from '../../types/plugin'
import AppIcon from '../icons/AppIcon.vue'
import PluginTile from './PluginTile.vue'
import type { PluginRow } from '../../types/plugin'

const { state, detailBundle, closeDetail, setEnabled, removeByName, setRowEnabled } = pluginCenter

const bundle = computed(() => detailBundle.value)

const origin = computed(() => (bundle.value ? bundleOrigin(bundle.value) : 'third-party'))

const status = computed<{ text: string; class: string }>(() => {
  const current = bundle.value
  if (!current) return { text: '', class: '' }
  if (current.availability === 'missing') return { text: '包不可用', class: 'status--warn' }
  if (current.enabled) return { text: '运行中', class: 'status--running' }
  return { text: '已停用', class: 'status--stopped' }
})

const availabilityText = computed(() => {
  switch (bundle.value?.availability) {
    case 'profile':
      return 'profile 依赖'
    case 'installation':
      return `随${HOST.displayName}安装附带`
    case 'missing':
      return '文件缺失'
    default:
      return '未知'
  }
})

const phaseText = (row: PluginRow): string => {
  switch (row.fiberPhase) {
    case 'active':
      return '已加载'
    case 'failed':
      return '加载失败'
    case 'loading':
      return '加载中'
    case 'unloading':
      return '卸载中'
    case 'pending':
      return '等待中'
    default:
      return '未运行'
  }
}

const phaseTag = (row: PluginRow): string => {
  if (row.fiberPhase === 'active') return 'tag--green'
  if (row.fiberPhase === 'failed') return 'tag--amber'
  return 'tag--gray'
}

const toggling = computed(
  () => bundle.value !== null && state.busy[`toggle:${bundle.value.name}`] === true,
)
const removing = computed(
  () => bundle.value !== null && state.busy[`remove:${bundle.value.name}`] === true,
)

function onToggle(): void {
  const current = bundle.value
  if (!current) return
  void setEnabled(current.name, !current.enabled)
}

function onRemove(): void {
  const current = bundle.value
  if (!current) return
  void removeByName(current.name)
}

function onToggleRow(row: PluginRow): void {
  if (!row.entryId || row.readOnlyReason) return
  void setRowEnabled(row.entryId, !row.enabled)
}
</script>

<template>
  <div v-if="bundle" class="page">
    <div class="config-top">
      <button type="button" class="btn btn--secondary" @click="closeDetail()">
        <AppIcon name="arrow-left" :size="16" />
        返回插件中心
      </button>
    </div>

    <header class="config-hero">
      <PluginTile :icon="bundle.icon" :muted="!bundle.enabled" />
      <div class="config-hero__titles">
        <div class="config-hero__titlerow">
          <span class="config-hero__name">{{ bundle.title }}</span>
          <span class="tag" :class="BUNDLE_ORIGIN_TAG[origin]">{{ BUNDLE_ORIGIN_LABEL[origin] }}</span>
          <span v-if="bundle.official && bundle.optional" class="tag tag--gray">随附</span>
        </div>
        <div class="plugin-card__id">{{ bundle.name }}</div>
      </div>
      <span class="status" :class="status.class">
        <span class="status__dot" />
        {{ status.text }}
      </span>
    </header>

    <div class="config-body">
      <section class="config-card">
        <h2 class="config-card__title">组合包信息</h2>
        <dl class="config-info">
          <div class="config-info__row">
            <dt>版本</dt>
            <dd class="mono">v{{ bundle.version ?? '未知' }}</dd>
          </div>
          <div class="config-info__row">
            <dt>包名</dt>
            <dd class="mono">{{ bundle.name }}</dd>
          </div>
          <div class="config-info__row">
            <dt>来源</dt>
            <dd>{{ BUNDLE_ORIGIN_LABEL[origin] }} · {{ availabilityText }}</dd>
          </div>
          <div v-if="bundle.source" class="config-info__row">
            <dt>安装方式</dt>
            <dd class="mono">{{ bundle.source }}</dd>
          </div>
          <div class="config-info__row">
            <dt>可卸载</dt>
            <dd>
              {{ bundle.removable && !bundle.readOnlyReason ? '是' : `否（随${HOST.displayName}提供或插件管理所需）` }}
            </dd>
          </div>
        </dl>

        <p v-if="bundle.error" class="config-card__notice">
          加载失败：{{ bundle.error.code }}
          <span v-if="bundle.error.diagnostic">· {{ bundle.error.diagnostic }}</span>
        </p>

        <div class="config-card__actions">
          <button
            type="button"
            class="btn btn--secondary"
            :disabled="toggling || bundle.readOnlyReason !== undefined"
            @click="onToggle"
          >
            <span v-if="toggling" class="spinner" />
            {{ bundle.enabled ? '停用组合包' : '启用组合包' }}
          </button>
          <button
            v-if="bundle.removable && !bundle.readOnlyReason"
            type="button"
            class="btn btn--danger-ghost"
            :disabled="removing"
            @click="onRemove"
          >
            <span v-if="removing" class="spinner" />
            卸载
          </button>
        </div>
      </section>

      <section class="config-card">
        <h2 class="config-card__title">
          插件行
          <span class="config-card__count">{{ bundle.rows.length }}</span>
        </h2>

        <p v-if="bundle.rows.length === 0" class="config-card__empty">这个组合包没有可读的插件行。</p>

        <ul v-else class="row-list">
          <li v-for="row in bundle.rows" :key="row.rowId" class="row-item">
            <div class="row-item__main">
              <div class="row-item__title">{{ row.title }}</div>
              <div class="row-item__module mono">{{ row.moduleName }}</div>
              <div v-if="row.description" class="row-item__desc">{{ row.description }}</div>
            </div>
            <span class="tag row-item__phase" :class="phaseTag(row)">{{ phaseText(row) }}</span>
            <button
              type="button"
              class="switch"
              role="switch"
              :aria-checked="row.enabled"
              :class="{ 'switch--on': row.enabled }"
              :disabled="!row.entryId || row.readOnlyReason !== undefined"
              :title="row.readOnlyReason ? '这一行不能单独停用' : undefined"
              @click="onToggleRow(row)"
            >
              <span class="switch__thumb" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.config-top {
  margin-bottom: 20px;
}

.config-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}

.config-hero__titles {
  flex: 1;
  min-width: 0;
}

.config-hero__titlerow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.config-hero__name {
  font-size: 20px;
  font-weight: 700;
}

.config-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 880px;
}

.config-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 22px 24px;
  box-shadow: var(--shadow-card);
}

.config-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 15.5px;
  font-weight: 700;
}

.config-card__count {
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--color-surface-hover);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.config-card__empty {
  margin: 0;
  color: var(--color-text-secondary);
}

.config-card__notice {
  margin: 16px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--amber-bg);
  color: var(--amber-text);
  font-size: 13.5px;
}

.config-info {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-info__row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 16px;
  align-items: baseline;
}

.config-info__row dt {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.config-info__row dd {
  margin: 0;
  font-size: 14.5px;
  overflow-wrap: anywhere;
}

.config-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.row-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.row-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-top: 1px solid var(--color-border-light);
}

.row-item:first-child {
  border-top: 0;
  padding-top: 0;
}

.row-item__main {
  flex: 1;
  min-width: 0;
}

.row-item__title {
  font-size: 14.5px;
  font-weight: 600;
}

.row-item__module {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.row-item__desc {
  margin-top: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.row-item__phase {
  flex: none;
}

.switch {
  width: 44px;
  height: 26px;
  border-radius: 13px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-hover);
  position: relative;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.15s, border-color 0.15s;
}

.switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.switch--on {
  background: var(--green-text);
  border-color: var(--green-text);
}

.switch__thumb {
  position: absolute;
  top: 50%;
  left: 3px;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: left 0.15s;
}

.switch--on .switch__thumb {
  left: 21px;
}
</style>
