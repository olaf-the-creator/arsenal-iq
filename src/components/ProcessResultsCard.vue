<script setup>
import { computed } from 'vue'
import { modelERA } from '../services/synthetic.js'

// Process beside results (P-3): Pitching+ restated on the ERA scale next to the
// results that actually happened. Shows the numbers only; it draws no conclusion
// from the gap. Model ERA is illustrative until R&D supplies an
// expected-runs figure.
const props = defineProps({
  // Season Pitching+ (raw "+" scale).
  pitchingPlus: { type: Number, default: null },
  // { era, xera, fip }
  results: { type: Object, required: true },
})

const rows = computed(() =>
  [
    { key: 'model', label: 'Model ERA', value: props.pitchingPlus == null ? null : modelERA(props.pitchingPlus), tone: 'model', mark: '*' },
    { key: 'xera', label: 'xERA', value: props.results.xera, tone: 'expected' },
    { key: 'fip', label: 'FIP', value: props.results.fip, tone: 'expected' },
    { key: 'era', label: 'ERA', value: props.results.era, tone: 'actual' },
  ].filter((r) => r.value != null),
)

// Bars run from 2.00 to 5.00 ERA so differences stay visible.
const width = (v) => `${Math.min(100, Math.max(2, ((v - 2) / 3) * 100))}%`
</script>

<template>
  <article class="pvr">
    <h3 class="label">Process vs Results</h3>
    <p class="desc">Pitching+ on the ERA scale vs what happened</p>

    <div class="bars">
      <template v-for="r in rows" :key="r.key">
        <span class="row-label">{{ r.label }}<sup v-if="r.mark">{{ r.mark }}</sup></span>
        <span class="bar"><i :class="`tone--${r.tone}`" :style="{ width: width(r.value) }" /></span>
        <span class="val">{{ r.value.toFixed(2) }}</span>
      </template>
    </div>

    <p class="note"><sup>*</sup>Illustrative: a rescale of Pitching+ (100 = 4.00 ERA), pending an expected-runs figure from R&amp;D.</p>
  </article>
</template>

<style scoped>
.pvr {
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-card-bg);
}

.label {
  margin: 0;
  color: var(--color-navy);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.desc {
  margin: 2px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
}

.bars {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px 10px;
  margin: 18px 0 14px;
  font-size: 13px;
}

.row-label {
  color: var(--color-text-muted);
  font-weight: 600;
}

.bar {
  height: 12px;
  border-radius: 2px;
  background: #eceef2;
}

.bar i {
  display: block;
  height: 100%;
  border-radius: 2px;
}

.tone--model {
  background: var(--color-navy);
}

.tone--expected {
  background: #7a86b8;
}

.tone--actual {
  background: var(--color-scarlet);
}

.val {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.note {
  margin: auto 0 0;
  color: var(--color-text-muted);
  font-size: 11px;
}
</style>
