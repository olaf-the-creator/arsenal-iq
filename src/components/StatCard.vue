<script setup>
// One glossary card: a stat name and a short definition. Reusable anywhere a
// stat needs explaining (cheat sheets, profile pages, tooltips-as-cards).
defineProps({
  term: { type: String, required: true },
  definition: { type: String, required: true },
})
</script>

<template>
  <article class="stat-card">
    <h3 class="term">{{ term }}</h3>
    <p class="definition">{{ definition }}</p>
  </article>
</template>

<style scoped>
.stat-card {
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-card-bg);
}

.term {
  margin: 0 0 6px;
  color: var(--color-navy);
  font-size: 14px;
  font-weight: 700;
}

.definition {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}
</style>
