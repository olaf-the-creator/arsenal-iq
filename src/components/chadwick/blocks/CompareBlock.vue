<script setup>
import { gradeColor, gradeTextColor } from '../../../utils/grades.js'
import BlockFrame from './BlockFrame.vue'

// Side-by-side cards, one per item, with the better value of each stat marked.
defineProps({
  // { title, sub, items: [{ name, code, color, stats: [{ label, value, grade, best, muted }] }] }
  block: { type: Object, required: true },
})
</script>

<template>
  <BlockFrame :title="block.title" :sub="block.sub">
    <div class="grid">
      <article v-for="it in block.items" :key="it.name" class="item">
        <h4><i :style="{ background: it.color }" />{{ it.name }} <span class="code">{{ it.code }}</span></h4>
        <dl>
          <div v-for="s in it.stats" :key="s.label" :class="{ best: s.best }">
            <dt>{{ s.label }}</dt>
            <dd :class="{ muted: s.muted }">
              <span v-if="s.grade != null" class="gchip" :style="{ background: gradeColor(s.grade), color: gradeTextColor(s.grade) }">{{ s.grade }}</span>
              <span :class="{ raw: s.grade != null }">{{ s.value }}</span>
            </dd>
          </div>
        </dl>
      </article>
    </div>
  </BlockFrame>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: 16px;
}

.item {
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-card-bg);
}

h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  color: var(--color-navy);
  font-size: 15px;
  font-weight: 700;
}

h4 i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.code {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}

dl {
  margin: 0;
}

dl div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-top: 1px solid var(--color-border);
}

dt {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

dd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.raw {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 400;
}

.muted {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 400;
}

.best dd {
  color: var(--color-scarlet);
}

.best dd::after {
  content: '▲';
  font-size: 9px;
}
</style>
