// Model registry (extensibility). Each internal model output is one
// entry: how to label it, where its season value lives on a pitcher record,
// the spreads that turn it into a 20-80 grade and the sample it needs to be
// reliable. The profile's grade cards and Chadwick's "Models used" chips both
// read from here, so a new model is a new entry plus its data, not new page
// code. Spreads and stable points are the primer's, pending
// internal model specs from R&D.
import { MIN_PITCHES } from './pitchers.js'

// Pitch-type Stuff+ (mean, SD) at the pitch level (primer). Mirrors
// PITCH_STUFF in scripts/add_pitching_grades.py; FA = the primer's FF row.
export const PITCH_STUFF = {
  FA: [99.2, 18.3], SI: [92.5, 13.6], FC: [102.1, 14.0], FS: [109.6, 30.2],
  SL: [110.8, 15.6], CU: [105.5, 16.8], CH: [87.2, 16.4], KC: [110.3, 16.4],
}
// Location+ pitch grades use the primer's general rule, 10 points = 1 SD at
// the pitch level (illustrative).
export const PITCH_LOCATION_SD = 10

export const MODELS = [
  {
    key: 'pitching',
    label: 'Pitching+',
    version: 'v1',
    description: 'Stuff, location, count, platoon',
    field: 'pitchingPlus',
    gradeField: 'grade',
    sd: { Rotation: 4.94, Bullpen: 6.61 },
    stableAt: MIN_PITCHES, // placeholder: the primer's crossover points
  },
  {
    key: 'stuff',
    label: 'Stuff+',
    version: 'v1',
    description: 'Physical traits only',
    field: 'stuffPlus',
    gradeField: 'stuffGrade',
    sd: { Rotation: 12.16, Bullpen: 17.02 },
    stableAt: 80,
  },
  {
    key: 'location',
    label: 'Location+',
    version: 'v1',
    description: 'Location only, count-adjusted',
    field: 'locationPlus',
    gradeField: 'locationGrade',
    sd: { Rotation: 3.34, Bullpen: 5.87 },
    stableAt: 400,
  },
  // A hypothetical future model, registered to show the extension path: its
  // only footprint is this entry and its synthetic data
  // (data/wsn_synthetic_models.json). Chadwick renders it with generic blocks.
  {
    key: 'stuffDecay',
    label: 'Stuff Decay+',
    version: 'v0.1',
    description: 'Stuff+ by pitch count within a start',
    isNew: true,
    synthetic: true,
    stableAt: 1000, // placeholder
  },
]

// The three models every pitcher has a season grade for, in display order.
export const CORE_MODELS = MODELS.filter((m) => ['pitching', 'stuff', 'location'].includes(m.key))

export const getModel = (key) => MODELS.find((m) => m.key === key)

/** Pitches a model needs before its value is reliable, for a role. */
export function stableAt(model, role) {
  const s = typeof model === 'string' ? getModel(model)?.stableAt : model?.stableAt
  return s != null && typeof s === 'object' ? s[role] ?? null : s ?? null
}
