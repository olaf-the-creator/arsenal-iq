<script setup>
// Catch-all for unknown paths (the host returns index.html for any extensionless
// path under the base, so the router has to handle them).
</script>

<template>
  <section class="not-found">
    <h1>Page not found</h1>
    <p>That page doesn't exist in Arsenal IQ.</p>
    <RouterLink :to="{ name: 'arsenal-iq' }">Back to Arsenal IQ</RouterLink>
  </section>
</template>

<style scoped>
.not-found {
  padding: 48px 0;
}

p {
  margin: 8px 0 20px;
  color: var(--color-text-muted);
}

a {
  font-weight: 600;
}
</style>
