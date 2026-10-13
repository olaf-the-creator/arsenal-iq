<script setup>
// Career season lines (Savant): traditional results by year, current season
// highlighted. Real data only; model values for earlier seasons are synthetic
// and stay out of this table.
defineProps({
  // From fetchResultsHistory(): oldest first.
  seasons: { type: Array, required: true },
  current: { type: Number, required: true },
})

const fix = (v, d) => (v == null ? '–' : v.toFixed(d))
</script>

<template>
  <div class="season-line">
    <table>
      <thead>
        <tr>
          <th scope="col">Season</th>
          <th scope="col">W-L</th>
          <th scope="col">ERA</th>
          <th scope="col" title="Expected ERA from contact quality, strikeouts and walks">xERA</th>
          <th scope="col">FIP</th>
          <th scope="col">GS</th>
          <th scope="col">IP</th>
          <th scope="col">SO</th>
          <th scope="col">K%</th>
          <th scope="col">BB%</th>
          <th scope="col">WHIP</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in seasons" :key="s.season" :class="{ current: s.season === current }">
          <td>{{ s.season }}</td>
          <td>{{ s.w }}-{{ s.l }}</td>
          <td>{{ fix(s.era, 2) }}</td>
          <td>{{ fix(s.xera, 2) }}</td>
          <td>{{ fix(s.fip, 2) }}</td>
          <td>{{ s.gs }}</td>
          <td>{{ s.ip }}</td>
          <td>{{ s.so }}</td>
          <td>{{ fix(s.kPct, 1) }}</td>
          <td>{{ fix(s.bbPct, 1) }}</td>
          <td>{{ fix(s.whip, 2) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.season-line {
  max-width: 100%;
  overflow-x: auto;
}

table {
  border-collapse: collapse;
  font-size: 13px;
  white-space: nowrap;
}

th {
  padding: 6px 10px;
  background: var(--color-navy);
  color: var(--color-white);
  font-weight: 600;
  text-align: right;
}

td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--color-border);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

th:first-child,
td:first-child {
  text-align: left;
}

tr.current td {
  background: #fdf3f3;
  font-weight: 700;
}
</style>
