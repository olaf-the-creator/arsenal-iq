<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { BATTER_FILTERS, COUNT_FILTERS, locationView } from '../services/locations.js'
import { stableAt } from '../services/models.js'
import { SPAN, drawLocationMap } from '../utils/locationMap.js'

// Location+ map, catcher's view, filterable by pitch, count and batter hand.
// "Smoothed" is the answer to R&D's concern that raw heatmaps look
// splotchy; "Raw bins" shows the difference.
const props = defineProps({
  // Binned location summary from fetchLocationSummary() (real counts and
  // cells, synthetic values; services/locations.js), or null while loading.
  summary: { type: Object, default: null },
  // Arsenal rows, for the pitch chips and their season Location+.
  pitches: { type: Array, required: true },
  // Pitch type code, or 'ALL'.
  selected: { type: String, default: 'ALL' },
  // Pitcher's overall season Location+ (FanGraphs), shown for 'ALL'.
  seasonLocationPlus: { type: Number, default: null },
})
const emit = defineEmits(['select'])

// Location+ needs about 400 pitches to be reliable (primer; model registry).
const STABLE_AT = stableAt('location')

const mode = ref('smooth')
const countKey = ref('ALL')
const batterKey = ref('ALL')
const canvas = ref(null)
const CW = 360
const CH = 408

// The summary rolled up to the current pitch, count and batter hand.
const view = computed(() => locationView(props.summary, { type: props.selected, count: countKey.value, stand: batterKey.value }))
const filtered = computed(() => countKey.value !== 'ALL' || batterKey.value !== 'ALL')

// Real season Location+ for the current pitch (all counts and batters).
const seasonValue = computed(() =>
  props.selected === 'ALL' ? props.seasonLocationPlus : props.pitches.find((p) => p.type === props.selected)?.locationPlus ?? null,
)
function draw() {
  drawLocationMap(canvas.value, view.value, { width: CW, height: CH, mode: mode.value })
}

onMounted(draw)
watch([view, mode], draw)
</script>

<template>
  <div class="heatmap">
    <div class="toolbar">
      <div class="chips" role="group" aria-label="Pitch type">
        <button type="button" class="chip" :class="{ on: selected === 'ALL' }" @click="emit('select', 'ALL')">All</button>
        <button
          v-for="p in pitches"
          :key="p.type"
          type="button"
          class="chip"
          :class="{ on: selected === p.type }"
          @click="emit('select', p.type)"
        >
          <i :style="{ background: p.color }" />{{ p.savantType }}
        </button>
      </div>
      <div class="seg" role="group" aria-label="Display">
        <button type="button" :class="{ on: mode === 'smooth' }" @click="mode = 'smooth'">Smoothed</button>
        <button type="button" :class="{ on: mode === 'raw' }" @click="mode = 'raw'">Raw bins</button>
      </div>
    </div>
    <div class="filters">
      <div class="filter">
        <span class="filter-label">Count</span>
        <div class="seg" role="group" aria-label="Count">
          <button v-for="f in COUNT_FILTERS" :key="f.key" type="button" :class="{ on: countKey === f.key }" @click="countKey = f.key">{{ f.label }}</button>
        </div>
      </div>
      <div class="filter">
        <span class="filter-label" title="Display filter: Location+ doesn't use batter hand">Batter</span>
        <div class="seg" role="group" aria-label="Batter hand">
          <button v-for="f in BATTER_FILTERS" :key="f.key" type="button" :class="{ on: batterKey === f.key }" @click="batterKey = f.key">{{ f.label }}</button>
        </div>
      </div>
    </div>

    <div class="body">
      <canvas ref="canvas" :style="{ width: `${CW}px`, height: `${CH}px` }" role="img" aria-label="Location+ heatmap, catcher's view" />
      <div class="side">
        <div class="stat">
          <span class="k">Season Location+</span>
          <span class="v">{{ seasonValue == null ? '–' : Math.round(seasonValue) }}</span>
          <span v-if="filtered" class="sub">
            This view <b>{{ view.locationPlus == null ? '–' : Math.round(view.locationPlus) }}</b> <span class="muted">(illustrative)</span>
          </span>
        </div>
        <div class="stat">
          <span class="k">Pitches</span>
          <span class="v">{{ view.n.toLocaleString() }}</span>
          <span class="sub">
            <span class="pill" :class="view.n >= STABLE_AT ? 'pill--ok' : 'pill--warn'">{{ view.n >= STABLE_AT ? 'Stable sample' : `Below ~${STABLE_AT} pitches` }}</span>
          </span>
        </div>
        <p class="legend-title">Location+ where he throws it</p>
        <div class="legend" />
        <div class="legend-labels"><span>{{ 100 - SPAN }}</span><span>100</span><span>{{ 100 + SPAN }}</span></div>
        <p class="note">
          {{ mode === 'smooth' ? 'Kernel-smoothed (0.25 ft) and faded where he rarely throws, so sparse areas don’t read as signal.' : 'Hexagonal bins (about 0.25 ft across), averaged from the summary cells and weighted by pitches.' }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Pitch chips on the left, the display toggle on the right. */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  margin-bottom: 12px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-white);
  font-size: 12px;
  cursor: pointer;
}

.chip.on {
  border-color: var(--color-navy);
  background: #eef1fb;
  font-weight: 700;
}

.chip i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  margin-bottom: 18px;
}

.filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.seg {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.seg button {
  padding: 5px 10px;
  border: 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-white);
  font-size: 12px;
  cursor: pointer;
}

.seg button:last-child {
  border-right: 0;
}

.seg button.on {
  background: var(--color-navy);
  color: var(--color-white);
}

.body {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
}

canvas {
  flex: none;
  max-width: 100%;
  border-radius: 4px;
}

.side {
  flex: 1;
  min-width: 200px;
  font-size: 13px;
}

/* Bordered readouts, as in the author's mock. */
.stat {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.stat .k {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.stat .v {
  color: var(--color-navy);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.stat .sub {
  margin-top: 4px;
  font-size: 12px;
}

.stat .sub b {
  color: var(--color-navy);
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
  margin: 18px 0 0;
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

.note {
  margin: 12px 0 0;
  color: var(--color-text-muted);
  font-size: 11px;
  line-height: 1.5;
}

/* Phones: finger-sized filter buttons. */
@media (max-width: 640px) {
  .chip {
    padding: 8px 14px;
    font-size: 13px;
  }

  .seg button {
    padding: 9px 12px;
    font-size: 13px;
  }

  .filters {
    gap: 12px 16px;
  }
}
</style>
