<script setup>
defineProps({
  options: { type: Array, required: true }, // [{ value, label, disabled }]
})
const model = defineModel({ type: String, required: true })
</script>

<template>
  <div class="filter-bar">
    <div class="filters" role="tablist" aria-label="Pitcher filter">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        role="tab"
        class="filter"
        :class="{ 'filter--active': model === opt.value }"
        :aria-selected="model === opt.value"
        :disabled="opt.disabled"
        :title="opt.disabled ? 'Not available in the POC' : undefined"
        @click="model = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>
    <!-- Right-aligned view controls (e.g. table toggles), not filters. -->
    <div v-if="$slots.default" class="actions"><slot /></div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.filters {
  display: flex;
  gap: 24px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-left: auto;
}

.filter {
  padding: 8px 4px;
  margin-bottom: -1px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--color-text-muted);
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
}

.filter--active {
  color: var(--color-navy);
  border-bottom-color: var(--color-scarlet);
}

.filter:disabled {
  color: #c4c8d0;
  cursor: not-allowed;
}

/* Phones: tabs on one row, the view switches on a row of their own. */
@media (max-width: 640px) {
  .filter-bar {
    flex-wrap: wrap;
  }

  .filters {
    gap: 16px;
  }

  .filter {
    padding: 10px 4px;
    font-size: 17px;
  }

  .actions {
    flex: 1 0 100%;
    gap: 20px;
    margin-left: 0;
    padding: 8px 0 10px;
    border-top: 1px solid var(--color-border);
  }
}
</style>
