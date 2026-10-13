<script setup>
import BlockFrame from './BlockFrame.vue'

// Criteria with a met / partly met / not met / can't tell status.
defineProps({
  block: { type: Object, required: true }, // { title, items: [{ status, label, detail }] }
})
const STATUS = {
  met: { icon: '✓', text: 'Met' },
  partial: { icon: '◐', text: 'Partly' },
  unmet: { icon: '✕', text: 'Not met' },
  unknown: { icon: '?', text: 'Can’t tell yet' },
}
</script>

<template>
  <BlockFrame :title="block.title" :sub="block.sub">
    <ul class="list">
      <li v-for="it in block.items" :key="it.label">
        <span class="icon" :class="`icon--${it.status}`" aria-hidden="true">{{ STATUS[it.status].icon }}</span>
        <div>
          <p class="label">
            {{ it.label }}
            <span class="pill" :class="`pill--${it.status}`">{{ STATUS[it.status].text }}</span>
          </p>
          <p class="detail">{{ it.detail }}</p>
        </div>
      </li>
    </ul>
  </BlockFrame>
</template>

<style scoped>
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  gap: 12px;
  padding: 10px 0;
}

li + li {
  border-top: 1px solid var(--color-border);
}

.icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
}

.icon--met {
  background: #e7f6ec;
  color: #17803d;
}

.icon--partial {
  background: #fff4e0;
  color: #a35b00;
}

.icon--unmet {
  background: #fdf3f3;
  color: var(--color-scarlet);
}

.icon--unknown {
  background: var(--color-header-bg);
  color: var(--color-text-muted);
}

.label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 2px 0 2px;
  font-size: 14px;
  font-weight: 700;
}

.detail {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.pill {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}

.pill--met {
  background: #e7f6ec;
  color: #17803d;
}

.pill--partial {
  background: #fff4e0;
  color: #a35b00;
}

.pill--unmet {
  background: #fdf3f3;
  color: var(--color-scarlet);
}

.pill--unknown {
  background: var(--color-header-bg);
  color: var(--color-text-muted);
}
</style>
