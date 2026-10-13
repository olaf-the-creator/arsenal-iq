<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Inline season picker for a page title: the year in title type with a caret
// that opens a short menu. Disabled years stay listed but can't be picked.
defineProps({
  // [{ value, disabled }], newest first.
  options: { type: Array, required: true },
  label: { type: String, default: 'Season' },
})
const model = defineModel({ type: Number, required: true })

const open = ref(false)
const root = ref(null)
const trigger = ref(null)

function choose(opt) {
  if (opt.disabled) return
  model.value = opt.value
  close()
}

function close(refocus = false) {
  open.value = false
  if (refocus) trigger.value?.focus()
}

// Clicking outside the picker or pressing Escape closes the menu. Escape is
// caught on the document because clicking a disabled year doesn't take focus.
const onDocClick = (e) => {
  if (open.value && !root.value?.contains(e.target)) close()
}
const onDocKey = (e) => {
  if (open.value && e.key === 'Escape') close(true)
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onDocKey)
})
</script>

<template>
  <span ref="root" class="year-select">
    <button
      ref="trigger"
      type="button"
      class="trigger"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="`${label}: ${model}. Change ${label.toLowerCase()}`"
      @click="open = !open"
    >
      {{ model }}
      <svg class="caret" :class="{ 'caret--open': open }" viewBox="0 0 12 8" width="14" height="10" aria-hidden="true">
        <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <ul v-if="open" class="menu" :aria-label="label">
      <li v-for="opt in options" :key="opt.value">
        <button
          type="button"
          class="option"
          :class="{ 'option--active': opt.value === model }"
          :aria-current="opt.value === model ? 'true' : undefined"
          :disabled="opt.disabled"
          :title="opt.disabled ? 'Not available in the POC' : undefined"
          @click="choose(opt)"
        >
          {{ opt.value }}
        </button>
      </li>
    </ul>
  </span>
</template>

<style scoped>
.year-select {
  position: relative;
  display: inline-flex;
}

/* The year reads as part of the title: same size, weight and colour. */
.trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.caret {
  color: var(--color-text-muted);
  transition: transform 0.15s ease;
}

.caret--open {
  transform: rotate(180deg);
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10;
  min-width: 100%;
  margin: 0;
  padding: 6px 0;
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-white);
  box-shadow: 0 6px 20px rgb(20 34 90 / 0.12);
}

.option {
  display: block;
  width: 100%;
  padding: 8px 20px;
  border: 0;
  background: none;
  color: var(--color-text);
  font-size: 16px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.option:hover:not(:disabled) {
  background: var(--color-row-hover);
}

.option--active {
  color: var(--color-navy);
  box-shadow: inset 3px 0 0 var(--color-scarlet);
}

.option:disabled {
  color: #c4c8d0;
  cursor: not-allowed;
}
</style>
