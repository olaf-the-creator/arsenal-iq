<script setup>
// Lowercase "i" glyph only. The header button's own border is the circle, so the
// icon must not draw a second one.
defineProps({
  size: { type: Number, default: 24 },
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path d="M12 10.5v7" />
    <circle cx="12" cy="6.6" r="0.7" fill="currentColor" />
  </svg>
</template>
