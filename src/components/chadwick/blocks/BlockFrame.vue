<script setup>
// Card frame for Chadwick's visual blocks, matching the profile's chart cards:
// a header with a rule under it, then a padded body.
defineProps({
  title: { type: String, default: '' },
  sub: { type: String, default: '' },
})
</script>

<template>
  <section class="frame">
    <header v-if="title" class="head">
      <h3>{{ title }}</h3>
      <span v-if="sub" class="sub">{{ sub }}</span>
    </header>
    <div class="body"><slot /></div>
  </section>
</template>

<style scoped>
.frame {
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-white);
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border);
}

h3 {
  margin: 0;
  color: var(--color-navy);
  font-size: 15px;
  font-weight: 700;
}

.sub {
  color: var(--color-text-muted);
  font-size: 12px;
}

.body {
  padding: 16px 20px 18px;
}

@media (max-width: 520px) {
  .head,
  .body {
    padding-right: 14px;
    padding-left: 14px;
  }
}
</style>
