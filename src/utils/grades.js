// Display helpers for 20-80 grades and "+" values. A diverging scale in the
// theme colors: navy below average, light grey at average, scarlet above
// (Savant's blue-to-red convention, in Nationals colors).
const NAVY = [20, 34, 90]
const MID = [220, 221, 227]
const SCARLET = [171, 0, 3]

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function mix(a, b, t) {
  return a.map((x, i) => Math.round(x + (b[i] - x) * t))
}

/** RGB triple for t in [-1, 1]: -1 navy, 0 grey, +1 scarlet. */
export function divergingRgb(t) {
  const c = clamp(t, -1, 1)
  return c >= 0 ? mix(MID, SCARLET, c) : mix(MID, NAVY, -c)
}

const css = (rgb) => `rgb(${rgb.join(' ')})`

/** Fill color for a 20-80 grade; full color at 25 points from average. */
export const gradeColor = (g) => css(divergingRgb((g - 50) / 25))

/** Text color for a large grade numeral: same scale, but ink (not light
 * grey) at average so a 50 stays legible on white. */
export const gradeInkColor = (g) => {
  const t = clamp((g - 50) / 25, -1, 1)
  const INK = [27, 31, 42]
  return css(t >= 0 ? mix(INK, SCARLET, t) : mix(INK, NAVY, -t))
}

/** Readable text color on a gradeColor fill. */
export const gradeTextColor = (g) => (Math.abs(g - 50) >= 10 ? '#ffffff' : '#1b1f2a')

/** Position of a grade along a 20-80 track, as a percentage. */
export const gradePercent = (g) => ((clamp(g, 20, 80) - 20) / 60) * 100

/** 20-80 grade from a "+" value, the same rule as scripts/add_pitching_grades.py
 *: 50 + 10 z, rounded half up to the nearest 5, clamped to 20-80. */
export function toGrade(plus, sd, mean = 100) {
  if (plus == null) return null
  const raw = 50 + (10 * (plus - mean)) / sd
  return clamp(Math.floor(raw / 5 + 0.5) * 5, 20, 80)
}

/** Scouting word for a 20-80 grade. */
export function gradeWord(g) {
  if (g == null) return ''
  if (g >= 80) return 'Elite'
  if (g >= 70) return 'Plus-plus'
  if (g >= 60) return 'Plus'
  if (g >= 55) return 'Above average'
  if (g >= 50) return 'Average'
  if (g >= 45) return 'Below average'
  if (g >= 40) return 'Fringe'
  return 'Well below average'
}

// Table heat map: blue (cold, below average) through white to red (hot, above
// average). Softer than the grade-card scale so dark text stays readable.
const COLD = [92, 141, 214]
const HOT = [226, 88, 80]
const WHITE = [255, 255, 255]

/** Cell fill for a 20-80 grade, or '' with no grade. Full tint at 20 and 80. */
export function heatColor(g) {
  if (g == null) return ''
  const t = clamp((g - 50) / 30, -1, 1)
  return css(t >= 0 ? mix(WHITE, HOT, t) : mix(WHITE, COLD, -t))
}
