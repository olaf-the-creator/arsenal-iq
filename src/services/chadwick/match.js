// Maps a free-typed question to the closest scripted answer by keyword
// triggers. A trigger scores 1, or 2 when it's a phrase or ends in "*"
// (a strong, distinctive word). Below MIN_SCORE there's no answer, and the
// provider says so instead of guessing.
const MIN_SCORE = 2

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[″”“]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const has = (text, phrase) => new RegExp(`(^|[^a-z0-9])${escapeRe(phrase)}([^a-z0-9]|$)`).test(text)

function score(text, triggers) {
  let total = 0
  for (const t of triggers) {
    const strong = t.endsWith('*')
    const phrase = strong ? t.slice(0, -1) : t
    if (has(text, phrase)) total += strong || phrase.includes(' ') ? 2 : 1
  }
  return total
}

// Last names that are also common words don't count as a pitcher mention.
const COMMON_WORDS = new Set(['early', 'lord', 'gray', 'grey'])

/**
 * { script } for the best match, { otherPitcher } when the question names a
 * different pitcher, or {} when nothing matches.
 */
export function matchPrompt(prompt, scripts, { pitcherName, roster = [] } = {}) {
  const text = norm(prompt)
  const exact = scripts.find((s) => norm(s.prompt) === text)
  if (exact) return { script: exact }

  const own = norm(pitcherName ?? '')
  const other = roster.find((p) => {
    const full = norm(p.name)
    if (full === own) return false
    const last = full.split(' ').at(-1)
    return has(text, full) || (!COMMON_WORDS.has(last) && has(text, last))
  })
  if (other) return { otherPitcher: other.name }

  let best = null
  let bestScore = 0
  for (const s of scripts) {
    const n = score(text, s.triggers)
    if (n > bestScore) {
      best = s
      bestScore = n
    }
  }
  return bestScore >= MIN_SCORE ? { script: best } : {}
}
