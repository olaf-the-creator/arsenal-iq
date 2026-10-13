<script setup>
import StatCard from './StatCard.vue'

// A titled grid of StatCards. Pass the stats a page uses (see services/glossary.js).
defineProps({
  // [{ term, definition }]
  items: { type: Array, required: true },
  title: { type: String, default: 'Cheat Sheet' },
})
</script>

<template>
  <section class="cheat-sheet" :aria-label="title">
    <h2>{{ title }}</h2>
    <div class="grid">
      <StatCard v-for="s in items" :key="s.term" :term="s.term" :definition="s.definition" />
    </div>
  </section>
</template>

<style scoped>
.cheat-sheet {
  margin-top: 96px;
}

/* Thin scarlet accent under the title spans the full content width, so it
   lines up with the table above and the card grid below. */
h2 {
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-scarlet);
  color: var(--color-navy);
  font-size: 2rem;
  font-weight: 700;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
  gap: 12px;
}
</style>
