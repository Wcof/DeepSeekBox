<script setup lang="ts">
import AppIcon from '../icons/AppIcon.vue'

withDefaults(defineProps<{ icon?: string; size?: number }>(), { size: 26 })
</script>

<template>
  <div class="plugin-card__tile">
    <img v-if="icon" :src="icon" alt="" class="plugin-tile__img" />
    <AppIcon v-else name="puzzle" :size="size" />
  </div>
</template>

<style scoped>
.plugin-tile__img {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  object-fit: contain;
  display: block;
}
</style>
