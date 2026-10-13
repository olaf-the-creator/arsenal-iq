<script setup>
// Header player search. Desktop: an inline input with a dropdown.
// Phones (<= 640px): a magnifier button that takes over the header bar.
// Only pitchers with a profile can be opened; the rest show dimmed (the POC has
// Cade Cavalli's profile only). Matching lives in services/pitchers.js.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { headshotUrl, searchPitchers } from '../services/pitchers.js'
import PersonIcon from './PersonIcon.vue'
import SearchIcon from './SearchIcon.vue'

const router = useRouter()
const route = useRoute()

const root = ref(null)
const input = ref(null)
const query = ref('')
const results = ref([])
const active = ref(-1) // highlighted row
const open = ref(false) // dropdown
const expanded = ref(false) // phone: search takes over the header
const noPhoto = ref(new Set())

const listId = 'player-search-list'
const showList = computed(() => open.value && query.value.trim() !== '')

let seq = 0 // drops out-of-order async results
watch(query, async (q) => {
  const mine = ++seq
  const found = await searchPitchers(q)
  if (mine !== seq) return
  results.value = found
  // Start on the first row you can open.
  active.value = found.findIndex((r) => r.hasProfile)
})

function close() {
  open.value = false
  expanded.value = false
}

async function expand() {
  expanded.value = true
  open.value = true
  await nextTick()
  input.value?.focus()
}

function choose(r) {
  if (!r?.hasProfile) return
  router.push({ name: 'pitcher-profile', params: { playerId: r.playerId } })
  query.value = ''
  results.value = []
  input.value?.blur()
  close()
}

// Arrow keys skip rows that can't be opened.
function move(step) {
  const n = results.value.length
  for (let i = 1; i <= n; i++) {
    const idx = (active.value + step * i + n * i) % n
    if (results.value[idx].hasProfile) {
      active.value = idx
      return
    }
  }
}

function onKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    open.value = true
    move(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    move(-1)
  } else if (e.key === 'Enter') {
    choose(results.value[active.value])
  } else if (e.key === 'Escape') {
    if (query.value) query.value = ''
    else {
      close()
      input.value?.blur()
    }
  }
}

const onOutside = (e) => {
  if (root.value && !root.value.contains(e.target)) close()
}
onMounted(() => document.addEventListener('pointerdown', onOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside))
watch(() => route.fullPath, close)

const meta = (r) => [r.position, r.role, r.number ? `#${r.number}` : null].filter(Boolean).join(' · ')
</script>

<template>
  <div ref="root" class="search" :class="{ 'search--expanded': expanded }">
    <button type="button" class="trigger" aria-label="Search players" @click="expand">
      <SearchIcon :size="20" />
    </button>

    <div class="field" role="search">
      <SearchIcon class="field-icon" :size="18" />
      <input
        ref="input"
        v-model="query"
        type="search"
        role="combobox"
        placeholder="Search players..."
        aria-label="Search players"
        aria-autocomplete="list"
        :aria-expanded="showList"
        :aria-controls="listId"
        :aria-activedescendant="active >= 0 ? `${listId}-${active}` : undefined"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="go"
        @focus="open = true"
        @keydown="onKeydown"
      />
      <button type="button" class="close" aria-label="Close search" @click="close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>

    <ul v-if="showList" :id="listId" class="results" role="listbox" aria-label="Players">
      <li
        v-for="(r, i) in results"
        :id="`${listId}-${i}`"
        :key="r.playerId"
        class="result"
        :class="{ 'result--active': i === active, 'result--off': !r.hasProfile }"
        role="option"
        :aria-selected="i === active"
        :aria-disabled="!r.hasProfile"
        @click="choose(r)"
        @mousemove="r.hasProfile && (active = i)"
      >
        <span class="photo">
          <img v-if="!noPhoto.has(r.playerId)" :src="headshotUrl(r.mlbamId)" alt="" loading="lazy" @error="noPhoto.add(r.playerId)" />
          <PersonIcon v-else :size="22" />
        </span>
        <span class="who">
          <span class="name">{{ r.name }}</span>
          <span class="meta">{{ meta(r) }}</span>
        </span>
        <span v-if="!r.hasProfile" class="tag">Profile not in POC</span>
      </li>
      <li v-if="!results.length" class="empty" role="presentation">No pitchers match “{{ query.trim() }}”.</li>
    </ul>
  </div>
</template>

<style scoped>
.search {
  position: relative;
  margin-left: auto; /* pushes search, About and user to the right */
  color: var(--color-white);
}

.trigger,
.close {
  display: none;
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 260px;
  height: 42px;
  padding: 0 14px;
  border: 2px solid rgb(255 255 255 / 0.7);
  border-radius: 21px;
  transition: background 0.15s, border-color 0.15s;
}

.field:hover,
.field:focus-within {
  border-color: var(--color-white);
}

.field:focus-within {
  background: rgb(255 255 255 / 0.14);
}

.field-icon {
  flex: none;
  opacity: 0.85;
}

input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-white);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  appearance: none;
}

input::placeholder {
  color: rgb(255 255 255 / 0.62);
  font-weight: 400;
}

input::-webkit-search-cancel-button {
  display: none;
}

.results {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-height: 70vh;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  list-style: none;
  border-radius: 10px;
  background: var(--color-white);
  color: var(--color-text);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.28);
}

.result {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.result--active {
  background: var(--color-row-hover);
  box-shadow: inset 3px 0 0 var(--color-scarlet);
}

.result--off {
  cursor: default;
  opacity: 0.55;
}

.photo {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  overflow: hidden;
  border: 1.5px solid var(--color-navy);
  border-radius: 50%;
  background: var(--color-card-bg);
  color: var(--color-navy);
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.who {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-navy);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  font-size: 12px;
  color: var(--color-text-muted);
}

.tag {
  flex: none;
  padding: 2px 8px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.empty {
  padding: 14px 10px;
  font-size: 14px;
  color: var(--color-text-muted);
}

/* Narrow tablets: a slimmer input so tabs, search and About share one row. */
@media (min-width: 641px) and (max-width: 899px) {
  .field {
    width: 190px;
  }
}

/* Phones: a magnifier button; opened, the search covers the whole header bar. */
@media (max-width: 640px) {
  .search {
    position: static; /* the header is the positioning context */
  }

  .trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 2px solid var(--color-white);
    border-radius: 50%;
    background: transparent;
    color: var(--color-white);
    cursor: pointer;
  }

  .field {
    display: none;
  }

  .search--expanded .trigger {
    display: none;
  }

  .search--expanded .field {
    display: flex;
    position: absolute;
    inset: 0;
    z-index: 1;
    width: auto;
    height: auto;
    gap: 10px;
    padding: 0 6px 0 16px;
    border: 0;
    border-radius: 0;
    background: var(--color-scarlet);
  }

  .search--expanded .field:focus-within {
    background: var(--color-scarlet);
  }

  .search--expanded input {
    font-size: 16px; /* 16px stops iOS Safari zooming on focus */
  }

  .close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 44px;
    height: 44px;
    border: 0;
    background: transparent;
    color: var(--color-white);
    cursor: pointer;
  }

  .results {
    position: fixed;
    top: var(--header-height);
    right: 0;
    left: 0;
    width: auto;
    max-height: calc(100dvh - var(--header-height));
    border-radius: 0 0 12px 12px;
    padding: 6px 8px 12px;
  }

  .result {
    min-height: 56px;
  }

  .tag {
    max-width: 96px;
    text-align: center;
    line-height: 1.2;
  }
}
</style>
