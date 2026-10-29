<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { pluginCenter } from '../../stores/pluginCenter'

const { state, resolveConfirm } = pluginCenter

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && state.confirm) resolveConfirm(false)
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    v-if="state.confirm"
    class="dialog-overlay"
    @click.self="resolveConfirm(false)"
  >
    <div class="dialog" role="alertdialog" aria-modal="true" :aria-label="state.confirm.title">
      <h2 class="dialog__title">{{ state.confirm.title }}</h2>
      <p class="dialog__message">{{ state.confirm.message }}</p>
      <div class="dialog__actions">
        <button type="button" class="btn btn--secondary" @click="resolveConfirm(false)">
          取消
        </button>
        <button
          type="button"
          class="btn"
          :class="state.confirm.danger ? 'btn--danger-solid' : 'btn--primary'"
          @click="resolveConfirm(true)"
        >
          {{ state.confirm.confirmText ?? '确认' }}
        </button>
      </div>
    </div>
  </div>
</template>
