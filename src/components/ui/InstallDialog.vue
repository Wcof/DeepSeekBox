<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { pluginCenter } from '../../stores/pluginCenter'
import { HOST } from '../../types/plugin'

const { state, closeInstallDialog, installSpec } = pluginCenter

const spec = ref('')

watch(
  () => state.installOpen,
  (open) => {
    if (open) spec.value = ''
  },
)

const installing = () => state.busy.installSpec === true

function close(): void {
  if (installing()) return
  closeInstallDialog()
}

async function submit(): Promise<void> {
  if (installing()) return
  await installSpec(spec.value)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && state.installOpen) close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="state.installOpen" class="dialog-overlay" @click.self="close">
    <div class="dialog" role="dialog" aria-modal="true" aria-label="安装插件">
      <h2 class="dialog__title">安装插件</h2>
      <p class="dialog__message">
        填入包名、git 地址或本机目录，{{ HOST.displayName }} 会把依赖装进当前 profile；装完需要重启窗口才会加载新的 Host 代码。
      </p>

      <input
        v-model="spec"
        class="dialog__input"
        type="text"
        spellcheck="false"
        placeholder="plugbox / git+https://… / /Users/me/plugin"
        :disabled="installing()"
        @keydown.enter="submit()"
      />

      <div class="dialog__actions">
        <button type="button" class="btn btn--secondary" :disabled="installing()" @click="close">
          取消
        </button>
        <button type="button" class="btn btn--primary" :disabled="installing()" @click="submit">
          <span v-if="installing()" class="spinner" />
          安装
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog__input {
  width: 100%;
  margin-top: 16px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  color: var(--color-text);
  background: #ffffff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.dialog__input:focus {
  border-color: var(--color-border-strong);
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.06);
}
</style>
