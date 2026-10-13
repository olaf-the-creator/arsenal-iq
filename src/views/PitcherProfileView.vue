<script setup>
import { computed, ref, watch } from 'vue'
import AppBreadcrumbs from '../components/AppBreadcrumbs.vue'
import ArsenalTable from '../components/ArsenalTable.vue'
import GradeCard from '../components/GradeCard.vue'
import LocationHeatmap from '../components/LocationHeatmap.vue'
import MovementChart from '../components/MovementChart.vue'
import PersonIcon from '../components/PersonIcon.vue'
import ProcessResultsCard from '../components/ProcessResultsCard.vue'
import SeasonLine from '../components/SeasonLine.vue'
import StatsCheatSheet from '../components/StatsCheatSheet.vue'
import { SEASON, fetchPitcher, fetchResultsHistory, headshotUrl, teamLogoUrl } from '../services/pitchers.js'
import { CORE_MODELS, stableAt } from '../services/models.js'
import { fetchLocationSummary } from '../services/locations.js'
import { statDefinitions } from '../services/glossary.js'

// Pitcher Profile, top to bottom in decision order: who he is,
// the verdict (grades beside process vs results), the arsenal, then how each pitch moves
// and where it's located. Phase 2 asks are disabled tabs.
const props = defineProps({
  playerId: { type: String, required: true },
})

const pitcher = ref(null)
const history = ref([])
const loaded = ref(false)
const noPhoto = ref(false)
// Pitch picked in the arsenal (drives the movement chart and the map).
const selected = ref(null)
// The map can also show every pitch at once ('ALL').
const mapSelected = ref('ALL')
// Binned location summary: real counts and cells, synthetic values.
const locationSummary = ref(null)

watch(
  () => props.playerId,
  async (id) => {
    loaded.value = false
    noPhoto.value = false
    pitcher.value = await fetchPitcher(id)
    history.value = pitcher.value ? await fetchResultsHistory(id) : []
    locationSummary.value = pitcher.value ? await fetchLocationSummary(pitcher.value) : null
    selected.value = pitcher.value?.arsenal[0]?.type ?? null
    mapSelected.value = selected.value ?? 'ALL'
    loaded.value = true
  },
  { immediate: true },
)

function selectPitch(type) {
  selected.value = type
  mapSelected.value = type
}

function selectMap(type) {
  mapSelected.value = type
  if (type !== 'ALL') selected.value = type
}

const crumbs = computed(() => [
  { label: 'Arsenal IQ', to: { name: 'arsenal-iq' } },
  { label: pitcher.value?.name ?? 'Pitcher Profile' },
])

// Only Model Profile exists in v1; the others are Phase 2.
const SUBTABS = [
  { label: 'Model Profile' },
  { label: 'Pitch Optimizer', disabled: true, owner: 'Director of Pitching' },
  { label: 'Biomechanics', disabled: true, owner: 'Baseball Sciences' },
]

const ROLE_LABEL ={ Rotation: 'Starter', Bullpen: 'Reliever' }

// Season pitch count: the sum of Savant's per-pitch counts.
const totalPitches = computed(() => pitcher.value?.arsenal.reduce((n, p) => n + p.pitches, 0) || null)

const regraded = computed(() => pitcher.value?.arsenal.filter((p) => p.savantType !== p.type && p.savantType !== 'FF') ?? [])

const cheatSheet = statDefinitions(['modelGrades', 'pitchingPlus', 'stuffPlus', 'locationPlus', 'xera', 'fip', 'movement', 'whiff', 'xwoba'])
</script>

<template>
  <section class="page--wide profile">
    <AppBreadcrumbs :items="crumbs" />

    <template v-if="pitcher">
      <!-- Bio -->
      <header class="bio">
        <span class="avatar-wrap">
          <span class="avatar">
            <img v-if="pitcher.mlbamId && !noPhoto" :src="headshotUrl(pitcher.mlbamId)" alt="" width="96" height="96" @error="noPhoto = true" />
            <PersonIcon v-else :size="48" />
          </span>
          <span v-if="pitcher.number" class="number">#{{ pitcher.number }}</span>
        </span>
        <div class="bio-text">
          <h1 class="name">{{ pitcher.name }}</h1>
          <p class="pos">
            {{ pitcher.position }}
            <span class="sep">|</span>
            <img v-if="pitcher.team" :src="teamLogoUrl(pitcher.team)" alt="" width="18" height="18" />
            {{ pitcher.teamName ?? pitcher.team }}
          </p>
          <p class="meta">
            <span class="m">{{ ROLE_LABEL[pitcher.role] ?? pitcher.role }} ({{ pitcher.role }})</span>
            <span class="sep">|</span> <span class="m">Throws: {{ pitcher.hand }}</span>
            <span class="sep">|</span> <span class="m">{{ pitcher.height }} {{ pitcher.weight }} lbs</span>
            <span class="sep">|</span> <span class="m">Age: {{ pitcher.age }}</span>
          </p>
        </div>
        <SeasonLine v-if="history.length" class="season" :seasons="history" :current="SEASON" />
      </header>

      <!-- Profile views; deferred stakeholder asks are disabled tabs. -->
      <nav class="subtabs" aria-label="Profile views">
        <span v-for="t in SUBTABS" :key="t.label" class="subtab" :class="{ 'subtab--active': !t.disabled }"
          :aria-current="t.disabled ? undefined : 'page'" :aria-disabled="t.disabled || undefined"
          :title="t.disabled ? `Planned for Phase 2 (${t.owner})` : undefined">{{ t.label }}</span>
      </nav>

      <!-- Verdict: the three model grades (Pitching leads, from the model registry) beside results. -->
      <div class="section-head section-head--first">
        <h2 class="section-title">{{ pitcher.results?.season ?? 2026 }} Model Grades</h2>
        <span class="rule" aria-hidden="true" />
      </div>
      <div class="hero">
        <GradeCard
          v-for="(m, i) in CORE_MODELS"
          :key="m.key"
          :lead="i === 0"
          :label="m.label"
          :description="m.description"
          :grade="pitcher[m.gradeField]"
          :plus="pitcher[m.field]"
          :plus-label="m.label"
          :pitches="totalPitches"
          :stable-at="stableAt(m, pitcher.role)"
        />
        <ProcessResultsCard v-if="pitcher.results" :pitching-plus="pitcher.pitchingPlus" :results="pitcher.results" />
      </div>
      <p class="footnote">
        20-80 grades use FanGraphs spreads and stable points, pending internal model specs from R&amp;D.
      </p>

      <!-- Arsenal -->
      <div class="section-head">
        <h2 class="section-title">Pitch Arsenal</h2>
        <span class="rule" aria-hidden="true" />
      </div>
      <p class="hint">Select a pitch to focus the charts below</p>
      <ArsenalTable :pitches="pitcher.arsenal" :selected="selected" @select="selectPitch" />
      <p class="footnote">
        Stuff grades compare each pitch with the same pitch type (primer averages and spreads).
        <template v-for="p in regraded" :key="p.type">{{ p.name }} ({{ p.savantType }}) is graded as {{ p.type }}, the model's label for it. </template>
      </p>

      <!-- Movement and location -->
      <div class="pair">
        <section class="card">
          <header class="card-head">
            <h3>Movement Profile</h3>
            <span class="sub">Pitcher's view · dashed = 2025 · badge = Stuff grade</span>
          </header>
          <div class="card-body card-body--center">
            <MovementChart :pitches="pitcher.arsenal" :selected="selected" @select="selectPitch" />
          </div>
        </section>
        <section class="card">
          <header class="card-head">
            <h3>Location+ Map <span class="tag">Illustrative colors</span></h3>
            <span class="sub">Catcher's view · count-adjusted</span>
          </header>
          <div class="card-body">
            <LocationHeatmap
              :summary="locationSummary"
              :pitches="pitcher.arsenal"
              :selected="mapSelected"
              :season-location-plus="pitcher.locationPlus"
              @select="selectMap"
            />
            <p class="footnote">
              Pitch locations, counts, batter hands and season Location+ are real.
              The colors are synthetic values, binned in 0.25 ft cells and anchored to each pitch's season Location+, pending pre-computed grids from R&amp;D.
              Batter hand is a display filter: Location+ doesn't use it.
            </p>
          </div>
        </section>
      </div>

      <StatsCheatSheet :items="cheatSheet" />
    </template>

    <template v-else-if="loaded">
      <h1>Pitcher Profile</h1>
      <p class="muted">No profile for this pitcher yet. The POC includes Cade Cavalli only.</p>
    </template>
  </section>
</template>

<style scoped>
.bio {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  margin-bottom: 8px;
}

.avatar-wrap {
  position: relative;
  flex: none;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  overflow: hidden;
  border: 3px solid var(--color-navy);
  border-radius: 50%;
  color: var(--color-navy);
  background: var(--color-header-bg);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.number {
  position: absolute;
  right: -6px;
  bottom: 0;
  padding: 1px 7px;
  border: 2px solid var(--color-navy);
  border-radius: 12px;
  background: var(--color-white);
  color: var(--color-navy);
  font-size: 12px;
  font-weight: 700;
}

.name {
  margin: 0 0 4px;
}

.pos {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px;
  color: var(--color-scarlet);
  font-weight: 700;
}

.meta {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
}

.sep {
  margin: 0 6px;
  color: var(--color-border);
}

.pos .sep {
  margin: 0;
}

.subtabs {
  display: flex;
  gap: 4px;
  margin-top: 32px;
  border-bottom: 1px solid var(--color-border);
}

.subtab {
  margin-bottom: -1px;
  padding: 8px 14px;
  border-bottom: 3px solid transparent;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
}

.subtab--active {
  border-bottom-color: var(--color-scarlet);
  color: var(--color-navy);
  font-weight: 700;
}

.subtab[aria-disabled] {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Section title with a thin navy rule running to the right edge. */
.section-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 40px 0 16px;
}

.section-head--first {
  margin-top: 28px;
}

.section-title {
  margin: 0;
  color: var(--color-navy);
  font-size: 20px;
  font-weight: 700;
}

.rule {
  flex: 1;
  height: 1px;
  background: var(--color-navy);
}

.hint {
  margin: -6px 0 14px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.hero {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.15fr);
  gap: 24px;
}

.footnote {
  margin: 12px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
}

.pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  margin-top: 48px;
}

.card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--color-border);
}

.card-body {
  flex: 1;
  padding: 20px 24px 24px;
}

.card-body--center {
  display: flex;
  align-items: center;
}

.card-body .footnote {
  margin-top: 20px;
}

.card-head h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--color-navy);
  font-size: 16px;
  font-weight: 700;
}

.sub {
  color: var(--color-text-muted);
  font-size: 12px;
}

.tag {
  padding: 2px 6px;
  border-radius: 3px;
  background: #fff4e0;
  color: #a35b00;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.muted {
  color: var(--color-text-muted);
}

.bio-text {
  min-width: 0;
}

/* Season lines sit at the right of the bio, and wrap below it on narrow screens. */
.season {
  margin-left: auto;
}

@media (max-width: 1100px) {
  .season {
    flex-basis: 100%;
    margin-left: 0;
  }
}

@media (max-width: 1280px) {
  .pair {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .bio {
    gap: 16px;
  }

  .avatar {
    width: 76px;
    height: 76px;
  }

  .name {
    font-size: 28px;
    line-height: 1.1;
  }

  /* Bio facts wrap as separate items; the bars would dangle at line ends. */
  .meta .sep {
    display: none;
  }

  .meta .m {
    display: inline-block;
    margin-right: 12px;
  }

  .subtabs {
    margin-top: 24px;
    overflow-x: auto;
    scrollbar-width: none;
    white-space: nowrap;
  }

  .subtab {
    flex: none;
    padding: 12px 14px;
  }

  .section-head {
    margin-top: 32px;
  }

  .pair {
    gap: 20px;
    margin-top: 36px;
  }

  .card-head {
    padding: 12px 16px;
  }

  .card-body {
    padding: 16px;
  }
}
</style>
