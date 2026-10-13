<script setup>
import { computed, useId } from 'vue'
import { gradeColor, gradeTextColor } from '../../../utils/grades.js'
import BlockFrame from './BlockFrame.vue'

// One generic SVG chart driven by a spec, styled like the profile's
// charts. Kinds:
//   bar      { categories, series: [{ name, color, values }], muted?: [bool],
//              axes: { y: { label, min, max } }, valueFormat: { decimals, sign } }
//   line     { categories, series: [{ name, color, values (null = gap), points }],
//              axes: { x: { label }, y: { label, format } },
//              annotations: [{ type: 'hline', y, label } | { type: 'vline', at, label }] }
//   scatter  { points: [{ x, y, label, color, r, badge, style: 'solid' | 'projected' | 'ref', title }],
//              arrows: [{ from: [x, y], to: [x, y] }], axes: { x: { min, max, label }, y: {…} } }
//   movement a scatter with pitch-movement axes (pitcher's view, inches).
const props = defineProps({
  block: { type: Object, required: true }, // { title, sub, spec }
})
const spec = computed(() => props.block.spec)
const markerId = `arrow-${useId()}`

const fmt = (v, f = {}) => {
  if (v == null) return ''
  const s = Math.abs(v).toFixed(f.decimals ?? 1)
  if (!f.sign || Number(s) === 0) return v < 0 && Number(s) !== 0 ? `−${s}` : s
  return `${v > 0 ? '+' : '−'}${s}`
}

// Round axis ticks: about `count` steps of 1, 2, 2.5 or 5 x 10^k.
function niceTicks(min, max, count = 5) {
  const raw = (max - min) / count || 1
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)
  const ticks = []
  for (let t = Math.ceil(min / step - 1e-9) * step; t <= max + 1e-9; t += step) ticks.push(Number(t.toFixed(6)))
  return { ticks, step }
}

// ---- Bar and line (category x axis) ----------------------------------------
const W = 640
const H = 280
const M = { l: 56, r: 20, t: 28, b: 40 }
const plotW = W - M.l - M.r
const plotH = H - M.t - M.b

const yDomain = computed(() => {
  const s = spec.value
  const vals = s.series.flatMap((x) => x.values).filter((v) => v != null)
  const marks = (s.annotations ?? []).filter((a) => a.type === 'hline').map((a) => a.y)
  let lo = Math.min(...vals, ...marks)
  let hi = Math.max(...vals, ...marks)
  if (s.kind === 'bar') {
    lo = Math.min(0, lo)
    hi = Math.max(0, hi)
  }
  const pad = (hi - lo) * (s.kind === 'bar' ? 0.12 : 0.08) || 1
  if (!(s.kind === 'bar' && lo === 0)) lo -= pad
  hi += pad
  const { step } = niceTicks(lo, hi, s.kind === 'line' ? 6 : 5)
  lo = s.axes?.y?.min ?? Math.floor(lo / step) * step
  hi = s.axes?.y?.max ?? Math.ceil(hi / step) * step
  return { lo, hi, ticks: niceTicks(lo, hi, s.kind === 'line' ? 6 : 5).ticks }
})
const Yc = (v) => M.t + ((yDomain.value.hi - v) / (yDomain.value.hi - yDomain.value.lo)) * plotH
const yFormat = computed(() => spec.value.axes?.y?.format ?? { decimals: yDomain.value.ticks.every(Number.isInteger) ? 0 : 1 })

const bars = computed(() => {
  const s = spec.value
  if (s.kind !== 'bar') return []
  const n = s.categories.length
  const band = plotW / n
  const group = band * (s.series.length > 1 ? 0.78 : 0.5)
  const bw = group / s.series.length
  const base = Yc(Math.max(yDomain.value.lo, 0))
  return s.categories.flatMap((cat, i) =>
    s.series.map((ser, j) => {
      const v = ser.values[i]
      if (v == null) return null
      const clipped = v > yDomain.value.hi
      const top = Yc(Math.min(v, yDomain.value.hi))
      const x = M.l + i * band + (band - group) / 2 + j * bw
      return {
        key: `${i}-${j}`,
        x: x + 1,
        w: Math.max(bw - 2, 2),
        y: Math.min(top, base),
        h: Math.max(Math.abs(base - top), 1),
        neg: v < 0,
        color: ser.color,
        muted: s.muted?.[i] ?? false,
        label: `${fmt(v, s.valueFormat)}${clipped ? ' ↑' : ''}`,
        labelY: v < 0 ? base + Math.abs(base - top) + 13 : top - 6,
        delay: (i * s.series.length + j) * 60,
        title: `${cat} · ${ser.name}: ${fmt(v, s.valueFormat)}`,
      }
    }),
  ).filter(Boolean)
})

const Xi = (i) => {
  const n = spec.value.categories.length
  if (spec.value.kind === 'bar') return M.l + (i + 0.5) * (plotW / n)
  return M.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
}
const xLabels = computed(() => {
  const cats = spec.value.categories ?? []
  const every = Math.ceil(cats.length / 12)
  return cats.map((c, i) => ({ c, i, show: i % every === 0, muted: spec.value.muted?.[i] ?? false }))
})

const lines = computed(() => {
  const s = spec.value
  if (s.kind !== 'line') return []
  return s.series.map((ser) => {
    let d = ''
    let pen = false
    const pts = []
    ser.values.forEach((v, i) => {
      if (v == null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${Xi(i).toFixed(1)},${Yc(v).toFixed(1)}`
      pen = true
      pts.push({ x: Xi(i), y: Yc(v), v, i })
    })
    return { ...ser, d, pts }
  })
})

const annotations = computed(() =>
  (spec.value.annotations ?? []).map((a) =>
    a.type === 'hline'
      ? { ...a, y1: Yc(a.y) }
      : { ...a, x1: M.l + ((a.at - 0) / Math.max(spec.value.categories.length - 1, 1)) * plotW },
  ),
)

// ---- Scatter and movement ---------------------------------------------------
const S = 420
const SM = { l: 44, r: 16, t: 30, b: 40 }
const sDomain = computed(() => {
  const a = spec.value.axes ?? {}
  const d = spec.value.kind === 'movement' ? { min: -24, max: 24 } : { min: 0, max: 1 }
  return { x: { ...d, ...a.x }, y: { ...d, ...a.y } }
})
const SX = (v) => SM.l + ((v - sDomain.value.x.min) / (sDomain.value.x.max - sDomain.value.x.min)) * (S - SM.l - SM.r)
const SY = (v) => S - SM.b - ((v - sDomain.value.y.min) / (sDomain.value.y.max - sDomain.value.y.min)) * (S - SM.t - SM.b)
const sTicks = computed(() => ({
  x: niceTicks(sDomain.value.x.min, sDomain.value.x.max, 6).ticks,
  y: niceTicks(sDomain.value.y.min, sDomain.value.y.max, 6).ticks,
}))
const isMovement = computed(() => spec.value.kind === 'movement')
const xTitle = computed(() => spec.value.axes?.x?.label ?? (isMovement.value ? 'Horizontal break (in)' : ''))
const yTitle = computed(() => spec.value.axes?.y?.label ?? (isMovement.value ? 'Induced vertical break (in)' : ''))
const points = computed(() => (spec.value.points ?? []).map((p, i) => ({ ...p, cx: SX(p.x), cy: SY(p.y), r: p.r ?? 12, delay: 150 + i * 120 })))
const arrows = computed(() =>
  (spec.value.arrows ?? []).map((a) => {
    // Stop short of the target circle so the head stays visible.
    const [x1, y1, x2, y2] = [SX(a.from[0]), SY(a.from[1]), SX(a.to[0]), SY(a.to[1])]
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    const cut = Math.min(14, len / 3)
    return { x1: x1 + ((x2 - x1) * cut) / len, y1: y1 + ((y2 - y1) * cut) / len, x2: x2 - ((x2 - x1) * cut) / len, y2: y2 - ((y2 - y1) * cut) / len }
  }),
)

const legend = computed(() => (spec.value.series?.length > 1 ? spec.value.series : []))
const ariaLabel = computed(() => props.block.title || 'Chart')
</script>

<template>
  <BlockFrame :title="block.title" :sub="block.sub">
    <div v-if="legend.length" class="legend">
      <span v-for="s in legend" :key="s.name"><i :style="{ background: s.color }" />{{ s.name }}</span>
    </div>

    <!-- Bar / line -->
    <div v-if="spec.kind === 'bar' || spec.kind === 'line'" class="scroll">
      <svg :viewBox="`0 0 ${W} ${H}`" class="chart" role="img" :aria-label="ariaLabel">
        <g v-for="t in yDomain.ticks" :key="`y${t}`">
          <line :x1="M.l" :x2="W - M.r" :y1="Yc(t)" :y2="Yc(t)" :class="t === 0 ? 'axis' : 'grid'" />
          <text :x="M.l - 8" :y="Yc(t) + 3" text-anchor="end">{{ fmt(t, yFormat) }}</text>
        </g>
        <text v-if="spec.axes?.y?.label" :transform="`translate(13 ${M.t + plotH / 2}) rotate(-90)`" text-anchor="middle">{{ spec.axes.y.label }}</text>
        <text v-if="spec.axes?.x?.label" :x="M.l + plotW / 2" :y="H - 4" text-anchor="middle">{{ spec.axes.x.label }}</text>
        <template v-for="l in xLabels" :key="`x${l.i}`">
          <text v-if="l.show" :x="Xi(l.i)" :y="H - M.b + 16" text-anchor="middle" :class="{ muted: l.muted }">{{ l.c }}</text>
        </template>

        <g v-for="a in annotations" :key="a.label">
          <template v-if="a.type === 'hline'">
            <line :x1="M.l" :x2="W - M.r" :y1="a.y1" :y2="a.y1" class="ref" />
            <text :x="W - M.r - 4" :y="a.y1 - 5" text-anchor="end" class="ref-label">{{ a.label }}</text>
          </template>
          <template v-else>
            <line :x1="a.x1" :x2="a.x1" :y1="M.t" :y2="M.t + plotH" class="event" />
            <text :x="a.x1 + 5" :y="M.t - 10" class="event-label" :text-anchor="a.x1 > W * 0.6 ? 'end' : 'start'">{{ a.label }}</text>
          </template>
        </g>

        <g v-for="b in bars" :key="b.key" :opacity="b.muted ? 0.32 : 1">
          <title>{{ b.title }}</title>
          <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="2" class="bar" :class="{ 'bar--neg': b.neg }" :style="{ fill: b.color, animationDelay: `${b.delay}ms` }" />
          <text :x="b.x + b.w / 2" :y="b.labelY" text-anchor="middle" class="value" :style="{ animationDelay: `${b.delay + 250}ms` }">{{ b.label }}</text>
        </g>

        <g v-for="l in lines" :key="l.name">
          <path :d="l.d" pathLength="1" class="line" :style="{ stroke: l.color }" />
          <template v-if="l.points">
            <circle v-for="p in l.pts" :key="p.i" :cx="p.x" :cy="p.y" r="3.5" class="pt" :style="{ fill: l.color }">
              <title>{{ l.name }} · {{ spec.categories[p.i] }}: {{ fmt(p.v, spec.axes?.y?.format ?? { decimals: 1 }) }}</title>
            </circle>
          </template>
        </g>
      </svg>
    </div>

    <!-- Scatter / movement -->
    <div v-else class="scroll scroll--square">
      <svg :viewBox="`0 0 ${S} ${S}`" class="chart chart--square" role="img" :aria-label="ariaLabel">
        <defs>
          <marker :id="markerId" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0L10,5L0,10z" class="arrow-head" />
          </marker>
        </defs>
        <g v-for="t in sTicks.x" :key="`sx${t}`">
          <line :x1="SX(t)" :x2="SX(t)" :y1="SM.t" :y2="S - SM.b" :class="t === 0 ? 'axis' : 'grid'" />
          <text :x="SX(t)" :y="S - SM.b + 14" text-anchor="middle">{{ isMovement ? Math.abs(t) : t }}</text>
        </g>
        <g v-for="t in sTicks.y" :key="`sy${t}`">
          <line :x1="SM.l" :x2="S - SM.r" :y1="SY(t)" :y2="SY(t)" :class="t === 0 ? 'axis' : 'grid'" />
          <text :x="SM.l - 6" :y="SY(t) + 3" text-anchor="end">{{ t }}</text>
        </g>
        <template v-if="isMovement">
          <text :x="SM.l + 4" :y="SM.t - 10" class="side">← Arm side</text>
          <text :x="S - SM.r - 4" :y="SM.t - 10" class="side" text-anchor="end">Glove side →</text>
        </template>
        <text :x="SM.l + (S - SM.l - SM.r) / 2" :y="S - 6" text-anchor="middle">{{ xTitle }}</text>
        <text :transform="`translate(11 ${SM.t + (S - SM.t - SM.b) / 2}) rotate(-90)`" text-anchor="middle">{{ yTitle }}</text>

        <line v-for="(a, i) in arrows" :key="`a${i}`" :x1="a.x1" :y1="a.y1" :x2="a.x2" :y2="a.y2" class="arrow" :marker-end="`url(#${markerId})`" />

        <g v-for="(p, i) in points" :key="`p${i}`" class="spt" :style="{ animationDelay: `${p.delay}ms` }">
          <title>{{ p.title ?? p.label }}</title>
          <template v-if="p.style === 'ref'">
            <circle :cx="p.cx" :cy="p.cy" r="7" class="ref-pt" />
            <text :x="p.labelSide === 'left' ? p.cx - 11 : p.cx + 11" :y="p.cy + 4" class="ref-text" :text-anchor="p.labelSide === 'left' ? 'end' : 'start'">{{ p.label }}</text>
          </template>
          <template v-else>
            <circle
              :cx="p.cx"
              :cy="p.cy"
              :r="p.r"
              :style="{ fill: p.color }"
              :class="p.style === 'projected' ? 'proj-pt' : 'solid-pt'"
            />
            <text v-if="p.label" :x="p.cx" :y="p.cy + 4" text-anchor="middle" class="code">{{ p.label }}</text>
            <template v-if="p.badge != null">
              <rect :x="p.cx + p.r + 3" :y="p.cy - 9" width="24" height="17" rx="3" :style="{ fill: gradeColor(p.badge) }" />
              <text :x="p.cx + p.r + 15" :y="p.cy + 3.5" text-anchor="middle" class="badge" :style="{ fill: gradeTextColor(p.badge) }">{{ p.badge }}</text>
            </template>
          </template>
        </g>
      </svg>
    </div>
  </BlockFrame>
</template>

<style scoped>
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-bottom: 8px;
  color: var(--color-text-muted);
  font-size: 12px;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend i {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

/* Charts scroll inside their own box on narrow screens. */
.scroll {
  overflow-x: auto;
}

.chart {
  display: block;
  width: 100%;
  min-width: 480px;
}

.chart--square {
  max-width: 440px;
  min-width: 300px;
  margin: 0 auto;
}

text {
  fill: var(--color-text-muted);
  font-family: var(--font-sans);
  font-size: 11px;
}

text.muted {
  fill: #b4b8c2;
}

.grid {
  stroke: #eceef2;
}

.axis {
  stroke: #9aa0ad;
}

.ref {
  stroke: #9aa0ad;
  stroke-dasharray: 2 3;
}

.ref-label {
  font-size: 10px;
}

.event {
  stroke: var(--color-scarlet);
  stroke-dasharray: 4 3;
}

.event-label {
  fill: var(--color-scarlet);
  font-size: 10.5px;
}

.value {
  fill: var(--color-text);
  font-size: 11px;
  font-weight: 700;
  animation: fade 0.3s ease-out both;
}

.bar {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: grow 0.55s cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

.bar--neg {
  transform-origin: 50% 0;
}

.line {
  fill: none;
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  animation: draw 0.9s ease-out both;
}

.pt {
  stroke: #fff;
  stroke-width: 1.5;
  animation: fade 0.3s 0.6s ease-out both;
}

.side {
  font-size: 11px;
}

.spt {
  animation: fade 0.35s ease-out both;
}

.solid-pt {
  stroke: #fff;
  stroke-width: 2;
}

.proj-pt {
  fill-opacity: 0.25;
  stroke: #1b1f2a;
  stroke-width: 1.5;
  stroke-dasharray: 4 2;
}

.ref-pt {
  fill: #fff;
  stroke: #6b7280;
  stroke-width: 1.5;
}

.ref-text {
  fill: var(--color-text);
  font-size: 11px;
  font-weight: 600;
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

.arrow {
  stroke: #1b1f2a;
  stroke-width: 1.5;
  animation: fade 0.3s 0.3s ease-out both;
}

.arrow-head {
  fill: #1b1f2a;
}

@keyframes grow {
  from {
    transform: scaleY(0);
  }
}

@keyframes draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar,
  .line,
  .pt,
  .spt,
  .value,
  .arrow {
    animation: none;
  }
}
</style>
