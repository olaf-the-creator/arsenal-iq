<script setup>
import { gradeColor, gradeTextColor } from '../utils/grades.js'
import { stableAt } from '../services/models.js'

// Per-pitch shape (Statcast), model grade and results. Clicking a row
// selects that pitch for the movement chart and location map.
defineProps({
  // Rows from fetchPitcher().arsenal, ordered by usage.
  pitches: { type: Array, required: true },
  selected: { type: String, default: null },
})
const emit = defineEmits(['select'])

// Primer: Stuff+ is reliable after about 80 pitches (model registry).
const STUFF_STABLE = stableAt('stuff')

const fix = (v, d) => (v == null ? '' : v.toFixed(d))
const fmtXwoba = (v) => (v == null ? '' : v.toFixed(3).replace(/^0/, ''))
const fmtRv = (v) => (v == null ? '' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`)
const rvClass = (v) => (v == null ? '' : v > 0 ? 'good' : v < 0 ? 'bad' : '')
const fmtHb = (v) => (v == null ? '' : `${Math.abs(v).toFixed(1)}″ ${v < 0 ? 'Arm' : 'Glv'}`)
</script>

<template>
  <div class="table-wrap">
    <table class="arsenal">
      <thead>
        <tr class="bands">
          <th colspan="3" />
          <th colspan="3" class="band">Shape</th>
          <th class="band band--model">Model</th>
          <th colspan="3" class="band">Results</th>
        </tr>
        <tr>
          <th scope="col">Pitch</th>
          <th scope="col" class="num">Use%</th>
          <th scope="col" class="num">#</th>
          <th scope="col" class="num sep">Velo</th>
          <th scope="col" class="num" title="Induced vertical break">IVB</th>
          <th scope="col" class="num" title="Horizontal break, pitcher's view">HB</th>
          <th scope="col" class="center sep">Stuff</th>
          <th scope="col" class="num sep">Whiff%</th>
          <th scope="col" class="num">xwOBA</th>
          <th scope="col" class="num" title="Run value per 100 pitches, from the pitcher's side: positive is good">RV/100</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="p in pitches"
          :key="p.type"
          :class="{ selected: p.type === selected }"
          tabindex="0"
          :aria-selected="p.type === selected"
          @click="emit('select', p.type)"
          @keydown.enter.space.prevent="emit('select', p.type)"
        >
          <td>
            <span class="dot" :style="{ background: p.color }" />
            <span class="name">{{ p.name }}</span>
            <span class="code">{{ p.savantType }}</span>
          </td>
          <td class="num">{{ fix(p.usage, 1) }}</td>
          <td class="num muted">{{ p.pitches }}</td>
          <td class="num sep">{{ fix(p.velo, 1) }}</td>
          <td class="num">{{ fix(p.ivb, 1) }}″</td>
          <td class="num">{{ fmtHb(p.hb) }}</td>
          <td class="center sep">
            <span
              v-if="p.stuffGrade != null"
              class="chip"
              :style="{ background: gradeColor(p.stuffGrade), color: gradeTextColor(p.stuffGrade) }"
              >{{ p.stuffGrade }}</span
            >
            <span class="chip-raw">{{ p.stuffPlus == null ? '' : `Stuff+ ${Math.round(p.stuffPlus)}` }}</span>
            <span v-if="p.pitches < STUFF_STABLE" class="small-n">small n</span>
          </td>
          <td class="num sep">{{ fix(p.whiff, 1) }}</td>
          <td class="num">{{ fmtXwoba(p.xwoba) }}</td>
          <td class="num" :class="rvClass(p.rv100)">{{ fmtRv(p.rv100) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
}

.arsenal {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

th {
  padding: 8px 12px;
  border-bottom: 2px solid var(--color-navy);
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.bands th {
  padding-bottom: 4px;
  border-bottom: none;
}

.band {
  border-bottom: 1px solid var(--color-border) !important;
  color: var(--color-navy);
  font-weight: 700;
  text-align: center;
}

.band--model {
  color: var(--color-scarlet);
}

td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

tbody tr {
  cursor: pointer;
}

tbody tr:hover {
  background: var(--color-row-hover);
}

tbody tr:focus-visible {
  outline: 2px solid var(--color-navy);
  outline-offset: -2px;
}

tr.selected {
  background: #fdf3f3;
  box-shadow: inset 4px 0 0 var(--color-scarlet);
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.center {
  text-align: center;
}

.sep {
  border-left: 1px solid var(--color-border);
}

.muted {
  color: var(--color-text-muted);
}

.good {
  color: #17803d;
}

.bad {
  color: #b42318;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 8px;
  border-radius: 50%;
}

.name {
  font-weight: 700;
}

.code {
  margin-left: 6px;
  color: var(--color-text-muted);
  font-size: 12px;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 26px;
  border-radius: 4px;
  font-weight: 700;
}

.chip-raw {
  display: block;
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: 11px;
}

.small-n {
  display: block;
  color: #a35b00;
  font-size: 10px;
}

/* Phones: tighter cells, and the pitch name stays put while the stats scroll. */
@media (max-width: 640px) {
  .arsenal {
    font-size: 14px;
  }

  th,
  td {
    padding-left: 8px;
    padding-right: 8px;
  }

  td {
    padding-top: 12px;
    padding-bottom: 12px;
  }

  tbody tr {
    background: var(--color-white);
  }

  tbody tr.selected {
    background: #fdf3f3;
  }

  th:first-child,
  td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    background: inherit;
  }

  thead th:first-child {
    background: var(--color-white);
  }

  td:first-child {
    box-shadow: 1px 0 0 var(--color-border);
  }

  tr.selected td:first-child {
    box-shadow: inset 4px 0 0 var(--color-scarlet), 1px 0 0 var(--color-border);
  }
}
</style>
