<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { aboutLabel } from '../services/userGuide.js'
import curlyW from '../assets/curly-w.svg'
import InfoIcon from './InfoIcon.vue'
import PersonIcon from './PersonIcon.vue'
import PlayerSearch from './PlayerSearch.vue'

defineEmits(['open-guide'])

const tabs = [
  { key: 'arsenal-iq', to: { name: 'arsenal-iq' }, label: 'Arsenal IQ' },
  { key: 'chadwick', to: { name: 'chadwick' }, label: 'Chadwick' },
  { key: 'credits', to: { name: 'credits' }, label: 'Credits' },
]

// A tab is active on its own route and on its sub-pages (route meta.tab).
const route = useRoute()
const aboutText = computed(() => aboutLabel(route.name))
const isActive = (tab) => route.meta.tab === tab.key
</script>

<template>
  <header class="app-header">
    <RouterLink :to="{ name: 'arsenal-iq' }" class="logo" aria-label="Arsenal IQ home">
      <img :src="curlyW" alt="" width="48" height="48" />
    </RouterLink>

    <nav class="tabs" aria-label="Primary">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.label"
        :to="tab.to"
        class="tab"
        :class="{ 'tab--active': isActive(tab) }"
        :aria-current="isActive(tab) ? 'page' : undefined"
      >
        {{ tab.label }}
      </RouterLink>
    </nav>

    <PlayerSearch />

    <!-- Pill with the page name on wide screens; a plain "i" in a circle on phones. -->
    <button type="button" class="user info" :aria-label="`Open user guide: ${aboutText}`" :title="aboutText" @click="$emit('open-guide')">
      <span class="info-text">{{ aboutText }}</span>
      <InfoIcon class="info-icon" :size="24" />
    </button>

    <!-- User menu is out of scope for the POC; the icon is a placeholder. -->
    <button type="button" class="user" aria-label="User menu" title="User menu (not in POC)">
      <PersonIcon :size="26" />
    </button>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 24px;
  height: var(--header-height);
  padding: 0 24px;
  background: var(--color-scarlet);
  color: var(--color-white);
  box-shadow: 0 3px 12px rgb(0 0 0 / 0.26);
}

.logo {
  display: flex;
}

.tabs {
  display: flex;
  align-self: stretch;
  gap: 8px;
}

.tab {
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 3px solid transparent;
  border-top: 3px solid transparent;
  color: rgb(255 255 255 / 0.8);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
}

.tab:hover {
  color: var(--color-white);
}

.tab--active {
  color: var(--color-white);
  border-bottom-color: var(--color-white);
}

/* Roundel like the player placeholder in PitcherTable, outlined in white for the scarlet bar. */
.user {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 2px solid var(--color-white);
  border-radius: 50%;
  background: transparent;
  color: var(--color-white);
  cursor: default;
}

/* The first button pushes both to the right; the gap sits between them. */
.info {
  width: auto;
  min-width: 42px;
  padding: 0 18px;
  border-radius: 21px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  cursor: pointer;
}

.info-icon {
  display: none;
}

.info:hover {
  background: rgb(255 255 255 / 0.18);
}

.info:focus-visible {
  outline: 2px solid var(--color-white);
  outline-offset: 2px;
}

/* Narrow tablets: tighter spacing so the tabs and the pill share one row. */
@media (min-width: 641px) and (max-width: 899px) {
  .app-header {
    gap: 12px;
    padding: 0 16px;
  }

  .tab {
    padding: 0 8px;
    font-size: 14px;
  }

  .info {
    padding: 0 14px;
    font-size: 13px;
  }
}

/* Phones: tighter bar so all three tabs fit without page scroll. */
@media (max-width: 640px) {
  .app-header {
    gap: 4px;
    padding: 0 8px;
  }

  .logo img {
    width: 28px;
    height: 28px;
  }

  .tabs {
    gap: 0;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tab {
    padding: 0 4px;
    font-size: 11px;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .user {
    flex: none;
    width: 30px;
    height: 30px;
  }

  .user svg {
    width: 20px;
    height: 20px;
  }

  .info {
    width: 30px;
    min-width: 0;
    padding: 0;
    border-radius: 50%;
  }

  .info-text {
    display: none;
  }

  .info-icon {
    display: block;
  }
}
</style>
