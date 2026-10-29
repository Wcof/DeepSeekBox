<script setup lang="ts">
import { reactive, watch } from 'vue'
import { pluginCenter } from '../../stores/pluginCenter'
import AppIcon from '../icons/AppIcon.vue'
import { pluginIconName } from '../icons/pluginIcon'
import { authorLabel, type ConfigField } from '../../types/plugin'

const { state, configPlugin, closeConfig, saveConfig } = pluginCenter

const draft = reactive<Record<string, string | number | boolean>>({})

function resetDraft(): void {
  for (const key of Object.keys(draft)) delete draft[key]
  Object.assign(draft, configPlugin.value?.config ?? {})
}

watch(
  () => configPlugin.value?.id,
  () => resetDraft(),
  { immediate: true },
)

const statusTag = () => {
  const plugin = configPlugin.value
  if (!plugin) return { text: '', class: '' }
  if (plugin.status === 'missing-file') return { text: '未找到插件文件', class: 'tag--amber' }
  if (plugin.status === 'running') return { text: '运行中', class: 'tag--green' }
  return { text: '已停用', class: 'tag--gray' }
}

function fieldId(field: ConfigField): string {
  return `config-${field.key}`
}

function onCancel(): void {
  closeConfig()
}

async function onSave(): Promise<void> {
  const plugin = configPlugin.value
  if (!plugin) return
  // number 字段基本校验：非负且为有限数值
  for (const field of plugin.configSchema ?? []) {
    if (field.type === 'number') {
      const value = Number(draft[field.key])
      if (!Number.isFinite(value) || value < 0) {
        pluginCenter.toast('warning', `「${field.label}」请输入不小于 0 的数值`)
        return
      }
      draft[field.key] = value
    }
  }
  await saveConfig(plugin.id, { ...draft })
}
</script>

<template>
  <div v-if="configPlugin" class="page">
    <div class="config-top">
      <button type="button" class="btn btn--secondary" @click="closeConfig()">
        <AppIcon name="arrow-left" :size="16" />
        返回插件中心
      </button>
    </div>

    <header class="config-hero">
      <div class="plugin-card__tile">
        <AppIcon :name="pluginIconName(configPlugin.icon)" :size="26" />
      </div>
      <div class="config-hero__titles">
        <div class="config-hero__name">{{ configPlugin.name }}</div>
        <div class="plugin-card__id mono">{{ configPlugin.id }}</div>
      </div>
      <span class="tag" :class="statusTag().class">{{ statusTag().text }}</span>
    </header>

    <div class="config-body">
      <section class="config-card">
        <h2 class="config-card__title">基本信息</h2>
        <dl class="config-info">
          <div class="config-info__row">
            <dt>版本</dt>
            <dd>v{{ configPlugin.installedVersion }}</dd>
          </div>
          <div class="config-info__row">
            <dt>别名</dt>
            <dd>{{ configPlugin.alias }}</dd>
          </div>
          <div class="config-info__row">
            <dt>作者</dt>
            <dd>{{ authorLabel(configPlugin.author, configPlugin.authorName, true) }}</dd>
          </div>
          <div class="config-info__row">
            <dt>插件文件</dt>
            <dd>
              <span v-if="configPlugin.filePath" class="mono">{{
                configPlugin.filePath
              }}</span>
              <span v-else class="config-info__empty">未找到（请从商场重新下载）</span>
            </dd>
          </div>
          <div v-if="configPlugin.repoUrl" class="config-info__row">
            <dt>代码仓库</dt>
            <dd>
              <a
                class="config-info__link"
                :href="configPlugin.repoUrl"
                target="_blank"
                rel="noopener"
              >
                {{ configPlugin.repoLabel ?? configPlugin.name }}
                <AppIcon name="external-link" :size="14" />
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <section class="config-card">
        <h2 class="config-card__title">插件配置</h2>

        <p v-if="!configPlugin.configSchema?.length" class="config-card__empty">
          该插件暂无可配置项。
        </p>

        <div v-else class="config-form">
          <template v-for="field in configPlugin.configSchema" :key="field.key">
            <label v-if="field.type === 'boolean'" class="config-field config-field--switch">
              <span class="config-field__label">{{ field.label }}</span>
              <button
                type="button"
                class="switch"
                role="switch"
                :aria-checked="draft[field.key] === true"
                :class="{ 'switch--on': draft[field.key] === true }"
                @click="draft[field.key] = draft[field.key] !== true"
              >
                <span class="switch__thumb" />
              </button>
            </label>

            <div v-else class="config-field">
              <label class="config-field__label" :for="fieldId(field)">{{
                field.label
              }}</label>

              <select
                v-if="field.type === 'select'"
                :id="fieldId(field)"
                v-model="draft[field.key]"
                class="config-field__control"
              >
                <option v-for="option in field.options" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>

              <input
                v-else-if="field.type === 'number'"
                :id="fieldId(field)"
                v-model.number="draft[field.key]"
                type="number"
                class="config-field__control"
                :step="field.step ?? 1"
                min="0"
              />

              <input
                v-else
                :id="fieldId(field)"
                v-model="draft[field.key]"
                type="text"
                class="config-field__control"
                :placeholder="field.placeholder"
              />
            </div>
          </template>
        </div>

        <div class="config-card__actions">
          <button type="button" class="btn btn--secondary" @click="onCancel()">取消</button>
          <button
            type="button"
            class="btn btn--primary"
            :disabled="state.busy[`saveConfig:${configPlugin.id}`]"
            @click="onSave()"
          >
            <span
              v-if="state.busy[`saveConfig:${configPlugin.id}`]"
              class="spinner"
            />
            保存
          </button>
        </div>
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
  padding-bottom: 22px;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 24px;
}

.config-hero__titles {
  flex: 1;
  min-width: 0;
}

.config-hero__name {
  font-size: 20px;
  font-weight: 700;
}

.config-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 760px;
}

.config-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 24px;
}

.config-card__title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 700;
}

.config-card__empty {
  margin: 0;
  color: var(--color-text-secondary);
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

.config-info__empty {
  color: var(--color-text-muted);
}

.config-info__link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--color-text);
  text-decoration: none;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1px;
}

.config-info__link:hover {
  border-bottom-color: var(--color-text);
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-field--switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.config-field__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.config-field__control {
  height: 42px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-family: inherit;
  font-size: 14.5px;
  color: var(--color-text);
  background: #ffffff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.config-field__control:focus {
  border-color: var(--color-border-strong);
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.06);
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

.switch--on {
  background: var(--color-primary);
  border-color: var(--color-primary);
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

.config-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
</style>
