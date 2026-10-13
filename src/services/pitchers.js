// Pitcher data access for the POC. Views call these functions only, so the
// local JSON files in poc/data/ (API-shaped records) can later be swapped for
// a Rails API without
// touching the UI. Model values are FanGraphs' raw "+" scale (100 = average);
// Grade (Pitching 20-80), Rank, Stuff Grade, Location Grade and per-pitch
// Stf Grade columns are derived by scripts/add_pitching_grades.py.
import statsRecords from '../../data/wsn_fg_stuffplus.json'
import rosterRecords from '../../data/wsn_mlb_pitchers.json'
// Season results and per-pitch Statcast metrics (Baseball Savant). Profile
// pages only; Cavalli's rows are transcribed from the author's mock.
import resultsRecords from '../../data/wsn_savant_results.json'
import arsenalRecords from '../../data/wsn_savant_arsenal.json'
// Start-by-start game log, transcribed from the same mock (Chadwick).
import gameLogRecords from '../../data/wsn_savant_gamelog.json'
// FanGraphs season Location+ by pitch type.
import locationRecords from '../../data/wsn_fg_locationplus.json'

// Pitch-type columns in the FanGraphs export (FA = four-seam fastball).
export const PITCH_TYPES = ['FA', 'SI', 'FC', 'FS', 'SL', 'CU', 'CH', 'KC', 'FO']

// Expandable per-pitch Stuff+ columns, in design-doc order (stretch goal). The
// doc labels the four-seamer FF (data: FA) and omits FO (forkball).
export const PITCH_COLUMNS = [
  { key: 'FA', label: 'FF', name: 'Four-seam fastball' },
  { key: 'SI', label: 'SI', name: 'Sinker / two-seam fastball' },
  { key: 'FC', label: 'FC', name: 'Cutter' },
  { key: 'FS', label: 'FS', name: 'Splitter' },
  { key: 'SL', label: 'SL', name: 'Slider' },
  { key: 'CU', label: 'CU', name: 'Curveball' },
  { key: 'KC', label: 'KC', name: 'Knuckle-curve' },
  { key: 'CH', label: 'CH', name: 'Changeup' },
]

// Baseball Savant's pitch colors, keyed by the FanGraphs code used here.
export const PITCH_COLORS = {
  FA: '#d22d49', SI: '#fe9d00', FC: '#933f2c', FS: '#3bacac',
  SL: '#ddb33a', CU: '#00d1ed', KC: '#6236cd', CH: '#1dbe3a',
}

// Role groups in display order (roster Depth). Grades and ranks are per role.
export const ROLES = ['Rotation', 'Bullpen']

// Thin-data flag: the primer's Pitching+ crossover points, in pitches,
// per role. Placeholders until R&D sets real reliability thresholds.
export const MIN_PITCHES = { Rotation: 400, Bullpen: 250 }
// The data has IP but no pitch counts, so pitches are estimated from IP.
export const PITCHES_PER_IP = 15

// Baseball IP notation: 15.1 = 15 1/3 innings, 15.2 = 15 2/3.
export function inningsFromIp(ip) {
  if (ip == null) return null
  const [whole, outs = '0'] = ip.split('.')
  return Number(whole) + Number(outs) / 3
}

function isThinSample(ip, role) {
  const innings = inningsFromIp(ip)
  const min = MIN_PITCHES[role]
  if (innings == null || min == null) return false
  return innings * PITCHES_PER_IP < min
}

function loadPitchers() {
  const roster = new Map(rosterRecords.map((r) => [r.PlayerId, r]))

  // Blank cells arrive as null; numbers are already typed.
  return statsRecords.map((s) => {
    const bio = roster.get(s.PlayerId) ?? {}
    return {
      playerId: s.PlayerId,
      mlbamId: s.MLBAMID,
      name: s.Name,
      team: s.Team,
      teamName: bio.Team ?? null,
      number: bio.Number ?? null, // jersey number, a string
      position: bio.Position ?? null,
      role: bio.Depth ?? null,
      hand: bio.Hand ?? null,
      age: bio.Age ?? null,
      height: bio.Height ?? null,
      weight: bio.Weight ?? null,
      ip: s.IP, // string in baseball notation: .1 = 1/3 inning
      stuffPlus: s['Stuff+'],
      locationPlus: s['Location+'],
      pitchingPlus: s['Pitching+'],
      grade: s.Grade, // Pitching 20-80
      stuffGrade: s['Stuff Grade'],
      locationGrade: s['Location Grade'],
      rank: s.Rank,
      thinSample: isThinSample(s.IP, bio.Depth),
      pitchStuffPlus: Object.fromEntries(PITCH_TYPES.map((p) => [p, s[`Stf+ ${p}`]])),
      pitchStuffGrade: Object.fromEntries(PITCH_TYPES.map((p) => [p, s[`Stf Grade ${p}`] ?? null])),
    }
  })
}

/**
 * Fetch pitchers for a filter scope, grouped by role and ordered by Rank.
 * Returns [{ role, pitchers }] in ROLES order. Only 'team' has data in the
 * POC. Async so the signature matches a future API call.
 */
export async function fetchPitchers({ scope = 'team', team = 'WSN' } = {}) {
  if (scope !== 'team') return []
  const rows = loadPitchers().filter((p) => p.team === team)
  return ROLES.map((role) => ({
    role,
    pitchers: rows.filter((p) => p.role === role).sort((a, b) => a.rank - b.rank),
  }))
}

// Pitchers with a profile page. The POC builds Cade Cavalli's only; other
// table rows stay plain text until their profiles exist.
const PROFILE_IDS = new Set(['27473'])
export const hasProfile = (playerId) => PROFILE_IDS.has(playerId)

// Lowercase and drop accents so "nunez" finds "Núñez".
const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/**
 * Search the roster by name for the header search. Every word typed
 * must start a word in the name ("cav", "cade c"). Pitchers with a profile
 * come first, then Rank order. Each hit carries `hasProfile` so the UI can
 * dim the ones the POC can't open. Async to match a future API call.
 */
export async function searchPitchers(query, { limit = 8 } = {}) {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return loadPitchers()
    .filter((p) => {
      const words = fold(p.name).split(/[\s.'-]+/)
      return terms.every((t) => words.some((w) => w.startsWith(t)))
    })
    .map((p) => ({ ...p, hasProfile: hasProfile(p.playerId) }))
    .sort((a, b) => b.hasProfile - a.hasProfile || ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.rank - b.rank)
    .slice(0, limit)
}

/**
 * Fetch one pitcher by FanGraphs PlayerId for the profile page, or null when
 * there's no record or no profile yet. Async to match a future API call.
 */
export async function fetchPitcher(playerId) {
  if (!hasProfile(playerId)) return null
  const pitcher = loadPitchers().find((p) => p.playerId === playerId)
  if (!pitcher) return null
  return { ...pitcher, results: loadResults(playerId), arsenal: loadArsenal(pitcher) }
}

// The season the POC shows. Earlier seasons feed Chadwick's history answers.
export const SEASON = 2026

const toResults = (r) => ({
  season: r.Season, w: r.W, l: r.L, era: r.ERA, xera: r.xERA, fip: r.FIP ?? null, g: r.G, gs: r.GS,
  ip: r.IP, so: r.SO, whip: r.WHIP, kPct: r['K%'], bbPct: r['BB%'],
})

// This season's results line (Savant), or null when there's none.
function loadResults(playerId) {
  const r = resultsRecords.find((x) => x.PlayerId === playerId && x.Season === SEASON)
  return r ? toResults(r) : null
}

/** Every season's results line for a pitcher, oldest first. */
export async function fetchResultsHistory(playerId) {
  return resultsRecords
    .filter((x) => x.PlayerId === playerId)
    .sort((a, b) => a.Season - b.Season)
    .map(toResults)
}

/** This season's start-by-start line (date, opponent, IP, ER, SO). */
export async function fetchGameLog(playerId) {
  return gameLogRecords
    .filter((x) => x.PlayerId === playerId && x.Season === SEASON)
    .map((r) => ({ date: r.Date, opp: r.Opp, ip: r.IP, innings: inningsFromIp(r.IP), er: r.ER, so: r.SO }))
}

// One row per pitch thrown, by usage: Savant metrics joined to the FanGraphs
// Stuff+, Stuff grade and Location+ for the same pitch type. HB is in inches from the
// pitcher's view, + = glove side; the *2025 fields are last season's shape.
function loadArsenal(pitcher) {
  const loc = locationRecords.find((x) => x.PlayerId === pitcher.playerId) ?? {}
  return arsenalRecords
    .filter((r) => r.PlayerId === pitcher.playerId)
    .map((r) => ({
      type: r.PitchType,
      savantType: r.SavantType,
      name: r.PitchName,
      color: PITCH_COLORS[r.PitchType] ?? '#9aa0ad',
      usage: r['Usage%'],
      pitches: r.Pitches,
      velo: r.Velo,
      ivb: r.IVB,
      hb: r.HB,
      ivbPrev: r['IVB 2025'],
      hbPrev: r['HB 2025'],
      whiff: r['Whiff%'],
      xwoba: r.xwOBA,
      rv100: r['RV/100'] ?? null, // run value per 100 pitches, + = good for the pitcher
      stuffPlus: pitcher.pitchStuffPlus[r.PitchType] ?? null,
      stuffGrade: pitcher.pitchStuffGrade[r.PitchType] ?? null,
      locationPlus: loc[`Loc+ ${r.PitchType}`] ?? null,
    }))
    .sort((a, b) => b.usage - a.usage)
}

export function teamLogoUrl(team) {
  return `${import.meta.env.BASE_URL}team-logos/${team}.svg`
}

// MLB headshot by MLBAMID (design doc stretch goal). The CDN serves a generic
// silhouette for unknown IDs; the table falls back to a placeholder offline.
export function headshotUrl(mlbamId) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:silo:current.png/r_max/w_180,q_auto:best/v1/people/${mlbamId}/headshot/silo/current`
}
