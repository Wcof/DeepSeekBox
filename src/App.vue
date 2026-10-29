<script setup lang="ts">
import { onMounted } from 'vue'
import { pluginCenter } from './stores/pluginCenter'
import PluginCenter from './components/plugin/PluginCenter.vue'
import PluginConfigPage from './components/plugin/PluginConfigPage.vue'
import ToastHost from './components/ui/ToastHost.vue'
import ConfirmDialog from './components/ui/ConfirmDialog.vue'

const { configPlugin, init } = pluginCenter

onMounted(() => init())
</script>

<template>
  <PluginConfigPage v-if="configPlugin" />
  <PluginCenter v-else />
  <ToastHost />
  <ConfirmDialog />
</template>
