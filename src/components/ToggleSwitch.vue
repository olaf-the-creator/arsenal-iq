<script setup>
defineProps({
  label: { type: String, required: true },
})
const model = defineModel({ type: Boolean, default: false })
</script>

<template>
  <button type="button" role="switch" class="toggle" :aria-checked="model" @click="model = !model">
    <span class="track" aria-hidden="true"><span class="thumb" /></span>
    <span class="label">{{ label }}</span>
  </button>
</template>

<style scoped>
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.toggle[aria-checked='true'] {
  color: var(--color-navy);
}

.track {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: #c4c8d0;
  transition: background 0.15s;
}

.toggle[aria-checked='true'] .track {
  background: var(--color-navy);
}

.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-white);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
  transition: transform 0.15s;
}

.toggle[aria-checked='true'] .thumb {
  transform: translateX(16px);
}

.toggle:focus-visible {
  outline: 2px solid var(--color-navy);
  outline-offset: 4px;
  border-radius: 4px;
}
</style>
