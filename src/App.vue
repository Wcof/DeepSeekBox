<script setup lang="ts">
import { onMounted } from 'vue'
import { pluginCenter } from './stores/pluginCenter'
import PluginCenter from './components/plugin/PluginCenter.vue'
import PluginDetailPage from './components/plugin/PluginDetailPage.vue'
import ToastHost from './components/ui/ToastHost.vue'
import ConfirmDialog from './components/ui/ConfirmDialog.vue'
import InstallDialog from './components/ui/InstallDialog.vue'
import BranchDialog from './components/ui/BranchDialog.vue'

const { detailBundle, init } = pluginCenter

onMounted(() => init())
</script>

<template>
  <PluginDetailPage v-if="detailBundle" />
  <PluginCenter v-else />
  <InstallDialog />
  <BranchDialog />
  <ToastHost />
  <ConfirmDialog />
</template>
