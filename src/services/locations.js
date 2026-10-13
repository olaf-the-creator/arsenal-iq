// Location+ map data. Reads data/wsn_location_summary.json:
// binned aggregates per pitch type x batter hand x count, shaped like a backend
// response (no per-pitch rows). Pitch counts, cells and strike zones are REAL
// (Baseball Savant); the Location+ values are SYNTHETIC (model_version
// "synthetic-poc"), anchored to each pitch's real FanGraphs season Location+
// by scripts/build_location_summary.py. Swap point for R&D's grids.
import summaries from '../../data/wsn_location_summary.json'

// Plate half-width plus a ball's radius, and the plotted area, in feet,
// catcher's view (x: plate center, + = catcher's right).
export const ZONE_HALF_WIDTH = 0.83
export const DOMAIN = { x0: -1.75, x1: 1.75, z0: 0.5, z1: 4.5 }

// Count filters, Savant-style. "2 strikes" overlaps the other buckets.
export const COUNT_FILTERS = [
  { key: 'ALL', label: 'All', test: () => true },
  { key: 'AHEAD', label: 'Ahead', test: (b, s) => s > b },
  { key: 'EVEN', label: 'Even', test: (b, s) => b === s },
  { key: 'BEHIND', label: 'Behind', test: (b, s) => b > s },
  { key: 'TWO', label: '2 strikes', test: (b, s) => s === 2 },
]

// Batter-hand filter. A display filter only: the primer doesn't list
// handedness as a Location+ input (A-08), so it changes where he threw, not
// what each spot is worth.
export const BATTER_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'R', label: 'vs RHB' },
  { key: 'L', label: 'vs LHB' },
]

/**
 * The pitcher's location summary: { grid, partitions }, each partition tagged
 * with the arsenal's pitch `type`. Partitions whose Savant type isn't in the
 * arsenal are dropped. Async, like the API call it stands in for.
 */
export async function fetchLocationSummary(pitcher) {
  const summary = summaries.find((s) => s.pitcher === pitcher.mlbamId)
  if (!summary) return null
  const bySavant = new Map(pitcher.arsenal.map((p) => [p.savantType, p.type]))
  const partitions = summary.partitions
    .filter((p) => bySavant.has(p.pitch_type))
    .map((p) => ({ ...p, type: bySavant.get(p.pitch_type) }))
  return { grid: summary.grid, modelVersion: summary.model_version, partitions }
}

/**
 * Rolls the matching partitions up into one view: { n, szTop, szBot,
 * locationPlus, cells: [{ x, z, n, value }] } with cell centers in feet.
 * Means are pitch-weighted, so the roll-up is exact.
 */
export function locationView(summary, { type = 'ALL', count = 'ALL', stand = 'ALL' } = {}) {
  const empty = { n: 0, szTop: null, szBot: null, locationPlus: null, cells: [] }
  if (!summary) return empty
  const inCount = COUNT_FILTERS.find((f) => f.key === count).test
  const parts = summary.partitions.filter(
    (p) => (type === 'ALL' || p.type === type) && (stand === 'ALL' || p.stand === stand) && inCount(p.balls, p.strikes),
  )
  const n = parts.reduce((s, p) => s + p.n, 0)
  if (!n) return empty
  const wavg = (k) => parts.reduce((s, p) => s + p.n * p[k], 0) / n
  const { x0, z0, cell_ft: size } = summary.grid
  const cells = new Map()
  for (const p of parts) {
    for (const [i, j, cn, v] of p.cells) {
      const key = `${i},${j}`
      const c = cells.get(key) ?? { x: x0 + (i + 0.5) * size, z: z0 + (j + 0.5) * size, n: 0, sum: 0 }
      c.n += cn
      c.sum += cn * v
      cells.set(key, c)
    }
  }
  return {
    n,
    szTop: wavg('sz_top'),
    szBot: wavg('sz_bot'),
    locationPlus: wavg('location_plus'),
    cellSize: size,
    cells: [...cells.values()].map(({ x, z, n: cn, sum }) => ({ x, z, n: cn, value: sum / cn })),
  }
}
