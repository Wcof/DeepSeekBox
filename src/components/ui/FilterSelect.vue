<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '../icons/AppIcon.vue'
import type { IconName } from '../icons/iconNames'

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: readonly { value: string; label: string }[]
    disabled?: boolean
    /** 触发器前缀文案，如「排序」 */
    prefix?: string
    leadingIcon?: IconName
    ariaLabel?: string
  }>(),
  { disabled: false, prefix: undefined, leadingIcon: undefined, ariaLabel: undefined },
)

const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const currentLabel = computed(
  () => props.options.find((option) => option.value === props.modelValue)?.label ?? '',
)

function onDocumentClick(event: MouseEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

function select(value: string): void {
  open.value = false
  emit('update:modelValue', value)
}
</script>

<template>
  <div ref="root" class="filter-select" :class="{ 'filter-select--open': open }">
    <button
      type="button"
      class="filter-select__trigger"
      :disabled="props.disabled"
      :aria-label="props.ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span v-if="props.leadingIcon" class="filter-select__icon">
        <AppIcon :name="props.leadingIcon" :size="16" />
      </span>
      <span v-if="props.prefix" class="filter-select__prefix">{{ props.prefix }}</span>
      <span>{{ currentLabel }}</span>
      <span class="filter-select__chevron"><AppIcon name="chevron-down" :size="15" /></span>
    </button>
    <ul v-if="open" class="filter-select__menu" role="listbox">
      <li v-for="option in props.options" :key="option.value">
        <button
          type="button"
          class="filter-select__option"
          :class="{ 'filter-select__option--active': option.value === props.modelValue }"
          role="option"
          :aria-selected="option.value === props.modelValue"
          @click="select(option.value)"
        >
          {{ option.label }}
        </button>
      </li>
    </ul>
  </div>
</template>
