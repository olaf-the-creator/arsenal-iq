// Everything Chadwick's answers compute from, loaded once through the same
// services the Pitcher Profile uses, so the two pages always agree.
import { SEASON, inningsFromIp, fetchGameLog, fetchPitcher, fetchPitchers, fetchResultsHistory } from '../pitchers.js'
import { fetchLocationSummary } from '../locations.js'
import { fetchSyntheticModels } from '../synthetic.js'

// The demo answers questions about one pitcher (the profile's).
export const DEMO_PLAYER_ID = '27473'

let cache = null

/**
 * { pitcher, totalPitches, summary, seasons, starts, synthetic, roster }.
 * seasons merges each season's real results with its model values: real
 * FanGraphs values for this season, synthetic ones before it.
 */
export function loadChadwickContext() {
  cache ??= build()
  return cache
}

async function build() {
  const id = DEMO_PLAYER_ID
  const pitcher = await fetchPitcher(id)
  const [summary, results, log, synthetic, groups] = await Promise.all([
    fetchLocationSummary(pitcher),
    fetchResultsHistory(id),
    fetchGameLog(id),
    fetchSyntheticModels(id),
    fetchPitchers(),
  ])
  // Season pitch count: the sum of Savant's per-pitch counts, as on the profile.
  const totalPitches = pitcher.arsenal.reduce((n, p) => n + p.pitches, 0)

  const seasons = results.map((r) => {
    const current = r.season === SEASON
    const past = synthetic.season_history.find((h) => h.season === r.season)
    return {
      ...r,
      innings: inningsFromIp(r.ip),
      pitches: current ? totalPitches : past?.pitches ?? null,
      stuffPlus: current ? pitcher.stuffPlus : past?.stuff_plus ?? null,
      locationPlus: current ? pitcher.locationPlus : past?.location_plus ?? null,
      pitchingPlus: current ? pitcher.pitchingPlus : past?.pitching_plus ?? null,
      synthetic: !current,
    }
  })

  const startPlus = new Map(synthetic.start_pitching_plus.map((s) => [s.date, s.pitching_plus]))
  const starts = log.map((s) => ({ ...s, pitchingPlus: startPlus.get(s.date) ?? null }))

  const roster = groups.flatMap((g) => g.pitchers)
  return { pitcher, totalPitches, summary, seasons, starts, synthetic, roster }
}

