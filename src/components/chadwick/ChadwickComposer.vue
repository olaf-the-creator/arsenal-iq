<script setup>
import { nextTick, ref, watch } from 'vue'

// The question box: the landing page's large version and the chat's docked
// version share it. Enter sends, Shift+Enter adds a line; while an answer
// streams, the send button becomes a stop button.
const props = defineProps({
  modelValue: { type: String, default: '' },
  streaming: { type: Boolean, default: false },
  variant: { type: String, default: 'hero' }, // 'hero' | 'dock'
  placeholder: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'submit', 'stop'])
const input = ref(null)

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    if (!props.streaming) send()
  }
}

// Reads the textarea itself, so an Enter right after input never sends stale text.
function send() {
  const text = (input.value?.value ?? props.modelValue).trim()
  if (text) emit('submit', text)
}

// The docked box grows with its text, up to a cap.
function autosize() {
  const el = input.value
  if (!el || props.variant !== 'dock') return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 180)}px`
}
watch(() => props.modelValue, () => nextTick(autosize))

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <form class="composer" :class="`composer--${variant}`" @submit.prevent="send">
    <label class="label" for="chadwick-input">Ask Chadwick</label>
    <textarea
      id="chadwick-input"
      ref="input"
      :value="modelValue"
      :rows="variant === 'hero' ? 3 : 1"
      :placeholder="placeholder"
      autocomplete="off"
      @input="emit('update:modelValue', $event.target.value)"
      @keydown="onKeydown"
    />
    <div class="foot">
      <button v-if="streaming" type="button" class="btn btn--stop" @click="emit('stop')">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect width="12" height="12" rx="2" fill="currentColor" /></svg>
        Stop
      </button>
      <button v-else type="submit" class="btn" :disabled="!modelValue.trim()">
        Ask Chadwick
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4.5-5L15 10l-4.5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </div>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-white);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.composer:focus-within {
  border-color: var(--color-navy);
  box-shadow: 0 0 0 3px rgb(20 34 90 / 0.08);
}

.composer--hero {
  padding: 24px 28px 22px;
}

.composer--dock {
  padding: 12px 16px 12px;
  box-shadow: 0 6px 24px rgb(20 34 90 / 0.1);
}

.label {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.composer--dock .label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

textarea {
  width: 100%;
  margin: 14px 0 16px;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 20px;
  line-height: 1.45;
  resize: vertical;
}

.composer--dock textarea {
  margin: 0 0 10px;
  font-size: 16px;
  resize: none;
}

textarea::placeholder {
  color: #9aa0ad;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 10px;
  padding: 14px 22px;
  border: 0;
  border-radius: 6px;
  background: var(--color-scarlet);
  color: var(--color-white);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.composer--dock .btn {
  padding: 9px 16px;
  font-size: 14px;
}

.btn:hover:not(:disabled) {
  background: #8f0003;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn:focus-visible {
  outline: 2px solid var(--color-navy);
  outline-offset: 2px;
}

.btn--stop {
  background: var(--color-navy);
}

.btn--stop:hover:not(:disabled) {
  background: #0c1640;
}

@media (max-width: 560px) {
  .composer--hero {
    padding: 18px 18px 16px;
  }

  .foot {
    justify-content: flex-end;
  }
}
</style>
