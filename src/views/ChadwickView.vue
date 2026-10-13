<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ChadwickComposer from '../components/chadwick/ChadwickComposer.vue'
import ChadwickMark from '../components/chadwick/ChadwickMark.vue'
import ChadwickMessage from '../components/chadwick/ChadwickMessage.vue'
import { loadChadwickContext } from '../services/chadwick/context.js'
import { getResponse } from '../services/chadwick/provider.js'
import { COMING_SOON, SAMPLE_IDS, buildScripts } from '../services/chadwick/scripts.js'
import { getModel } from '../services/models.js'
import { SEASON } from '../services/pitchers.js'

// Chadwick: plain-English questions about a pitcher, answered with
// the internal models. Scripted for the POC: answers stream from
// services/chadwick/provider.js, the swap point for a real model API.
const ROLE_ABBR = { Rotation: 'SP', Bullpen: 'RP' }

const ctx = ref(null)
const scripts = computed(() => (ctx.value ? buildScripts(ctx.value) : []))
const byId = (id) => scripts.value.find((s) => s.id === id)
const samples = computed(() => SAMPLE_IDS.map(byId).filter(Boolean))
const pitcher = computed(() => ctx.value?.pitcher ?? null)
const contextLabel = computed(() =>
  pitcher.value ? `${pitcher.value.name} · ${ROLE_ABBR[pitcher.value.role] ?? pitcher.value.role} · ${pitcher.value.team}` : '',
)
// "Stuff+, Location+ and Pitching+" from the model registry.
const modelLabels = ['stuff', 'location', 'pitching'].map((k) => getModel(k).label)
const modelList = `${modelLabels.slice(0, -1).join(', ')} and ${modelLabels.at(-1)}`

const messages = ref([])
const draft = ref('')
const streaming = ref(false)
const menuOpen = ref(false)
const drawerOpen = ref(false)
const announce = ref('')
const composer = ref(null)
const started = computed(() => messages.value.length > 0)

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
let controller = null
let typing = null
let nextId = 1

// ---- Scrolling: follow the answer while the reader is at the bottom --------
let stick = true
const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 140
const onScroll = () => (stick = nearBottom())
async function follow(force = false) {
  await nextTick()
  if (force || stick) window.scrollTo({ top: document.documentElement.scrollHeight })
}

// ---- Asking ------------------------------------------------------------------
const emptyAnswer = () => ({ status: 'thinking', steps: [], blocks: [], streamingIndex: -1, modelsUsed: [], role: null, followUps: [] })

async function ask(text) {
  const prompt = text.trim()
  if (!prompt || streaming.value) return
  draft.value = ''
  drawerOpen.value = false
  messages.value.push({ id: nextId++, role: 'user', text: prompt })
  messages.value.push({ id: nextId++, role: 'assistant', prompt, ...emptyAnswer() })
  await run(messages.value.at(-1)) // the reactive proxy, so updates render
}

// Plays the provider's event stream into a message.
async function run(msg) {
  controller = new AbortController()
  const { signal } = controller
  streaming.value = true
  stick = true
  announce.value = 'Chadwick is computing an answer.'
  follow(true)
  try {
    for await (const ev of getResponse(msg.prompt, { signal, instant: reducedMotion() })) {
      if (signal.aborted) break
      if (ev.type === 'meta') {
        msg.modelsUsed = ev.modelsUsed
        msg.role = ev.role
      } else if (ev.type === 'step') {
        msg.status = 'working'
        msg.steps[ev.index] = { label: ev.label, status: ev.status }
      } else if (ev.type === 'block') {
        msg.status = 'working'
        msg.blocks[ev.index] = { ...ev.block }
        msg.streamingIndex = ev.index
      } else if (ev.type === 'text') {
        msg.blocks[ev.index].md += ev.delta
      } else if (ev.type === 'done') {
        msg.followUps = ev.followUps
        msg.status = 'done'
      }
      follow()
    }
  } finally {
    if (msg.status !== 'done') msg.status = 'stopped'
    msg.streamingIndex = -1
    streaming.value = false
    announce.value = msg.status === 'done' ? 'Answer complete.' : 'Answer stopped.'
    follow()
  }
}

function stop() {
  controller?.abort()
}

function regenerate(msg) {
  if (streaming.value) return
  Object.assign(msg, emptyAnswer())
  run(msg)
}

// Starter cards and follow-up chips type the question in quickly, then send.
function typeAndAsk(text) {
  if (streaming.value || typing) return
  menuOpen.value = false
  if (reducedMotion()) return ask(text)
  draft.value = ''
  composer.value?.focus()
  let i = 0
  typing = setInterval(() => {
    i = Math.min(text.length, i + 3)
    draft.value = text.slice(0, i)
    if (i >= text.length) {
      clearInterval(typing)
      setTimeout(() => {
        typing = null
        ask(text)
      }, 160)
    }
  }, 14)
}

function newChat() {
  stop()
  clearInterval(typing)
  typing = null
  messages.value = []
  draft.value = ''
  drawerOpen.value = false
  window.scrollTo({ top: 0 })
  nextTick(() => composer.value?.focus())
}

// Demo history, shown for realism: past chats aren't stored in the POC.
const HISTORY = ['Gore slider shape', 'Bullpen usage vs LHB', 'Cavalli ERA regression?']

// ---- Pitcher context menu (the POC answers for Cavalli only) ---------------
const menuRef = ref(null)
const onDocClick = (e) => {
  if (menuOpen.value && menuRef.value && !menuRef.value.contains(e.target)) menuOpen.value = false
}
const onKey = (e) => {
  if (e.key === 'Escape') {
    menuOpen.value = false
    drawerOpen.value = false
  }
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
  ctx.value = await loadChadwickContext()
})
onBeforeUnmount(() => {
  stop()
  clearInterval(typing)
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})

const PLACEHOLDER = 'e.g. What happens to Cavalli’s fastball with more ride?'
const NOTE = 'Demo · scripted responses · illustrative model values'
</script>

<template>
  <section class="chadwick page--flush">
    <p class="sr-only" aria-live="polite">{{ announce }}</p>

    <!-- Empty state -->
    <div v-if="!started" class="landing">
      <h1>Chadwick AI</h1>
      <p class="subtitle">Ask about any pitcher, Chadwick answers with {{ modelList }}</p>

      <ChadwickComposer ref="composer" v-model="draft" :streaming="streaming" variant="hero" :placeholder="PLACEHOLDER" @submit="ask" @stop="stop" />

      <div class="meta">
        <div ref="menuRef" class="ctx">
          <button type="button" class="ctx-btn" :aria-expanded="menuOpen" aria-haspopup="listbox" @click="menuOpen = !menuOpen">
            <span class="at" aria-hidden="true">@</span>{{ contextLabel }}
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
          </button>
          <ul v-if="menuOpen && ctx" class="menu" role="listbox" aria-label="Pitcher">
            <li
              v-for="p in ctx.roster"
              :key="p.playerId"
              role="option"
              :aria-selected="p.playerId === pitcher.playerId"
              :aria-disabled="p.playerId !== pitcher.playerId || undefined"
              :class="{ current: p.playerId === pitcher.playerId }"
              @click="p.playerId === pitcher.playerId && (menuOpen = false)"
            >
              <span>{{ p.name }} <span class="role">{{ ROLE_ABBR[p.role] }}</span></span>
              <span v-if="p.playerId === pitcher.playerId" class="check" aria-hidden="true">✓</span>
              <span v-else class="demo">demo</span>
            </li>
          </ul>
        </div>
        <span class="slash" aria-hidden="true">/</span>
        <span class="meta-item">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.5l5.5 3L7 7.5l-5.5-3zM1.5 7.5L7 10.5l5.5-3M1.5 10L7 13l5.5-3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" /></svg>
          {{ modelLabels.join(' · ') }}
        </span>
        <span class="slash" aria-hidden="true">/</span>
        <span class="meta-item">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1.5" y="2.5" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2" /><path d="M1.5 5.5h11M4.5 1v3M9.5 1v3" stroke="currentColor" stroke-width="1.2" /></svg>
          {{ SEASON }} season · Statcast
        </span>
      </div>

      <div class="starters">
        <h2 class="starters-title">Try these sample prompts</h2>
        <div class="cards">
          <button
            v-for="(s, i) in samples"
            :key="s.id"
            type="button"
            class="card"
            :class="{ 'card--first': i === 0 }"
            @click="typeAndAsk(s.prompt)"
          >
            <span class="card-cat">{{ s.category }} <span aria-hidden="true">↗</span></span>
            <span class="card-q">{{ s.prompt }}</span>
          </button>
          <!-- A model that doesn't exist yet: shown, not askable. -->
          <div class="card card--soon" aria-disabled="true">
            <span class="card-cat">{{ COMING_SOON.category }} <span class="soon">Coming soon</span></span>
            <span class="card-q">{{ COMING_SOON.prompt }}</span>
          </div>
        </div>
      </div>

      <footer class="disclaimer">{{ NOTE }}</footer>
    </div>

    <!-- Conversation -->
    <div v-else class="chat">
      <div v-if="drawerOpen" class="backdrop" @click="drawerOpen = false" />
      <aside class="sidebar" :class="{ 'sidebar--open': drawerOpen }" aria-label="Chats">
        <button type="button" class="new-chat" @click="newChat">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
          New chat
        </button>
        <p class="side-label">Today</p>
        <ul class="history">
          <li><span class="history-item history-item--current">{{ messages[0]?.text }}</span></li>
        </ul>
        <p class="side-label">Earlier</p>
        <ul class="history">
          <li v-for="h in HISTORY" :key="h">
            <button type="button" class="history-item" disabled title="Chat history isn’t stored in this demo">{{ h }}</button>
          </li>
        </ul>
      </aside>

      <div class="thread-col">
        <div class="chat-bar">
          <button type="button" class="bar-btn" :aria-expanded="drawerOpen" @click="drawerOpen = !drawerOpen">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
            Chats
          </button>
          <span class="bar-title"><ChadwickMark :size="20" /> Chadwick</span>
          <button type="button" class="bar-btn" aria-label="New chat" @click="newChat">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
          </button>
        </div>

        <div class="context-line">
          <span><span class="at" aria-hidden="true">@</span>{{ contextLabel }}</span>
          <span class="slash" aria-hidden="true">/</span>
          <span>{{ SEASON }} season · Statcast</span>
        </div>

        <div class="thread">
          <template v-for="m in messages" :key="m.id">
            <div v-if="m.role === 'user'" class="user-row">
              <p class="user-bubble">{{ m.text }}</p>
            </div>
            <ChadwickMessage v-else :msg="m" :busy="streaming" @follow-up="typeAndAsk" @regenerate="regenerate(m)" />
          </template>
        </div>

        <div class="dock">
          <ChadwickComposer ref="composer" v-model="draft" :streaming="streaming" variant="dock" placeholder="Ask a follow-up about Cavalli…" @submit="ask" @stop="stop" />
          <p class="note">{{ NOTE }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ---- Empty state ---- */
.landing {
  max-width: 1080px;
  padding-bottom: 32px;
}

.subtitle {
  margin: -16px 0 32px;
  color: var(--color-text-muted);
  font-size: clamp(17px, 2vw, 21px);
  font-weight: 400;
  line-height: 1.45;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 16px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.slash {
  color: #c9ccd4;
}

.at {
  margin-right: 2px;
  color: var(--color-scarlet);
  font-weight: 700;
}

.ctx {
  position: relative;
}

.ctx-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: -8px;
  padding: 4px 8px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--color-navy);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.ctx-btn:hover,
.ctx-btn[aria-expanded='true'] {
  background: var(--color-row-hover);
}

.ctx-btn:focus-visible,
.card:focus-visible,
.new-chat:focus-visible,
.bar-btn:focus-visible {
  outline: 2px solid var(--color-navy);
  outline-offset: 2px;
}

.menu {
  position: absolute;
  z-index: 5;
  top: calc(100% + 6px);
  left: -8px;
  width: 260px;
  max-height: 320px;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-white);
  box-shadow: 0 8px 24px rgb(20 34 90 / 0.14);
  list-style: none;
}

.menu li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 4px;
  color: #a3a8b4;
  font-size: 13px;
  cursor: not-allowed;
}

.menu li.current {
  background: #eef1fb;
  color: var(--color-navy);
  font-weight: 700;
  cursor: pointer;
}

.role {
  margin-left: 4px;
  font-size: 11px;
  font-weight: 600;
}

.demo {
  padding: 1px 6px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  font-size: 10px;
  text-transform: uppercase;
}

.check {
  color: var(--color-scarlet);
}

.starters {
  margin-top: 56px;
}

.starters-title {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 15px;
  font-weight: 400;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px 40px;
  margin-top: 28px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px 0 4px;
  border: 0;
  border-top: 1px solid var(--color-border);
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.card--first {
  padding-top: 21px;
  border-top: 2px solid var(--color-scarlet);
}

.card-cat {
  display: flex;
  justify-content: space-between;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.card-q {
  color: var(--color-navy);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
}

.card--first .card-q {
  color: var(--color-scarlet);
}

.card:not(.card--soon):hover {
  border-top-color: var(--color-navy);
}

.card:not(.card--soon):hover .card-q {
  color: var(--color-scarlet);
}

.card--soon {
  cursor: not-allowed;
}

.card--soon .card-cat,
.card--soon .card-q {
  color: #a3a8b4;
}

.soon {
  padding: 1px 6px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  font-size: 10px;
  letter-spacing: 0.06em;
}

.disclaimer {
  margin-top: 56px;
  color: var(--color-text-muted);
  font-size: 12px;
  text-align: center;
}

/* ---- Conversation ---- */
.chat {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  gap: 40px;
  min-height: calc(100vh / var(--ui-zoom) - var(--header-height) - 32px);
}

.sidebar {
  position: sticky;
  top: calc(var(--header-height) + 24px);
  align-self: start;
}

.new-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-navy);
  border-radius: 6px;
  background: var(--color-white);
  color: var(--color-navy);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.new-chat:hover {
  background: #eef1fb;
}

.side-label {
  margin: 24px 0 6px;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.history {
  margin: 0;
  padding: 0;
  list-style: none;
}

.history-item {
  display: block;
  width: 100%;
  overflow: hidden;
  padding: 7px 10px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--color-text);
  font-size: 13px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item:disabled {
  color: var(--color-text-muted);
  cursor: default;
}

.history-item--current {
  background: #eef1fb;
  color: var(--color-navy);
  font-weight: 700;
  box-shadow: inset 3px 0 0 var(--color-scarlet);
}

.thread-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 880px;
}

.chat-bar {
  display: none;
}

.context-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 13px;
}

.thread {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 28px;
  padding: 28px 0 32px;
}

.user-row {
  display: flex;
  justify-content: flex-end;
}

.user-bubble {
  max-width: min(80%, 620px);
  margin: 0;
  padding: 10px 16px;
  border-radius: 14px 14px 4px 14px;
  background: var(--color-header-bg);
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.dock {
  position: sticky;
  bottom: 0;
  padding: 12px 0 16px;
  background: linear-gradient(to bottom, rgb(255 255 255 / 0), var(--color-white) 24px);
}

.note {
  margin: 8px 0 0;
  color: var(--color-text-muted);
  font-size: 11px;
  text-align: center;
}

.backdrop {
  display: none;
}

@media (max-width: 900px) {
  .chat {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    min-height: calc(100dvh / var(--ui-zoom) - var(--header-height) - 32px);
  }

  .sidebar {
    position: fixed;
    z-index: 30;
    top: 0;
    bottom: 0;
    left: 0;
    align-self: stretch; /* the desktop align-self: start would shrink the drawer to its content */
    width: 272px;
    padding: calc(20px + env(safe-area-inset-top)) 16px 20px;
    overflow-y: auto;
    background: var(--color-white);
    box-shadow: 4px 0 24px rgb(20 34 90 / 0.18);
    transform: translateX(-105%);
    visibility: hidden;
    transition: transform 0.2s ease, visibility 0.2s;
  }

  .sidebar--open {
    transform: none;
    visibility: visible;
  }

  .backdrop {
    position: fixed;
    z-index: 25;
    inset: 0;
    display: block;
    background: rgb(20 34 90 / 0.3);
  }

  .chat-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .bar-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 6px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-white);
    color: var(--color-navy);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .bar-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--color-navy);
    font-size: 15px;
    font-weight: 700;
  }
}

@media (max-width: 760px) {
  .cards {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  /* Keep the question box clear of the iPhone home bar. */
  .dock {
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
  }

  .user-bubble {
    max-width: 88%;
  }

  .starters {
    margin-top: 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }
}
</style>
