<script setup>
import { computed } from 'vue'
import { renderMarkdown } from '../../../services/chadwick/markdown.js'

// A verdict or caveat note set off from the prose.
const props = defineProps({
  block: { type: Object, required: true }, // { tone: 'verdict' | 'caveat', md }
  streaming: { type: Boolean, default: false },
})
// A caret at the end of the text while it streams.
const html = computed(() => {
  const out = renderMarkdown(props.block.md)
  return props.streaming ? out.replace(/(<\/li><\/ul>|<\/p>)$/, '<span class="caret"></span>$1') : out
})
</script>

<template>
  <div class="callout" :class="`callout--${block.tone ?? 'caveat'}`" v-html="html" />
</template>

<style scoped>
.callout {
  padding: 10px 14px;
  border-left: 3px solid;
  border-radius: 0 4px 4px 0;
  font-size: 13px;
  line-height: 1.55;
}

.callout :deep(p) {
  margin: 0;
}

.callout--caveat {
  border-color: #a35b00;
  background: #fff8ec;
}

.callout--caveat :deep(strong) {
  color: #a35b00;
}

.callout--verdict {
  border-color: var(--color-scarlet);
  background: #fdf3f3;
}

.callout--verdict :deep(strong) {
  color: var(--color-navy);
}
.callout :deep(.caret) {
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
  .callout :deep(.caret) {
    animation: none;
  }
}
</style>
