<script setup>
import { gradeColor, gradeTextColor } from '../../../utils/grades.js'
import BlockFrame from './BlockFrame.vue'

// A data table in the arsenal table's style. Columns: [{ key, label, align,
// type: 'grade' }]; grade cells render as 20-80 chips. highlightRow marks the
// recommended row.
defineProps({
  block: { type: Object, required: true }, // { title, sub, columns, rows, highlightRow }
})
</script>

<template>
  <BlockFrame :title="block.title" :sub="block.sub">
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th v-for="c in block.columns" :key="c.key" scope="col" :class="c.align">{{ c.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in block.rows" :key="i" :class="{ best: i === block.highlightRow }">
            <td v-for="c in block.columns" :key="c.key" :class="c.align">
              <span v-if="c.type === 'grade' && r[c.key] != null" class="gchip" :style="{ background: gradeColor(r[c.key]), color: gradeTextColor(r[c.key]) }">{{ r[c.key] }}</span>
              <template v-else>{{ r[c.key] }}</template>
              <span v-if="i === block.highlightRow && c === block.columns[0]" class="tag">Best</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </BlockFrame>
</template>

<style scoped>
.scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  padding: 6px 10px;
  border-bottom: 2px solid var(--color-navy);
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.right {
  text-align: right;
}

.center {
  text-align: center;
}

tr.best {
  background: #fdf3f3;
  box-shadow: inset 4px 0 0 var(--color-scarlet);
}

tr.best td:first-child {
  font-weight: 700;
}

.tag {
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--color-scarlet);
  color: var(--color-white);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
