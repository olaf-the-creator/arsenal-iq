// SYNTHETIC model inputs for Chadwick. Reads
// data/wsn_synthetic_models.json, written by scripts/build_synthetic_models.py
// (model_version "synthetic-poc"): Stuff+ sensitivities for what-if answers,
// prior-season model values, per-start Pitching+ and the hypothetical Stuff
// Decay+ model. Every answer that uses these labels them illustrative.
import synthetic from '../../data/wsn_synthetic_models.json'

/** The pitcher's synthetic model file, or null. Async, like an API call. */
export async function fetchSyntheticModels(playerId) {
  return synthetic.player_id === playerId ? synthetic : null
}

// What-if presets from the author's mock, by FanGraphs pitch code: change in
// velocity (mph), IVB (in) and HB (in, + = toward the glove side).
export const PRESETS = {
  velo: () => ({ dV: 1, dI: 0, dH: 0 }),
  ride: (code) => (code === 'FA' ? { dV: 0, dI: 1.5, dH: 1 } : { dV: 0, dI: 1, dH: 0 }),
  ssw: (code) =>
    ['SI', 'CH'].includes(code) ? { dV: 0, dI: -2, dH: -2 } : code === 'SL' ? { dV: -0.5, dI: -1, dH: 2.5 } : { dV: 0, dI: -1, dH: 1 },
}

/**
 * Projected Stuff+ for a pitch after a shape change. Stands in for re-scoring
 * hypothetical pitches, which the models can't do yet. Linear
 * sensitivities with a small penalty for large shape changes.
 */
export function projStuff(model, pitch, { dV = 0, dI = 0, dH = 0 }) {
  const s = model.stuff_sensitivity.per_unit[pitch.type]
  if (!s || pitch.stuffPlus == null) return null
  return pitch.stuffPlus + s.velo * dV + s.ivb * dI + s.hb * dH - model.stuff_sensitivity.curvature * (dI ** 2 + dH ** 2)
}

/** Pitching+ on the ERA scale: an illustrative linear rescale from the mock,
 * not an R&D model. 100 Pitching+ = 4.00 ERA. */
export const modelERA = (pitchingPlus) => 4.0 - 0.135 * (pitchingPlus - 100)

/** Inverse of modelERA: the Pitching+ a given ERA is equivalent to. Lets results
 * be graded 20-80 with the same rule as process (illustrative, same caveat). */
export const eraToPlus = (era) => 100 + (4.0 - era) / 0.135
