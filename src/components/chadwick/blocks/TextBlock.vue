<script setup>
import { computed } from 'vue'
import { renderMarkdown } from '../../../services/chadwick/markdown.js'

// Markdown prose; renders as it streams.
const props = defineProps({
  block: { type: Object, required: true },
  streaming: { type: Boolean, default: false },
})
// A caret at the end of the text while it streams.
const html = computed(() => {
  const out = renderMarkdown(props.block.md)
  return props.streaming ? out.replace(/(<\/li><\/ul>|<\/p>)$/, '<span class="caret"></span>$1') : out
})
</script>

<template>
  <div class="md" v-html="html" />
</template>

<style scoped>
.md {
  font-size: 15px;
  line-height: 1.65;
}

.md :deep(p) {
  margin: 0 0 10px;
}

.md :deep(p:last-child),
.md :deep(ul:last-child) {
  margin-bottom: 0;
}

.md :deep(strong) {
  color: var(--color-navy);
  font-weight: 700;
}

.md :deep(ul) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.md :deep(li + li) {
  margin-top: 4px;
}
.md :deep(.caret) {
  display: inline-block;
  width: 7px;
  height: 1em;
  margin-left: 2px;
  background: var(--color-navy);
  vertical-align: -2px;
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .md :deep(.caret) {
    animation: none;
  }
}
</style>
