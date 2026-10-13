<script setup>
// Trail for sub-pages, e.g. Arsenal IQ › Cade Cavalli. Every crumb but the
// last links back; the last is the current page.
defineProps({
  // [{ label, to? }]
  items: { type: Array, required: true },
})
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li v-for="(c, i) in items" :key="c.label">
        <RouterLink v-if="c.to && i < items.length - 1" :to="c.to">{{ c.label }}</RouterLink>
        <span v-else aria-current="page">{{ c.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
ol {
  display: flex;
  flex-wrap: wrap;
  margin: 0 0 24px;
  padding: 0;
  list-style: none;
  font-size: 13px;
  font-weight: 600;
}

li + li::before {
  content: '›';
  margin: 0 8px;
  color: var(--color-text-muted);
}

a {
  color: var(--color-navy);
  text-decoration: none;
}

a:hover,
a:focus-visible {
  color: var(--color-scarlet);
  text-decoration: underline;
}

[aria-current='page'] {
  color: var(--color-text-muted);
}
</style>
