<script setup lang="ts">
import { computed } from 'vue'
import type { StorePlugin } from '../../types/plugin'
import { authorLabel } from '../../types/plugin'
import { pluginCenter } from '../../stores/pluginCenter'
import AppIcon from '../icons/AppIcon.vue'
import { pluginIconName } from '../icons/pluginIcon'

const props = defineProps<{ entry: StorePlugin }>()

const { state, installFromStore, setEnabled, removeById } = pluginCenter

const status = computed(() => pluginCenter.installedStatusOf(props.entry.id))
const installed = computed(() => status.value !== null)
const running = computed(() => status.value === 'running')

const sourceTag = computed(() =>
  props.entry.source === 'official'
    ? { text: '官方收录', class: 'tag--green' }
    : { text: '第三方', class: 'tag--blue' },
)

const busyKey = (key: string) => state.busy[key] === true

const installing = computed(() => busyKey(`install:${props.entry.id}`))
const toggling = computed(() => busyKey(`toggle:${props.entry.id}`))
const removing = computed(() => busyKey(`remove:${props.entry.id}`))
/** 该插件正在本地执行启停/删除/更新时，避免商场与本地并发写同一状态 */
const locked = computed(
  () => toggling.value || removing.value || state.updatingAll || busyKey(`update:${props.entry.id}`),
)

function onToggle(): void {
  void setEnabled(props.entry.id, !running.value)
}
</script>

<template>
  <article class="plugin-card">
    <div class="plugin-card__header">
      <div class="plugin-card__tile">
        <AppIcon :name="pluginIconName(entry.icon)" :size="26" />
      </div>
      <div class="plugin-card__titles">
        <div class="plugin-card__name">{{ entry.name }}</div>
        <div class="plugin-card__subtitle">
          {{ entry.alias }} · <span class="mono">{{ entry.id }}</span>
        </div>
      </div>
      <span class="tag plugin-card__tag" :class="sourceTag.class">{{ sourceTag.text }}</span>
    </div>

    <p class="plugin-card__desc">{{ entry.description }}</p>

    <div class="plugin-card__meta">v{{ entry.version }} · {{ entry.license }}</div>
    <div class="plugin-card__meta-line">商店来源: {{ sourceTag.text }}</div>
    <div class="plugin-card__meta-line">
      开发作者: {{ authorLabel(entry.author, entry.authorName, true) }}
    </div>
    <div class="plugin-card__meta-line">
      代码仓库: <span class="mono">github.com/{{ entry.repo }}</span>
    </div>

    <div class="plugin-card__divider">
      <div class="plugin-card__actions plugin-card__actions--end">
        <template v-if="installed">
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            :disabled="locked"
            @click="onToggle"
          >
            <span v-if="toggling" class="spinner" />
            {{ running ? '停用' : '启用' }}
          </button>
          <button
            type="button"
            class="btn btn--danger-ghost btn--sm"
            :disabled="locked"
            @click="removeById(entry.id)"
          >
            <span v-if="removing" class="spinner" />
            <AppIcon v-else name="trash" :size="16" />
            删除
          </button>
        </template>
        <button
          v-else
          type="button"
          class="btn btn--primary btn--sm"
          :disabled="installing"
          @click="installFromStore(entry.id)"
        >
          <span v-if="installing" class="spinner" />
          <AppIcon v-else name="download" :size="16" />
          下载
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.plugin-card__actions--end {
  justify-content: flex-end;
}
</style>
