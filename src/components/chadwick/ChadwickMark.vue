<script setup>
// Chadwick's monogram: a navy tile with a geometric white C and a scarlet
// point, drawn from the theme colors.
defineProps({ size: { type: Number, default: 28 } })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true" class="mark">
    <rect width="32" height="32" rx="7" class="tile" />
    <path d="M23 11.5A8 8 0 1 0 23 20.5" class="m" />
    <rect x="22.5" y="5" width="4.5" height="4.5" rx="1" class="dot" />
  </svg>
</template>

<style scoped>
.mark {
  display: block;
  flex: none;
}

.tile {
  fill: var(--color-navy);
}

.m {
  fill: none;
  stroke: var(--color-white);
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dot {
  fill: var(--color-scarlet);
}
</style>
