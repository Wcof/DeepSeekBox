<script setup lang="ts">
import { pluginCenter } from '../../stores/pluginCenter'
import AppIcon from '../icons/AppIcon.vue'
import type { IconName } from '../icons/iconNames'
import type { ToastType } from '../../types/plugin'

const { state, dismissToast } = pluginCenter

const TOAST_ICONS: Record<ToastType, IconName> = {
  success: 'info',
  info: 'info',
  warning: 'alert-circle',
  error: 'alert-circle',
}
</script>

<template>
  <div class="toast-host" role="status" aria-live="polite">
    <div v-for="item in state.toasts" :key="item.id" class="toast" :class="`toast--${item.type}`">
      <span class="toast__icon"><AppIcon :name="TOAST_ICONS[item.type]" :size="19" /></span>
      <span class="toast__text">{{ item.text }}</span>
      <button
        type="button"
        class="toast__close"
        aria-label="关闭通知"
        @click="dismissToast(item.id)"
      >
        <AppIcon name="x" :size="16" />
      </button>
    </div>
  </div>
</template>
