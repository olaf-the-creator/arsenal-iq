<script setup>
import { ref, watch } from 'vue'
import FilterBar from '../components/FilterBar.vue'
import PitcherTable from '../components/PitcherTable.vue'
import StatsCheatSheet from '../components/StatsCheatSheet.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import YearSelect from '../components/YearSelect.vue'
import { fetchPitchers } from '../services/pitchers.js'
import { statDefinitions } from '../services/glossary.js'

// The POC only has 2026 data; earlier seasons are listed but disabled.
const CURRENT_SEASON = 2026
const seasonOptions = Array.from({ length: 10 }, (_, i) => ({ value: CURRENT_SEASON - i, disabled: i > 0 }))
const season = ref(CURRENT_SEASON)

const filterOptions = [
  { value: 'team', label: 'Team' },
  { value: 'mlb', label: 'MLB', disabled: true },
  { value: 'milb', label: 'MiLB', disabled: true },
]

// Stats explained at the bottom of the page.
const cheatSheet = statDefinitions(['stuffPlus', 'locationPlus', 'pitchingPlus', 'grade', 'rank'])

const scope = ref('team')
const groups = ref([])
// Per-pitch Stuff+ columns; the page widens while they're shown.
const showPitches = ref(false)
// Blue-to-red heat map over the model cells.
const heatMap = ref(true)

watch(
  scope,
  async (value) => {
    groups.value = await fetchPitchers({ scope: value, team: 'WSN' })
  },
  { immediate: true },
)
</script>

<template>
  <section :class="{ 'page--wide': showPitches }">
    <h1 class="title">
      <span>Arsenal IQ</span>
      <YearSelect v-model="season" :options="seasonOptions" />
    </h1>
    <FilterBar v-model="scope" :options="filterOptions">
      <ToggleSwitch v-model="showPitches" label="Stuff+ by pitch" />
      <ToggleSwitch v-model="heatMap" label="Heat map" />
    </FilterBar>
    <PitcherTable :groups="groups" :show-pitches="showPitches" :heat-map="heatMap" />
    <StatsCheatSheet :items="cheatSheet" />
  </section>
</template>

<style scoped>
/* Same 35px space the old " | " separator left between title and year. */
.title {
  display: flex;
  align-items: center;
  gap: 35px;
}

@media (max-width: 640px) {
  .title {
    gap: 16px;
  }
}
</style>
