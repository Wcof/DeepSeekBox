<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { pluginCenter } from '../../stores/pluginCenter'
import type { RepoBranch } from '../../types/plugin'

const { state, closeBranches, loadBranches, installBranch, branchBusy } = pluginCenter

const query = ref('')

const branches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q === '') return state.branches
  return state.branches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(q) || (branch.version ?? '').toLowerCase().includes(q),
  )
})

/** 已装来源里带 #分支名 就认为装的是这个分支 */
const installedSource = computed(() => {
  const name = state.branchEntry?.name
  if (name === undefined) return ''
  return state.bundles.find((bundle) => bundle.name === name)?.source ?? ''
})

const isInstalled = (branch: RepoBranch): boolean =>
  installedSource.value.includes(`#${branch.name}`)

const installing = (branch: RepoBranch): boolean =>
  state.busy[`branch-install:${state.branchRepo}#${branch.name}`] === true

const anyInstalling = computed(() => branchBusy())

/** 已装版本存在时，换分支必须先卸载，入口处先说清楚 */
const installedVersion = computed(() => state.branchEntry?.installation.installedVersion ?? null)

const shortCommit = (branch: RepoBranch): string =>
  branch.commit ? branch.commit.slice(0, 8) : '提交未知'

function close(): void {
  closeBranches()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && state.branchOpen) close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="state.branchOpen" class="dialog-overlay" @click.self="close">
    <div class="dialog dialog--branch" role="dialog" aria-modal="true" aria-label="按分支安装">
      <h2 class="dialog__title">按分支安装</h2>
      <p class="dialog__message">
        {{ state.branchEntry?.title }} · <span class="mono">{{ state.branchRepo }}</span>
        <br />
        装的是该分支当前的头提交，上游后续推送会改变它；这类分支通常还没发版，属于未验收代码。
      </p>

      <p v-if="installedVersion" class="branch-hint">
        当前已装 v{{ installedVersion }}；要换成别的分支，先在「插件管理」里卸载这个包。
      </p>

      <div class="branch-toolbar">
        <input
          v-model="query"
          class="dialog__input branch-search"
          type="search"
          placeholder="筛选分支"
          spellcheck="false"
        />
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          :disabled="state.branchStatus === 'loading' || anyInstalling"
          @click="loadBranches()"
        >
          刷新
        </button>
      </div>

      <p v-if="state.branchStatus === 'loading'" class="branch-hint">正在读取分支…</p>
      <p v-else-if="state.branchStatus === 'error'" class="branch-hint branch-hint--error">
        {{ state.branchError }}
      </p>
      <p v-else-if="branches.length === 0" class="branch-hint">没有匹配的分支。</p>

      <ul v-else class="branch-list">
        <li v-for="branch in branches" :key="branch.name" class="branch-item">
          <div class="branch-item__main">
            <div class="branch-item__name mono">{{ branch.name }}</div>
            <div class="branch-item__meta">
              <span v-if="branch.version" class="mono">v{{ branch.version }}</span>
              <span v-else class="branch-item__muted">没有 package.json</span>
              <span v-if="branch.enginesDsh" class="branch-chip">
                要求 DSH <span class="mono">{{ branch.enginesDsh }}</span>
              </span>
              <span v-else class="branch-chip branch-chip--muted">未声明 DSH 版本</span>
              <span v-if="!branch.bundle" class="branch-chip branch-chip--warn">未声明组合包</span>
              <span v-if="isInstalled(branch)" class="branch-chip branch-chip--ok">当前已装</span>
            </div>
            <div class="branch-item__commit mono">{{ shortCommit(branch) }}</div>
          </div>
          <button
            type="button"
            class="btn btn--primary btn--sm"
            :disabled="!branch.bundle || installing(branch) || anyInstalling"
            :title="branch.bundle ? undefined : '这个分支的 package.json 没有声明 dsh.bundle，装进去不能按插件管理'"
            @click="installBranch(branch)"
          >
            <span v-if="installing(branch)" class="spinner" />
            {{ isInstalled(branch) ? '重装' : '安装' }}
          </button>
        </li>
      </ul>

      <div class="dialog__actions">
        <button type="button" class="btn btn--secondary" :disabled="anyInstalling" @click="close">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog--branch {
  width: 660px;
  display: flex;
  flex-direction: column;
  max-height: min(640px, calc(100vh - 64px));
  overflow: hidden;
}

.branch-toolbar {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.branch-search {
  flex: 1;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--color-text);
  background: #ffffff;
  outline: none;
}

.branch-search:focus {
  border-color: var(--color-border-strong);
}

.branch-hint {
  margin: 14px 0 0;
  font-size: 13.5px;
  color: var(--color-text-secondary);
}

.branch-hint--error {
  color: var(--amber-text);
}

.branch-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.branch-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--color-border-light);
}

.branch-item:first-child {
  border-top: 0;
}

.branch-item__main {
  flex: 1;
  min-width: 0;
}

.branch-item__name {
  font-size: 13.5px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.branch-item__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.branch-item__muted {
  color: var(--color-text-muted);
}

.branch-item__commit {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.branch-chip {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--color-surface-hover);
  color: var(--color-text-secondary);
  font-size: 11.5px;
  white-space: nowrap;
}

.branch-chip--muted {
  opacity: 0.75;
}

.branch-chip--warn {
  background: var(--amber-bg);
  color: var(--amber-text);
}

.branch-chip--ok {
  background: var(--green-bg);
  color: var(--green-text);
}
</style>
