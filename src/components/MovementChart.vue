<script setup>
import { computed } from 'vue'
import { gradeColor, gradeTextColor } from '../utils/grades.js'

// Average movement per pitch, pitcher's view (descriptive, P-4). Bubble size
// is usage, the badge is the Stuff grade, and dashed rings are last season.
const props = defineProps({
  pitches: { type: Array, required: true },
  selected: { type: String, default: null },
})
const emit = defineEmits(['select'])

const W = 440
const H = 440
const M = 36
const LO = -24
const HI = 24
const GRID = [-24, -18, -12, -6, 0, 6, 12, 18, 24]

const X = (v) => M + ((v - LO) / (HI - LO)) * (W - 2 * M)
const Y = (v) => H - M - ((v - LO) / (HI - LO)) * (H - 2 * M)

const points = computed(() =>
  props.pitches.map((p) => ({
    ...p,
    cx: X(p.hb),
    cy: Y(p.ivb),
    r: 10 + p.usage * 0.3,
    prev: p.ivbPrev == null || p.hbPrev == null ? null : { cx: X(p.hbPrev), cy: Y(p.ivbPrev) },
    dim: props.selected != null && props.selected !== p.type,
  })),
)
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="movement" role="img" aria-label="Average pitch movement, pitcher's view">
    <g v-for="v in GRID" :key="v">
      <line :x1="X(v)" :y1="Y(LO)" :x2="X(v)" :y2="Y(HI)" :class="v === 0 ? 'axis' : 'grid'" />
      <line :x1="X(LO)" :y1="Y(v)" :x2="X(HI)" :y2="Y(v)" :class="v === 0 ? 'axis' : 'grid'" />
      <text :x="X(v)" :y="H - M + 14" text-anchor="middle">{{ Math.abs(v) }}</text>
      <text :x="M - 6" :y="Y(v) + 3" text-anchor="end">{{ v }}</text>
    </g>
    <text :x="X(LO) + 4" :y="M - 10" class="side">← Arm side</text>
    <text :x="X(HI) - 4" :y="M - 10" class="side" text-anchor="end">Glove side →</text>
    <text :x="W / 2" :y="H - 4" text-anchor="middle">Horizontal break (in)</text>
    <text :transform="`translate(11 ${H / 2}) rotate(-90)`" text-anchor="middle">Induced vertical break (in)</text>

    <!-- Last season: dashed ring and a dashed path to this season. -->
    <g v-for="p in points" :key="`prev-${p.type}`" :opacity="p.dim ? 0.25 : 0.8">
      <template v-if="p.prev">
        <line :x1="p.prev.cx" :y1="p.prev.cy" :x2="p.cx" :y2="p.cy" :stroke="p.color" stroke-width="1.2" stroke-dasharray="3 2" />
        <circle :cx="p.prev.cx" :cy="p.prev.cy" r="6" fill="none" :stroke="p.color" stroke-width="1.4" stroke-dasharray="3 2" />
      </template>
    </g>

    <g
      v-for="p in points"
      :key="p.type"
      class="pitch"
      :opacity="p.dim ? 0.35 : 1"
      @click="emit('select', p.type)"
    >
      <title>{{ p.name }}: {{ p.velo }} mph, IVB {{ p.ivb }}″, HB {{ Math.abs(p.hb) }}″ {{ p.hb < 0 ? 'arm' : 'glove' }} side</title>
      <circle :cx="p.cx" :cy="p.cy" :r="p.r" :fill="p.color" :stroke="p.type === selected ? '#1b1f2a' : '#fff'" :stroke-width="p.type === selected ? 3 : 2" />
      <text :x="p.cx" :y="p.cy + 4" text-anchor="middle" class="code">{{ p.savantType }}</text>
      <template v-if="p.stuffGrade != null">
        <rect :x="p.cx + p.r + 2" :y="p.cy - 9" width="24" height="17" rx="3" :fill="gradeColor(p.stuffGrade)" />
        <text :x="p.cx + p.r + 14" :y="p.cy + 3.5" text-anchor="middle" class="badge" :style="{ fill: gradeTextColor(p.stuffGrade) }">
          {{ p.stuffGrade }}
        </text>
      </template>
    </g>
  </svg>
</template>

<style scoped>
.movement {
  display: block;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

text {
  fill: var(--color-text-muted);
  font-family: var(--font-sans);
  font-size: 10px;
}

.side {
  font-size: 11px;
}

.grid {
  stroke: #eceef2;
}

.axis {
  stroke: #9aa0ad;
}

.pitch {
  cursor: pointer;
}

.code {
  fill: #fff;
  font-size: 11px;
  font-weight: 700;
}

.badge {
  font-size: 10.5px;
  font-weight: 700;
}

/* The 440-unit viewBox renders at ~80% on a phone; scale labels back up. */
@media (max-width: 640px) {
  text {
    font-size: 12.5px;
  }

  .side {
    font-size: 13px;
  }

  .code {
    font-size: 13px;
  }

  .badge {
    font-size: 12.5px;
  }
}
</style>
