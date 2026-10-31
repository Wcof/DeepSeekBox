<script setup lang="ts">
import AppIcon from '../icons/AppIcon.vue'

withDefaults(defineProps<{ icon?: string; size?: number; muted?: boolean }>(), {
  size: 26,
  muted: false,
})
</script>

<template>
  <div class="plugin-card__tile" :class="{ 'plugin-card__tile--muted': muted }">
    <img v-if="icon" :src="icon" alt="" class="plugin-tile__img" loading="lazy" decoding="async" />
    <AppIcon v-else name="puzzle" :size="size" />
  </div>
</template>

<style scoped>
.plugin-tile__img {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  object-fit: contain;
  display: block;
}
</style>
