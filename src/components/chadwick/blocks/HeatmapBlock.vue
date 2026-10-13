<script setup>
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { COUNT_FILTERS, BATTER_FILTERS, locationView } from '../../../services/locations.js'
import { loadChadwickContext } from '../../../services/chadwick/context.js'
import { PITCH_LOCATION_SD, stableAt } from '../../../services/models.js'
import { gradeColor, gradeTextColor, toGrade } from '../../../utils/grades.js'
import { SPAN, drawLocationMap } from '../../../utils/locationMap.js'
import BlockFrame from './BlockFrame.vue'

// The profile's Location+ map (same data roll-up and drawing), fixed to one
// slice: { filter: { pitch, count, hand } }.
const props = defineProps({
  block: { type: Object, required: true },
})
const CW = 300
const CH = 340
const canvas = ref(null)
const summary = shallowRef(null)
const STABLE_AT = stableAt('location')

const view = computed(() => {
  const f = props.block.filter
  return locationView(summary.value, { type: f.pitch, count: f.count ?? 'ALL', stand: f.hand ?? 'ALL' })
})
const grade = computed(() => toGrade(view.value.locationPlus, PITCH_LOCATION_SD))
const filterText = computed(() => {
  const f = props.block.filter
  return [COUNT_FILTERS.find((c) => c.key === (f.count ?? 'ALL'))?.label, BATTER_FILTERS.find((b) => b.key === (f.hand ?? 'ALL'))?.label].join(' · ')
})

function draw() {
  drawLocationMap(canvas.value, view.value, { width: CW, height: CH, mode: 'smooth' })
}

onMounted(async () => {
  summary.value = (await loadChadwickContext()).summary
})
watch(view, draw)
</script>

<template>
  <BlockFrame :title="block.title" :sub="block.sub">
    <div class="body">
      <canvas ref="canvas" :style="{ width: `${CW}px`, height: `${CH}px` }" role="img" :aria-label="`Location+ heatmap, catcher's view: ${block.title}`" />
      <div class="side">
        <div class="stat">
          <span class="k">Location+ this slice</span>
          <span class="v">
            {{ view.locationPlus == null ? '–' : Math.round(view.locationPlus) }}
            <span v-if="grade != null" class="gchip" :style="{ background: gradeColor(grade), color: gradeTextColor(grade) }">{{ grade }}</span>
          </span>
          <span class="sub muted">{{ filterText }} · illustrative</span>
        </div>
        <div class="stat">
          <span class="k">Pitches</span>
          <span class="v">{{ view.n.toLocaleString() }}</span>
          <span class="sub">
            <span class="pill" :class="view.n >= STABLE_AT ? 'pill--ok' : 'pill--warn'">{{ view.n >= STABLE_AT ? 'Stable sample' : `Below ~${STABLE_AT} pitches` }}</span>
          </span>
        </div>
        <p class="legend-title">Location+ where it’s thrown</p>
        <div class="legend" />
        <div class="legend-labels"><span>{{ 100 - SPAN }}</span><span>100</span><span>{{ 100 + SPAN }}</span></div>
      </div>
    </div>
  </BlockFrame>
</template>

<style scoped>
.body {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
  animation: fade 0.4s ease-out both;
}

canvas {
  flex: none;
  max-width: 100%;
  border-radius: 4px;
}

.side {
  flex: 1;
  min-width: 180px;
  font-size: 13px;
}

.stat {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.k {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.v {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-navy);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.sub {
  margin-top: 4px;
  font-size: 12px;
}

.muted {
  color: var(--color-text-muted);
}

.pill {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}

.pill--ok {
  background: #e7f6ec;
  color: #17803d;
}

.pill--warn {
  background: #fff4e0;
  color: #a35b00;
}

.legend-title {
  margin: 14px 0 0;
}

.legend {
  height: 10px;
  margin: 6px 0 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--color-navy), #dcdde3, var(--color-scarlet));
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  color: var(--color-text-muted);
  font-size: 10px;
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .body {
    animation: none;
  }
}
</style>
