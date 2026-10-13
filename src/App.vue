<script setup>
import { ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import UserGuideDrawer from './components/UserGuideDrawer.vue'

const guideOpen = ref(false)
</script>

<template>
  <AppHeader @open-guide="guideOpen = true" />
  <UserGuideDrawer v-model="guideOpen" />
  <main class="page">
    <RouterView />
  </main>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  overflow-x: clip; /* one wide child can't widen the whole page */
  transition: max-width 0.2s ease;
}

/* A view can ask for more room (e.g. expanded table columns). */
.page:has(.page--wide) {
  max-width: 1640px;
}

/* A view with its own sticky footer (Chadwick's question box) ends flush. */
.page:has(.page--flush) {
  padding-bottom: 0;
}

@media (max-width: 560px) {
  .page {
    padding: 20px 16px 48px;
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
  }
}
</style>
