<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '../icons/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: { value: string; label: string }[]
    disabled?: boolean
  }>(),
  { disabled: false },
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
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="open = !open"
    >
      {{ currentLabel }}
      <span class="filter-select__chevron"><AppIcon name="chevron-down" :size="16" /></span>
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
