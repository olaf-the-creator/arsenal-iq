<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { guideFor } from '../services/userGuide.js'

// Right-hand User Guide drawer. Content follows the current route.
const open = defineModel({ type: Boolean, default: false })

const route = useRoute()
const guide = computed(() => guideFor(route.name))

const panel = ref(null)
const closeBtn = ref(null)
let opener = null

// "**bold**" in guide text becomes <strong>; no v-html needed.
const inline = (text) => text.split('**').map((t, i) => ({ t, bold: i % 2 === 1 }))

// Summaries may also hold [text](https://...) links, which open in a new tab.
const LINK = /\[([^\]]+)\]\((https:\/\/\S+?)\)(?=[\s,.;:]|$)/g
function summaryParts(text) {
  const out = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    if (m.index > last) out.push(...inline(text.slice(last, m.index)))
    out.push({ t: m[1], href: m[2] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(...inline(text.slice(last)))
  return out
}

const close = () => (open.value = false)

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    return
  }
  if (e.key !== 'Tab' || !panel.value) return
  // Keep focus inside the dialog while it is open.
  const items = [...panel.value.querySelectorAll('a[href], button:not([disabled])')]
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

function lockScroll(on) {
  document.documentElement.style.overflow = on ? 'hidden' : ''
}

watch(open, async (isOpen) => {
  lockScroll(isOpen)
  if (isOpen) {
    opener = document.activeElement
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    closeBtn.value?.focus()
  } else {
    document.removeEventListener('keydown', onKeydown)
    opener?.focus?.()
    opener = null
  }
})

// Moving to another page closes the drawer, and the next open shows that page's guide.
watch(() => route.fullPath, close)

onBeforeUnmount(() => {
  lockScroll(false)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="guide">
      <div v-if="open" class="guide-root">
        <div class="overlay" @click="close" />
        <aside ref="panel" class="drawer" role="dialog" aria-modal="true" aria-labelledby="guide-title">
          <header class="top">
            <h2 id="guide-title" class="title">User Guide</h2>
            <button ref="closeBtn" type="button" class="close" aria-label="Close user guide" @click="close">
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4 4l12 12M16 4L4 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </header>

          <div class="body">
            <h3 class="page">{{ guide.heading }}</h3>
            <p class="summary">
              <template v-for="(s, i) in summaryParts(guide.summary)" :key="i">
                <a v-if="s.href" :href="s.href" target="_blank" rel="noopener noreferrer">{{ s.t }}</a>
                <strong v-else-if="s.bold">{{ s.t }}</strong>
                <template v-else>{{ s.t }}</template>
              </template>
            </p>

            <section v-for="sec in guide.sections" :key="sec.title" class="sec">
              <h4>{{ sec.title }}</h4>
              <p v-if="sec.text">
                <template v-for="(s, i) in inline(sec.text)" :key="i">
                  <strong v-if="s.bold">{{ s.t }}</strong>
                  <template v-else>{{ s.t }}</template>
                </template>
              </p>
              <ol v-if="sec.steps">
                <li v-for="step in sec.steps" :key="step">{{ step }}</li>
              </ol>
              <ul v-if="sec.bullets">
                <li v-for="b in sec.bullets" :key="b">
                  <template v-for="(s, i) in inline(b)" :key="i">
                    <strong v-if="s.bold">{{ s.t }}</strong>
                    <template v-else>{{ s.t }}</template>
                  </template>
                </li>
              </ul>
            </section>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.guide-root {
  position: fixed;
  inset: 0;
  z-index: 100; /* above the sticky header (10) and Chadwick's drawer (30) */
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgb(10 14 30 / 0.55);
}

.drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: min(480px, 100%);
  background: var(--color-white);
  color: var(--color-text);
  box-shadow: -8px 0 28px rgb(0 0 0 / 0.28);
}

.top {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 14px 24px;
  border-bottom: 3px solid var(--color-scarlet);
  background: var(--color-header-bg);
}

.title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-scarlet);
}

.close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-navy);
  cursor: pointer;
}

.close:hover {
  background: rgb(20 34 90 / 0.1);
}

.close:focus-visible {
  outline: 2px solid var(--color-navy);
  outline-offset: 1px;
}

.body {
  flex: 1;
  min-height: 0;
  padding: 20px 24px 40px;
  overflow-y: auto;
  overscroll-behavior: contain;
  font-size: 15px;
  line-height: 1.55;
}

.page {
  margin: 0 0 10px;
  font-size: 26px;
  font-weight: 700;
  color: var(--color-navy);
}

.summary {
  margin: 0 0 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.summary a {
  color: var(--color-navy);
  font-weight: 600;
  text-decoration: underline;
}

.summary a:hover {
  color: var(--color-scarlet);
}

.sec h4 {
  margin: 22px 0 6px;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-navy);
}

.sec p {
  margin: 0 0 8px;
}

.sec ul,
.sec ol {
  margin: 0 0 8px;
  padding-left: 20px;
}

.sec li {
  margin-bottom: 6px;
}

.sec li::marker {
  color: var(--color-scarlet);
}

/* Slide in from the right; the overlay fades. */
.guide-enter-active,
.guide-leave-active {
  transition: opacity 0.2s ease;
}

.guide-enter-active .drawer,
.guide-leave-active .drawer {
  transition: transform 0.25s ease;
}

.guide-enter-from,
.guide-leave-to {
  opacity: 0;
}

.guide-enter-from .drawer,
.guide-leave-to .drawer {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .guide-enter-active,
  .guide-leave-active,
  .guide-enter-active .drawer,
  .guide-leave-active .drawer {
    transition: none;
  }
}

/* Phones: full-width sheet, tighter padding. */
@media (max-width: 640px) {
  .drawer {
    width: 100%;
  }

  .top {
    padding-left: 16px;
  }

  .body {
    padding: 16px 16px max(32px, env(safe-area-inset-bottom));
    font-size: 15px;
  }

  .page {
    font-size: 24px;
  }
}
</style>
