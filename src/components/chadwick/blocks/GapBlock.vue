<script setup>
import BlockFrame from './BlockFrame.vue'
import { gradeColor, gradePercent } from '../../../utils/grades.js'

// Process-vs-results gap indicator: per row, a 20-80 track with the process
// grade (navy ring) and the results grade (scarlet dot) joined by a bar.
defineProps({
  block: { type: Object, required: true }, // { title, sub, rows: [{ label, process, results, gap, state, muted }] }
})
const TICKS = [20, 30, 40, 50, 60, 70, 80]
const STATE = {
  ahead: 'Results ahead of grade',
  behind: 'Results behind grade',
  inline: 'In line',
}
const span = (r) => {
  const a = gradePercent(r.process)
  const b = gradePercent(r.results)
  return { left: `${Math.min(a, b)}%`, width: `${Math.abs(a - b)}%` }
}
</script>

<template>
  <BlockFrame :title="block.title" :sub="block.sub">
    <ul class="rows">
      <li v-for="r in block.rows" :key="r.label" :class="{ muted: r.muted }">
        <div class="meta">
          <span class="season">{{ r.label }}</span>
          <span class="state" :class="`state--${r.state}`">
            {{ STATE[r.state] }}<template v-if="r.state !== 'inline'"> ({{ r.gap > 0 ? '+' : '−' }}{{ Math.abs(r.gap) }})</template>
          </span>
        </div>
        <div class="track">
          <span v-for="t in TICKS" :key="t" class="tick" :style="{ left: `${gradePercent(t)}%` }">{{ t }}</span>
          <div class="bar" :class="`bar--${r.state}`" :style="span(r)" />
          <div class="dot dot--process" :style="{ left: `${gradePercent(r.process)}%` }" :title="`Process ${r.process}`" />
          <div
            class="dot dot--results"
            :style="{ left: `${gradePercent(r.results)}%`, background: gradeColor(r.results) }"
            :title="`Results ${r.results}`"
          />
        </div>
      </li>
    </ul>
    <p class="legend">
      <span class="key key--process" /> Process (Pitching grade)
      <span class="key key--results" /> Results (ERA as a grade)
    </p>
  </BlockFrame>
</template>

<style scoped>
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  padding: 8px 0 22px;
}

li.muted {
  opacity: 0.55;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  margin-bottom: 10px;
  font-size: 13px;
}

.season {
  color: var(--color-navy);
  font-weight: 700;
}

.state {
  font-weight: 700;
}

.state--ahead {
  color: #17803d;
}

.state--behind {
  color: var(--color-scarlet);
}

.state--inline {
  color: var(--color-text-muted);
}

.track {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: var(--color-border);
}

.tick {
  position: absolute;
  top: 12px;
  transform: translateX(-50%);
  color: var(--color-text-muted);
  font-size: 10px;
}

.bar {
  position: absolute;
  top: 0;
  height: 6px;
  border-radius: 3px;
}

.bar--ahead {
  background: #17803d;
}

.bar--behind {
  background: var(--color-scarlet);
}

.bar--inline {
  background: var(--color-text-muted);
}

.dot {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.dot--process {
  border: 3px solid var(--color-navy);
  background: var(--color-white);
}

.dot--results {
  border: 2px solid var(--color-white);
  box-shadow: 0 0 0 1px var(--color-navy);
  width: 10px;
  height: 10px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin: 0;
  color: var(--color-text-muted);
  font-size: 12px;
}

.key {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-left: 8px;
  border-radius: 50%;
}

.key:first-child {
  margin-left: 0;
}

.key--process {
  border: 3px solid var(--color-navy);
  box-sizing: border-box;
}

.key--results {
  background: var(--color-scarlet);
}
</style>
