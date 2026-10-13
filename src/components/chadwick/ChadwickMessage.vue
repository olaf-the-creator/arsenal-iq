<script setup>
import { computed, ref } from 'vue'
import { getModel, stableAt } from '../../services/models.js'
import { markdownToText } from '../../services/chadwick/markdown.js'
import { BLOCK_RENDERERS } from './blocks/index.js'
import ChadwickMark from './ChadwickMark.vue'

// One Chadwick answer: thinking indicator, step trace, streamed blocks, then
// the footer (models used, actions, follow-ups).
const props = defineProps({
  // { status: 'thinking' | 'working' | 'done' | 'stopped', steps, blocks,
  //   streamingIndex, modelsUsed, role, followUps }
  msg: { type: Object, required: true },
  busy: { type: Boolean, default: false }, // another answer is streaming
})
const emit = defineEmits(['follow-up', 'regenerate'])

const stepsOpen = ref(null) // null = automatic: open while steps run
const feedback = ref(null)
const copied = ref(false)

const live = computed(() => props.msg.status === 'thinking' || props.msg.status === 'working')
const stepsDone = computed(() => props.msg.steps.length > 0 && props.msg.steps.every((s) => s.status === 'done'))
const showSteps = computed(() => stepsOpen.value ?? !stepsDone.value)
const modelCount = computed(() => new Set(props.msg.modelsUsed.map((m) => m.key)).size)
const stepSummary = computed(() => {
  const n = props.msg.steps.length
  const models = modelCount.value ? `Used ${modelCount.value} model${modelCount.value === 1 ? '' : 's'} · ` : ''
  return stepsDone.value ? `${models}${n} step${n === 1 ? '' : 's'}` : 'Working…'
})

const chips = computed(() =>
  props.msg.modelsUsed.map((u) => {
    const m = getModel(u.key)
    const at = stableAt(m, props.msg.role)
    return { ...u, label: m.label, version: m.version, isNew: m.isNew, stable: at == null ? null : u.n >= at }
  }),
)

async function copy() {
  const text = props.msg.blocks
    .map((b) => {
      if (b.md != null) return markdownToText(b.md)
      if (b.type === 'table') return [b.title, b.columns.map((c) => c.label).join('\t'), ...b.rows.map((r) => b.columns.map((c) => r[c.key]).join('\t'))].join('\n')
      return b.title ? `[${b.title}]` : ''
    })
    .filter(Boolean)
    .join('\n\n')
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Clipboard API blocked (unfocused or non-secure page): legacy copy.
    const ta = Object.assign(document.createElement('textarea'), { value: text })
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.append(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}

function regenerate() {
  stepsOpen.value = null
  feedback.value = null
  emit('regenerate')
}
</script>

<template>
  <article class="msg" :aria-busy="live">
    <ChadwickMark :size="30" />
    <div class="content">
      <p class="who">Chadwick</p>

      <p v-if="msg.status === 'thinking'" class="thinking"><span>Computing…</span></p>

      <!-- Step trace: ticks off while running, then collapses to a summary. -->
      <div v-if="msg.steps.length" class="steps">
        <button type="button" class="steps-toggle" :aria-expanded="showSteps" @click="stepsOpen = !showSteps">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" :class="{ open: showSteps }"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          {{ stepSummary }}
        </button>
        <ol v-show="showSteps" class="step-list">
          <li v-for="(s, i) in msg.steps" :key="i" :class="`step--${s.status}`">
            <span class="step-icon" aria-hidden="true">
              <svg v-if="s.status === 'done'" width="14" height="14" viewBox="0 0 14 14"><path d="M3 7.5l2.5 2.5L11 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
              <span v-else class="spinner" />
            </span>
            {{ s.label }}
          </li>
        </ol>
      </div>

      <div class="blocks">
        <component
          :is="BLOCK_RENDERERS[b.type]"
          v-for="(b, i) in msg.blocks"
          :key="i"
          :block="b"
          :streaming="live && i === msg.streamingIndex"
          class="block"
          :class="{ 'block--visual': b.md == null }"
        />
      </div>

      <p v-if="msg.status === 'stopped'" class="stopped">Stopped. The answer above is partial.</p>

      <footer v-if="msg.status === 'done' || msg.status === 'stopped'" class="foot">
        <div v-if="chips.length && msg.status === 'done'" class="models">
          <span class="models-label">Models used</span>
          <span v-for="(c, i) in chips" :key="i" class="model">
            <b>{{ c.label }} {{ c.version }}</b>
            <span v-if="c.scope" class="scope">{{ c.scope }}</span>
            <span class="scope">n={{ c.n.toLocaleString() }}</span>
            <span v-if="c.stable != null" class="pill" :class="c.stable ? 'pill--ok' : 'pill--warn'">{{ c.stable ? 'Stable' : 'Not yet stable' }}</span>
            <span v-if="c.isNew" class="new">New model</span>
          </span>
        </div>

        <div class="actions">
          <button type="button" class="icon-btn" :aria-label="copied ? 'Copied' : 'Copy answer'" :title="copied ? 'Copied' : 'Copy'" @click="copy">
            <svg v-if="!copied" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M10.5 3.5V3A1.5 1.5 0 0 0 9 1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.5" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
            <svg v-else width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button type="button" class="icon-btn" :class="{ on: feedback === 'up' }" aria-label="Good answer" title="Good answer" :aria-pressed="feedback === 'up'" @click="feedback = feedback === 'up' ? null : 'up'">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7l2.5-5c1 0 1.8.8 1.8 1.8V6h3.4c.8 0 1.4.7 1.3 1.5l-.8 5A1.5 1.5 0 0 1 11.7 14H5M5 7v7M5 7H2.5v7H5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" /></svg>
          </button>
          <button type="button" class="icon-btn" :class="{ on: feedback === 'down' }" aria-label="Bad answer" title="Bad answer" :aria-pressed="feedback === 'down'" @click="feedback = feedback === 'down' ? null : 'down'">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style="transform: rotate(180deg)"><path d="M5 7l2.5-5c1 0 1.8.8 1.8 1.8V6h3.4c.8 0 1.4.7 1.3 1.5l-.8 5A1.5 1.5 0 0 1 11.7 14H5M5 7v7M5 7H2.5v7H5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" /></svg>
          </button>
          <button type="button" class="icon-btn" aria-label="Regenerate answer" title="Regenerate" :disabled="busy" @click="regenerate">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 8A5.5 5.5 0 1 1 11.9 4.1M13.5 2v3.5H10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <span v-if="copied" class="copied" role="status">Copied</span>
        </div>

        <div v-if="msg.followUps.length && msg.status === 'done'" class="follow">
          <button v-for="f in msg.followUps" :key="f.id" type="button" class="follow-chip" :disabled="busy" @click="emit('follow-up', f.prompt)">
            {{ f.prompt }}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.msg {
  display: flex;
  gap: 14px;
}

.content {
  flex: 1;
  min-width: 0;
}

.who {
  margin: 4px 0 8px;
  color: var(--color-navy);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Shimmering "Computing…" while the answer is prepared. */
.thinking span {
  background: linear-gradient(90deg, #9aa0ad 0%, var(--color-navy) 40%, #9aa0ad 80%);
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-size: 15px;
  font-weight: 600;
  animation: shimmer 1.4s linear infinite;
}

.thinking {
  margin: 0;
}

.steps {
  margin-bottom: 14px;
}

.steps-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 4px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.steps-toggle:hover {
  background: var(--color-row-hover);
  color: var(--color-navy);
}

.steps-toggle:focus-visible,
.icon-btn:focus-visible,
.follow-chip:focus-visible {
  outline: 2px solid var(--color-navy);
  outline-offset: 2px;
}

.steps-toggle svg {
  transition: transform 0.15s;
}

.steps-toggle svg.open {
  transform: rotate(90deg);
}

.step-list {
  margin: 6px 0 0 10px;
  padding: 2px 0 2px 14px;
  border-left: 2px solid var(--color-border);
  list-style: none;
}

.step-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  color: var(--color-text);
  font-size: 13px;
  animation: rise 0.25s ease-out both;
}

.step--running {
  color: var(--color-text-muted);
}

.step-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  color: #17803d;
}

.spinner {
  width: 11px;
  height: 11px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-navy);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.blocks {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.block--visual {
  animation: rise 0.4s ease-out both;
}

.stopped {
  margin: 12px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
  font-style: italic;
}

.foot {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.models {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.models-label {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.model {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-white);
  font-size: 12px;
}

.model b {
  color: var(--color-navy);
}

.scope {
  color: var(--color-text-muted);
}

.pill {
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 700;
}

.pill--ok {
  background: #e7f6ec;
  color: #17803d;
}

.pill--warn {
  background: #fff4e0;
  color: #a35b00;
}

.new {
  padding: 1px 7px;
  border-radius: 3px;
  background: var(--color-scarlet);
  color: var(--color-white);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
  background: var(--color-row-hover);
  color: var(--color-navy);
}

.icon-btn.on {
  color: var(--color-scarlet);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.copied {
  margin-left: 6px;
  color: #17803d;
  font-size: 12px;
  font-weight: 600;
}

.follow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.follow-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 7px 14px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-white);
  color: var(--color-navy);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.follow-chip span {
  color: var(--color-scarlet);
}

.follow-chip:hover:not(:disabled) {
  border-color: var(--color-navy);
  background: #eef1fb;
}

.follow-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .thinking span,
  .spinner,
  .step-list li,
  .block--visual {
    animation: none;
  }

  .thinking span {
    color: var(--color-text-muted);
    background: none;
  }
}

/* Phones: the mark sits beside the byline so the answer gets the full width. */
@media (max-width: 560px) {
  .msg {
    position: relative;
    display: block;
  }

  .msg > :first-child {
    position: absolute;
    top: 0;
    left: 0;
    width: 24px;
    height: 24px;
  }

  .who {
    margin: 2px 0 10px;
    padding-left: 32px;
    line-height: 20px;
  }

  .icon-btn {
    width: 40px;
    height: 40px;
  }

  .follow-chip {
    padding: 10px 14px;
  }
}
</style>
