<script setup>
import { computed } from 'vue'
import { gradeColor, gradeInkColor, gradePercent } from '../utils/grades.js'

// One model's 20-80 grade, its raw "+" value and its sample reliability.
const props = defineProps({
  label: { type: String, required: true },
  description: { type: String, default: '' },
  grade: { type: Number, default: null },
  // Raw model value on the "+" scale (100 = average).
  plus: { type: Number, default: null },
  plusLabel: { type: String, required: true },
  pitches: { type: Number, default: null },
  // Pitches needed before the grade is reliable (from the primer).
  stableAt: { type: Number, default: null },
  lead: { type: Boolean, default: false },
})

const TICKS = [20, 35, 50, 65, 80]
const stable = computed(() => props.pitches != null && props.stableAt != null && props.pitches >= props.stableAt)
</script>

<template>
  <article class="grade-card" :class="{ 'grade-card--lead': lead }">
    <h3 class="label">{{ label }}</h3>
    <p v-if="description" class="desc">{{ description }}</p>

    <div class="score">
      <span class="grade" :style="{ color: grade == null ? undefined : gradeInkColor(grade) }">{{ grade ?? '–' }}</span>
      <span class="plus">{{ plusLabel }} {{ plus == null ? '' : Math.round(plus) }}<br /><span class="muted">100 = avg</span></span>
    </div>

    <div v-if="grade != null" class="scale" aria-hidden="true">
      <div class="track" />
      <div class="mid" />
      <span v-for="t in TICKS" :key="t" class="tick" :style="{ left: `${gradePercent(t)}%` }">{{ t }}</span>
      <div class="dot" :style="{ left: `${gradePercent(grade)}%`, background: gradeColor(grade) }" />
    </div>

    <p v-if="stableAt != null" class="reliability">
      <span class="pill" :class="stable ? 'pill--ok' : 'pill--warn'">{{ stable ? 'Stable' : 'Not yet stable' }}</span>
      <span>{{ pitches?.toLocaleString() ?? '?' }} pitches · stable after ~{{ stableAt }}</span>
    </p>
    <slot />
  </article>
</template>

<style scoped>
.grade-card {
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-white);
}

/* Accent only: an inset bar keeps the lead card's size and layout identical. */
.grade-card--lead {
  border-color: var(--color-navy);
  box-shadow: inset 0 4px 0 var(--color-scarlet);
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

.score {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  margin: 12px 0 8px;
}

.grade {
  color: var(--color-navy);
  font-size: 56px;
  font-weight: 700;
  line-height: 0.9;
  font-variant-numeric: tabular-nums;
}

.plus {
  padding-bottom: 2px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.muted {
  color: var(--color-text-muted);
  font-weight: 400;
}

/* 20-80 track: navy (low) to grey (50) to scarlet (high). */
.scale {
  position: relative;
  height: 28px;
  margin-top: 4px;
}

.track {
  position: absolute;
  top: 8px;
  right: 0;
  left: 0;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--color-navy), #dcdde3 50%, var(--color-scarlet));
}

.mid {
  position: absolute;
  top: 3px;
  left: 50%;
  width: 1px;
  height: 14px;
  background: #8b90a0;
}

.tick {
  position: absolute;
  top: 16px;
  color: var(--color-text-muted);
  font-size: 10px;
  transform: translateX(-50%);
}

.dot {
  position: absolute;
  top: 2px;
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-white);
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.25);
  transform: translateX(-50%);
}

.reliability {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 12px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
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
</style>
