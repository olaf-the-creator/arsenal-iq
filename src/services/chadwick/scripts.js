// Chadwick's scripted answers, as data. Each entry follows the block
// schema a real model would emit through tool calls:
//
//   { id, category, triggers, prompt, steps: [{ label, durationMs }],
//     blocks: [{ type: 'text' | 'chart' | 'table' | 'heatmap' | 'compare' |
//                'callout' | 'checklist', ... }],
//     modelsUsed: [{ key, n, scope }], followUps: [ids] }
//
// Every figure is computed here from the shared services (the profile's data
// and grade rules), never typed into the prose. Markdown supports **bold**,
// "- " lists and [[55]] for a 20-80 grade chip. Visible copy avoids gendered
// pronouns for the player.
//
// To add a conversation: write a builder function below that reads `ctx`
// (pitcher, seasons, starts, summary, synthetic) and returns an entry, add it
// to BUILDERS, give it triggers for free-text matching, and list its id in
// another entry's followUps (or SAMPLE_IDS) so users can reach
// it. A new model also needs an entry in services/models.js; a new block type
// needs one renderer in components/chadwick/blocks/index.js.
import { SEASON } from '../pitchers.js'
import { ZONE_HALF_WIDTH, locationView } from '../locations.js'
import { PITCH_LOCATION_SD, PITCH_STUFF, getModel, stableAt } from '../models.js'
import { PRESETS, eraToPlus, modelERA, projStuff } from '../synthetic.js'
import { gradeWord, toGrade } from '../../utils/grades.js'

// 2026 All-Star Game (MLB calendar): starts before it are first half.
const ALL_STAR_BREAK = '2026-07-14'

// ---- Formatting -----------------------------------------------------------
const MINUS = '−'
const r0 = (v) => Math.round(v)
const f1 = (v) => v.toFixed(1)
const f2 = (v) => v.toFixed(2)
const sgn = (v, d = 1) => {
  const s = Math.abs(v).toFixed(d)
  return Number(s) === 0 ? s : `${v > 0 ? '+' : MINUS}${s}`
}
const num = (n) => n.toLocaleString('en-US')
const inch = (v) => `${f1(v)}″`
const hbText = (hb) => `${f1(Math.abs(hb))}″ ${hb < 0 ? 'arm-side' : 'glove-side'}`
const xw = (v) => v.toFixed(3).replace(/^0/, '')
const pct = (v) => `${f1(v)}%`
const chip = (g) => `[[${g}]]`
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1)
const pname = (p) => p.name.toLowerCase() // "knuckle curve", "4-seam fastball"
const listOf = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)
const md = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })

// ---- Shared derivations ------------------------------------------------------
const pitchOf = (ctx, type) => ctx.pitcher.arsenal.find((p) => p.type === type)
const stuffGradeFor = (type, plus) => toGrade(plus, PITCH_STUFF[type][1], PITCH_STUFF[type][0])
const locGrade = (plus) => toGrade(plus, PITCH_LOCATION_SD)
const loading = (ctx) => ({ label: `Loading ${ctx.pitcher.name} · ${SEASON} · ${num(ctx.totalPitches)} pitches`, durationMs: 650 })
const caveat = (text) => ({ type: 'callout', tone: 'caveat', md: `**Caveats** ${text}` })
const currentSeason = (ctx) => ctx.seasons.find((s) => s.season === SEASON)
const qualified = (ctx) => ctx.seasons.filter((s) => s.pitches >= stableAt('pitching', ctx.pitcher.role))
const residual = (s) => s.era - modelERA(s.pitchingPlus)
// Gap indicator: results (ERA as a Pitching+ equivalent) graded with the same
// role SD as the process grade, so both sit on one 20-80 track. A gap of 5+
// grade points is "ahead" / "behind"; anything closer is "in line".
const GAP_BAND = 5
const processGrade = (ctx, s) => toGrade(s.pitchingPlus, getModel('pitching').sd[ctx.pitcher.role])
const resultsGrade = (ctx, s) => toGrade(eraToPlus(s.era), getModel('pitching').sd[ctx.pitcher.role])
const gapOf = (ctx, s) => resultsGrade(ctx, s) - processGrade(ctx, s)
const gapState = (g) => (g >= GAP_BAND ? 'ahead' : g <= -GAP_BAND ? 'behind' : 'inline')
const eraOf = (starts) => {
  const ip = starts.reduce((a, s) => a + s.innings, 0)
  return (9 * starts.reduce((a, s) => a + s.er, 0)) / ip
}
const weightedModelERA = (starts) =>
  starts.reduce((a, s) => a + modelERA(s.pitchingPlus) * s.innings, 0) / starts.reduce((a, s) => a + s.innings, 0)

// ---- 1. Optimization: four-seam ride ---------------------------------------
function ffRide(ctx) {
  const ff = pitchOf(ctx, 'FA')
  const syn = ctx.synthetic
  const sens = syn.stuff_sensitivity.per_unit.FA
  const league = syn.league_reference.FA
  const ride = PRESETS.ride('FA')
  const velo = PRESETS.velo('FA')
  const both = { dV: velo.dV, dI: ride.dI, dH: ride.dH }
  const run = (name, d) => {
    const v = projStuff(syn, ff, d)
    return { name, d, v, delta: v - ff.stuffPlus, grade: stuffGradeFor('FA', v) }
  }
  const [rideS, veloS, bothS] = [run('More ride', ride), run('+1 mph', velo), run('Ride + 1 mph', both)]
  const g0 = ff.stuffGrade
  const gradeMove = (g) => (g === g0 ? `holds at ${chip(g)}` : `moves ${chip(g0)} → ${chip(g)}`)
  const rideGap = league.ivb - ff.ivb
  const rideLabel = `${sgn(ride.dI)}″ IVB, ${sgn(ride.dH)}″ HB`
  const veloLeads = sens.velo > sens.ivb
  const pad = 3

  return {
    id: 'ff-ride',
    category: 'Optimization',
    prompt: 'What happens to Cavalli’s four-seamer if we give him more ride?',
    triggers: ['ride*', 'four-seam*', 'four seam*', 'four-seamer*', 'fastball', 'ff', 'ivb', 'vertical break', 'carry', 'velo', 'velocity', 'mph', 'rise'],
    steps: [
      loading(ctx),
      { label: `Querying Stuff+ ${getModel('stuff').version} (FF, n=${num(ff.pitches)})`, durationMs: 700 },
      { label: `Running sensitivity: ${rideLabel}, ${sgn(velo.dV, 0)} mph`, durationMs: 900 },
      { label: 'Comparing to the league four-seam shape', durationMs: 600 },
    ],
    blocks: [
      {
        type: 'text',
        md:
          `**More ride is a real but modest gain: Stuff+ ${r0(ff.stuffPlus)} → ${r0(rideS.v)}, and the four-seam grade ${gradeMove(rideS.grade)}.**\n\n` +
          `Today the pitch sits at ${f1(ff.velo)} mph with ${inch(ff.ivb)} of ride and ${hbText(ff.hb)} run. ` +
          (rideGap > 0
            ? `That's ${inch(rideGap)} less ride than a league-average four-seamer, so there's room to add some.`
            : `That's already ${inch(-rideGap)} more ride than a league-average four-seamer.`),
      },
      {
        type: 'chart',
        title: 'Four-seam shape: now vs more ride',
        sub: 'Pitcher’s view · dashed = projected',
        spec: {
          kind: 'movement',
          axes: {
            x: { min: Math.floor(Math.min(ff.hb, league.hb) - pad), max: Math.ceil(Math.max(ff.hb + ride.dH, league.hb) + pad) },
            y: { min: Math.floor(Math.min(ff.ivb, league.ivb) - pad), max: Math.ceil(Math.max(ff.ivb + ride.dI, league.ivb) + pad) },
          },
          points: [
            { x: league.hb, y: league.ivb, label: 'League avg FF', style: 'ref', labelSide: 'left' },
            { x: ff.hb, y: ff.ivb, label: ff.savantType, color: ff.color, badge: g0, style: 'solid', title: `Now: Stuff+ ${r0(ff.stuffPlus)}` },
            { x: ff.hb + ride.dH, y: ff.ivb + ride.dI, label: '', color: ff.color, badge: rideS.grade, style: 'projected', title: `More ride: Stuff+ ${r0(rideS.v)}` },
          ],
          arrows: [{ from: [ff.hb, ff.ivb], to: [ff.hb + ride.dH, ff.ivb + ride.dI] }],
        },
      },
      {
        type: 'text',
        md:
          `Run through the Stuff+ sensitivities, the three changes compare like this:\n\n` +
          `- **More ride** (${rideLabel}): ${sgn(rideS.delta)} Stuff+, grade ${chip(rideS.grade)}\n` +
          `- **${sgn(velo.dV, 0)} mph**: ${sgn(veloS.delta)} Stuff+, grade ${chip(veloS.grade)}\n` +
          `- **Both**: ${sgn(bothS.delta)} Stuff+ (to ${r0(bothS.v)}), grade ${chip(bothS.grade)}`,
      },
      {
        type: 'chart',
        title: 'Stuff+ change by scenario',
        sub: `Four-seamer, from Stuff+ ${r0(ff.stuffPlus)}`,
        spec: {
          kind: 'bar',
          categories: [rideS.name, veloS.name, bothS.name],
          series: [{ name: 'Δ Stuff+', color: 'var(--color-navy)', values: [rideS.delta, veloS.delta, bothS.delta] }],
          axes: { y: { label: 'Δ Stuff+', min: 0 } },
          valueFormat: { decimals: 1, sign: true },
        },
      },
      {
        type: 'text',
        md: veloLeads
          ? `Per unit, **velocity is the bigger lever**: +1 mph is worth ${sgn(sens.velo)} Stuff+, about ${(sens.velo / sens.ivb).toFixed(1)}× an inch of ride. If the pitch lab can chase only one, chase velocity.`
          : `Per unit, **ride is the bigger lever**: an inch is worth ${sgn(sens.ivb)} Stuff+ against ${sgn(sens.velo)} per mph.`,
      },
      caveat(
        `The sensitivities are synthetic stand-ins, because the models can't yet re-score a hypothetical pitch; read the deltas as direction and rough size. ` +
          `${num(ff.pitches)} four-seamers is well past Stuff+'s ~${stableAt('stuff')}-pitch stable point. The league reference shape and model values are illustrative.`,
      ),
    ],
    modelsUsed: [{ key: 'stuff', n: ff.pitches, scope: 'FF' }],
    followUps: ['ch-grip', 'kc-vs-sw', 'era-real'],
  }
}

// ---- 2. Optimization: changeup grip and seam orientation --------------------
function chGrip(ctx) {
  const ch = pitchOf(ctx, 'CH')
  const ff = pitchOf(ctx, 'FA')
  const syn = ctx.synthetic
  const sens = syn.stuff_sensitivity.per_unit.CH
  const [mean, sd] = PITCH_STUFF.CH
  const g0 = ch.stuffGrade
  const scenarios = [
    { name: 'Seam-shifted wake grip', d: PRESETS.ssw('CH') },
    { name: 'Deeper pronation', d: { dV: 0, dI: -1, dH: -1.5 } },
    { name: 'Split-change grip', d: { dV: -1.5, dI: -2.5, dH: 0 } },
    { name: 'Firmer grip', d: { dV: 1.5, dI: 0, dH: 0 } },
  ].map((s) => {
    const v = projStuff(syn, ch, s.d)
    return { ...s, v, delta: v - ch.stuffPlus, grade: stuffGradeFor('CH', v) }
  })
  const best = scenarios.reduce((a, b) => (b.v > a.v ? b : a))
  const firmer = scenarios.find((s) => s.name === 'Firmer grip')
  const gap = ff.velo - ch.velo
  const gradePts = (best.delta / sd) * 10
  const signed = (v) => (v === 0 ? '0' : sgn(v))

  return {
    id: 'ch-grip',
    category: 'Optimization',
    prompt: 'Which grip or seam-orientation change would help his changeup most?',
    triggers: ['changeup*', 'change-up*', 'change up*', 'ch', 'grip*', 'seam*', 'seam orientation', 'seam-shifted', 'ssw', 'wake', 'pronation', 'split-change'],
    steps: [
      loading(ctx),
      { label: `Querying Stuff+ ${getModel('stuff').version} (CH, n=${num(ch.pitches)})`, durationMs: 650 },
      { label: `Running ${scenarios.length} grip and seam scenarios`, durationMs: 1000 },
      { label: `Measuring separation from the four-seamer (${f1(gap)} mph)`, durationMs: 550 },
    ],
    blocks: [
      {
        type: 'text',
        md:
          `**Try the ${lower(best.name)} first: it projects the changeup from ${r0(ch.stuffPlus)} to ${r0(best.v)} Stuff+ (${sgn(best.delta)}), the biggest gain of the options tested.**\n\n` +
          (best.grade === g0
            ? `The grade holds at ${chip(g0)}: the gain is worth about ${f1(gradePts)} grade points, short of the next 5-point step.`
            : `That moves the grade ${chip(g0)} → ${chip(best.grade)}.`),
      },
      {
        type: 'table',
        title: 'Changeup scenarios',
        sub: 'Shape change in, projected Stuff+ out · HB + = glove side',
        columns: [
          { key: 'name', label: 'Scenario' },
          { key: 'dV', label: 'ΔVelo (mph)', align: 'right' },
          { key: 'dI', label: 'ΔIVB', align: 'right' },
          { key: 'dH', label: 'ΔHB', align: 'right' },
          { key: 'stuff', label: 'Stuff+', align: 'right' },
          { key: 'grade', label: 'Grade', align: 'center', type: 'grade' },
          { key: 'delta', label: 'Δ', align: 'right' },
        ],
        rows: [
          { name: 'Current', dV: '–', dI: '–', dH: '–', stuff: r0(ch.stuffPlus), grade: g0, delta: '–' },
          ...scenarios.map((s) => ({
            name: s.name,
            dV: signed(s.d.dV),
            dI: s.d.dI === 0 ? '0' : `${sgn(s.d.dI)}″`,
            dH: s.d.dH === 0 ? '0' : `${sgn(s.d.dH)}″`,
            stuff: r0(s.v),
            grade: s.grade,
            delta: sgn(s.delta),
          })),
        ],
        highlightRow: 1 + scenarios.indexOf(best),
      },
      {
        type: 'text',
        md:
          `Stuff+ judges a changeup against the pitcher's primary fastball, so **separation is the point**: each 1 mph slower is worth ${sgn(-sens.velo)} Stuff+ and each inch of extra drop ${sgn(-sens.ivb)}. ` +
          `Today the gap to the ${f1(ff.velo)} mph four-seamer is ${f1(gap)} mph.` +
          (firmer.delta < 0 ? ` That's why the firmer grip loses ground (${sgn(firmer.delta)}).` : ''),
      },
      caveat(
        `Grip and seam-orientation data isn't in our feeds yet, so each scenario is a hypothesized shape change run through synthetic sensitivities. ` +
          `${num(ch.pitches)} changeups clears Stuff+'s ~${stableAt('stuff')}-pitch stable point, but it's the least-used pitch in the arsenal. Model values are illustrative.`,
      ),
    ],
    modelsUsed: [{ key: 'stuff', n: ch.pitches, scope: 'CH' }],
    followUps: ['kc-vs-sw', 'ff-ride'],
  }
}

// ---- 3. Optimization: knuckle curve vs sweeper ------------------------------
function kcVsSweeper(ctx) {
  const kc = pitchOf(ctx, 'KC')
  const sw = pitchOf(ctx, 'SL')
  const pair = [kc, sw]
  const out = kc.whiff >= sw.whiff ? kc : sw
  const other = out === kc ? sw : kc
  const lg = (p) => locGrade(p.locationPlus)
  // Which pitch wins each comparable stat (null on a tie).
  const winner = (f, higher = true) => {
    const [a, b] = pair.map(f)
    if (a === b) return null
    return (a > b) === higher ? kc.type : sw.type
  }
  const wins = {
    usage: winner((p) => p.usage),
    stuff: winner((p) => p.stuffGrade),
    location: winner((p) => lg(p)),
    whiff: winner((p) => p.whiff),
    xwoba: winner((p) => p.xwoba, false),
    rv: winner((p) => p.rv100),
  }
  const item = (p) => ({
    name: p.name,
    code: p.savantType,
    color: p.color,
    stats: [
      { label: 'Velo', value: `${f1(p.velo)} mph` },
      { label: 'IVB', value: inch(p.ivb) },
      { label: 'HB', value: hbText(p.hb) },
      { label: 'Usage', value: pct(p.usage), best: wins.usage === p.type },
      { label: 'Stuff', grade: p.stuffGrade, value: `Stuff+ ${r0(p.stuffPlus)}`, best: wins.stuff === p.type },
      { label: 'Location', grade: lg(p), value: `Location+ ${r0(p.locationPlus)}`, best: wins.location === p.type },
      { label: 'Pitching', value: 'Not published by pitch', muted: true },
      { label: 'Whiff%', value: pct(p.whiff), best: wins.whiff === p.type },
      { label: 'xwOBA', value: xw(p.xwoba), best: wins.xwoba === p.type },
      { label: 'RV/100', value: sgn(p.rv100), best: wins.rv === p.type },
    ],
  })
  const sameStuff = Math.abs(kc.stuffPlus - sw.stuffPlus) < 2
  const otherMoreEfficient = other.rv100 > out.rv100 && other.xwoba < out.xwoba
  const betterLoc = lg(kc) === lg(sw) ? null : lg(kc) > lg(sw) ? kc : sw
  const thin = pair.filter((p) => p.pitches < stableAt('location'))

  return {
    id: 'kc-vs-sw',
    category: 'Optimization',
    prompt: 'Compare his knuckle curve and sweeper.',
    triggers: ['compare*', 'versus', 'vs', 'sweeper*', 'knuckle curve', 'knuckle-curve', 'curveball', 'kc', 'st', 'out pitch', 'breaking', 'slider', 'better pitch', 'putaway'],
    steps: [
      loading(ctx),
      { label: `Querying Stuff+ ${getModel('stuff').version} (KC n=${num(kc.pitches)}, ST n=${num(sw.pitches)})`, durationMs: 700 },
      { label: `Querying Location+ ${getModel('location').version} by pitch`, durationMs: 600 },
      { label: 'Comparing whiff, contact and run value', durationMs: 700 },
    ],
    blocks: [
      {
        type: 'text',
        md:
          `**The ${pname(out)} is the true out pitch: it misses more bats (${pct(out.whiff)} whiffs vs ${pct(other.whiff)}) and Cavalli trusts it with ${(out.usage / other.usage).toFixed(1)}× the usage.**\n\n` +
          (sameStuff
            ? `Stuff+ can't separate them (${r0(kc.stuffPlus)} vs ${r0(sw.stuffPlus)}, ${kc.stuffGrade === sw.stuffGrade ? `both grade ${chip(kc.stuffGrade)}` : `grades ${chip(kc.stuffGrade)} and ${chip(sw.stuffGrade)}`}), so the difference is in how hitters react, not raw shape.`
            : `Stuff+ prefers the ${pname(kc.stuffPlus > sw.stuffPlus ? kc : sw)} (${chip(kc.stuffGrade)} vs ${chip(sw.stuffGrade)}).`),
      },
      { type: 'compare', title: `${kc.name} vs ${sw.name}`, sub: 'Scarlet marks the better value · Pitching+ isn’t published by pitch type', items: pair.map(item) },
      {
        type: 'chart',
        title: 'Movement',
        sub: 'Pitcher’s view · badge = Stuff grade · bubble = usage',
        spec: {
          kind: 'movement',
          axes: { x: { min: -6, max: 22 }, y: { min: -18, max: 4 } },
          points: pair.map((p) => ({ x: p.hb, y: p.ivb, label: p.savantType, color: p.color, badge: p.stuffGrade, r: 10 + p.usage * 0.3, style: 'solid', title: p.name })),
        },
      },
      {
        type: 'text',
        md:
          (otherMoreEfficient
            ? `The ${pname(other)} is the more efficient pitch when it's thrown (${sgn(other.rv100)} vs ${sgn(out.rv100)} RV/100, ${xw(other.xwoba)} xwOBA vs ${xw(out.xwoba)}), so it has earned more usage. `
            : '') +
          (betterLoc ? `Cavalli locates the ${pname(betterLoc)} better (Location ${chip(lg(betterLoc))} vs ${chip(lg(betterLoc === kc ? sw : kc))}). ` : '') +
          `**Keep the ${pname(out)} as the putaway pitch${otherMoreEfficient ? ` and push the ${pname(other)}'s usage up` : ''}.**`,
      },
      caveat(
        (thin.length
          ? `${thin.map((p) => `The ${pname(p)}'s ${num(p.pitches)} pitches`).join(' and ')} sit just under Location+'s ~${stableAt('location')}-pitch stable point. `
          : '') +
          `The model grades the sweeper as a slider. Location grades use the 10-points-per-SD rule, and model values are illustrative.`,
      ),
    ],
    modelsUsed: [
      { key: 'stuff', n: kc.pitches, scope: 'KC' },
      { key: 'stuff', n: sw.pitches, scope: 'ST' },
      { key: 'location', n: kc.pitches, scope: 'KC' },
      { key: 'location', n: sw.pitches, scope: 'ST' },
    ],
    followUps: ['kc-location', 'ch-grip'],
  }
}

// ---- 4. Process vs results: is the ERA real? ---------------------------------
function eraReal(ctx) {
  const cur = currentSeason(ctx)
  const me = modelERA(cur.pitchingPlus)
  const res = cur.era - me
  const xSidesModel = Math.abs(cur.xera - me) < Math.abs(cur.xera - cur.era)
  const qual = qualified(ctx)
  const ip = qual.reduce((a, s) => a + s.innings, 0)
  const wres = qual.reduce((a, s) => a + residual(s) * s.innings, 0) / ip
  const mixed = new Set(qual.map((s) => Math.sign(residual(s)))).size > 1
  const minPitches = stableAt('pitching', ctx.pitcher.role)
  const small = ctx.seasons.filter((s) => s.pitches < minPitches)
  const lo = Math.min(me, cur.xera)
  const hi = Math.max(me, cur.xera)

  const verdict =
    res < 0
      ? `**Mostly not: the ${f2(cur.era)} ERA beat a ${f2(me)} model ERA by ${f2(-res)} runs, and xERA (${f2(cur.xera)}) ${xSidesModel ? 'sides with the model' : 'sides with the ERA'}.**`
      : `**The ERA is if anything unlucky: ${f2(cur.era)} against a ${f2(me)} model ERA.**`

  return {
    id: 'era-real',
    category: 'Process vs results',
    prompt: `Is Cavalli’s ${f2(cur.era)} ERA real, or has he outrun his grades?`,
    triggers: ['era*', f2(cur.era), 'real', 'outrun*', 'lucky', 'luck', 'overperform*', 'outperform', 'regression*', 'regress', 'xera', 'fip', 'model era', 'grades', 'sustainable'],
    steps: [
      loading(ctx),
      { label: `Querying Pitching+ ${getModel('pitching').version} (${ctx.seasons.length} seasons)`, durationMs: 650 },
      { label: 'Rescaling Pitching+ to model ERA', durationMs: 600 },
      { label: `Weighting residuals by innings (${qual.length} qualified seasons)`, durationMs: 650 },
    ],
    blocks: [
      {
        type: 'text',
        md:
          `${verdict}\n\n` +
          `The process grade is Pitching ${chip(ctx.pitcher.grade)} (${lower(gradeWord(ctx.pitcher.grade))}) on Pitching+ ${r0(cur.pitchingPlus)}, with Stuff ${chip(ctx.pitcher.stuffGrade)} and Location ${chip(ctx.pitcher.locationGrade)}. ` +
          `Plan around the model, **somewhere between ${f2(lo)} and ${f2(hi)}**, not ${f2(cur.era)}.`,
      },
      {
        type: 'chart',
        title: 'Model ERA vs results by season',
        sub: `Grey = under ${minPitches} pitches`,
        spec: {
          kind: 'bar',
          categories: ctx.seasons.map((s) => String(s.season)),
          muted: ctx.seasons.map((s) => s.pitches < minPitches),
          series: [
            { name: 'Model ERA', color: 'var(--color-navy)', values: ctx.seasons.map((s) => modelERA(s.pitchingPlus)) },
            { name: 'xERA', color: '#7a86b8', values: ctx.seasons.map((s) => s.xera) },
            { name: 'FIP', color: '#9aa0ad', values: ctx.seasons.map((s) => s.fip) },
            { name: 'ERA', color: 'var(--color-scarlet)', values: ctx.seasons.map((s) => s.era) },
          ],
          axes: { y: { label: 'Runs per 9', min: 0, max: 6 } },
          valueFormat: { decimals: 2 },
        },
      },
      {
        type: 'text',
        md:
          `One season of beating the model isn't a habit. Across qualified seasons (${minPitches}+ pitches) the IP-weighted residual is **${sgn(wres, 2)} ERA**:\n\n` +
          qual.map((s) => `- **${s.season}**: ERA ${f2(s.era)} vs model ${f2(modelERA(s.pitchingPlus))} (${sgn(residual(s), 2)})`).join('\n') +
          `\n\n${mixed ? 'The signs disagree, so there is no pattern yet.' : 'Every qualified season has the same sign, which is worth watching.'}`,
      },
      caveat(
        `Model ERA is an illustrative rescale of Pitching+ (100 = 4.00, 0.135 runs per point), not an R&D model, and model values before ${SEASON} are synthetic. ` +
          (small.length ? `${small.map((s) => `${s.season} (${num(s.pitches)} pitches)`).join(', ')} is greyed out. ` : '') +
          `${num(cur.pitches)} pitches in ${SEASON} clears Pitching+'s ~${minPitches}-pitch stable point.`,
      ),
    ],
    modelsUsed: [{ key: 'pitching', n: cur.pitches, scope: String(SEASON) }],
    followUps: ['skill-proof', 'ff-ride'],
  }
}

// ---- 5. Process vs results: what would prove skill? --------------------------
function skillProof(ctx) {
  const cur = currentSeason(ctx)
  const me = modelERA(cur.pitchingPlus)
  const qual = qualified(ctx)
  const beat = qual.filter((s) => residual(s) < 0)
  const mixed = new Set(qual.map((s) => Math.sign(residual(s)))).size > 1
  const W = 5
  const starts = ctx.starts
  const roll = starts.map((_, i) => (i < W - 1 ? null : eraOf(starts.slice(i - W + 1, i + 1)) - weightedModelERA(starts.slice(i - W + 1, i + 1))))
  const vals = roll.filter((v) => v != null)
  let crossings = 0
  for (let i = 1; i < vals.length; i++) if (Math.sign(vals[i]) !== Math.sign(vals[i - 1])) crossings++
  const breakAt = starts.findIndex((s) => s.date > ALL_STAR_BREAK)
  const windowPitches = r0((ctx.totalPitches / starts.length) * W)
  const minPitches = stableAt('pitching', ctx.pitcher.role)
  const pre = starts.slice(0, breakAt)
  const post = starts.slice(breakAt)
  const gapRows = ctx.seasons.map((s) => {
    const gap = gapOf(ctx, s)
    return { label: String(s.season), process: processGrade(ctx, s), results: resultsGrade(ctx, s), gap, state: gapState(gap), muted: s.pitches < minPitches }
  })
  const qualGaps = qual.map((s) => gapOf(ctx, s))
  const qualIp = qual.reduce((a, s) => a + s.innings, 0)
  const avgGap = qual.reduce((a, s) => a + gapOf(ctx, s) * s.innings, 0) / qualIp
  const sameSide = qualGaps.length > 1 && qualGaps.every((g) => g >= GAP_BAND || g <= -GAP_BAND) && new Set(qualGaps.map(Math.sign)).size === 1

  return {
    id: 'skill-proof',
    category: 'Process vs results',
    prompt: 'Does Cavalli habitually beat his pitch grades, or is this season a one-off?',
    triggers: ['skill*', 'gap', 'indicator', 'one-off', 'beat', 'underperform*', 'believe', 'convince', 'habit*', 'habitually', 'repeatable', 'prove', 'persist', 'outperformance*', 'what would make'],
    steps: [
      loading(ctx),
      { label: `Querying Pitching+ ${getModel('pitching').version} per start (${starts.length} starts)`, durationMs: 700 },
      { label: `Computing ${W}-start rolling residuals`, durationMs: 700 },
      { label: 'Grading results on the 20-80 scale', durationMs: 600 },
      { label: 'Generating the gap indicator', durationMs: 650 },
      { label: 'Checking the skill criteria (3)', durationMs: 550 },
    ],
    blocks: [
      {
        type: 'text',
        md:
          `**${sameSide ? `Yes so far: every qualified season has results ${avgGap > 0 ? 'ahead of' : 'behind'} the grade.` : `Not yet: ${SEASON} is a ${gapState(gapOf(ctx, cur))} season, and ${qual.length} qualified season${qual.length === 1 ? '' : 's'} can't show a habit${mixed ? ' (the signs disagree)' : ''}.`}**\n\n` +
          `The gap is results minus process on one 20-80 track: Pitching ${chip(processGrade(ctx, cur))} against an ERA-based results grade of ${chip(resultsGrade(ctx, cur))} in ${SEASON}. ` +
          `A habit needs the same side of the grade, by 5+ points, for several qualified seasons. Three or more would convince me.`,
      },
      {
        type: 'gap',
        title: 'Process vs results by season',
        sub: `Gap = results grade − process grade · grey = under ${minPitches} pitches`,
        rows: gapRows,
      },
      { type: 'text', md: 'Here is the checklist:' },
      {
        type: 'checklist',
        title: 'Evidence for a real skill',
        items: [
          {
            status: beat.length >= 3 ? 'met' : 'unmet',
            label: '3+ qualified seasons beating the model',
            detail: `${qual.length} qualified: ${qual.map((s) => `${s.season} ${sgn(residual(s), 2)}`).join(', ')}.${mixed ? ' The signs disagree.' : ''}`,
          },
          {
            status: 'unknown',
            label: 'A persistent gap in specific counts or pitch types',
            detail: 'Needs pitch-level expected run values from R&D. Not testable in this demo.',
          },
          {
            status: cur.xera < me ? 'partial' : 'unmet',
            label: 'Weak contact that Stuff+ only partly captures',
            detail:
              cur.xera < me
                ? `xERA ${f2(cur.xera)} beats model ERA ${f2(me)} by ${f2(me - cur.xera)}: some contact suppression the model misses. One season only.`
                : `xERA ${f2(cur.xera)} doesn't beat model ERA ${f2(me)}.`,
          },
        ],
      },
      {
        type: 'chart',
        title: `ERA minus model ERA, ${W}-start rolling`,
        sub: `${SEASON} starts · below 0 = beating the model`,
        spec: {
          kind: 'line',
          categories: starts.map((s) => md(s.date)),
          series: [{ name: 'Residual', color: 'var(--color-navy)', values: roll, points: true }],
          axes: { y: { label: 'ERA − model ERA', format: { decimals: 1, sign: true } } },
          annotations: [
            { type: 'hline', y: 0, label: 'Model ERA' },
            { type: 'vline', at: breakAt - 0.5, label: `All-Star break · ERA ${f2(eraOf(pre))} → ${f2(eraOf(post))}` },
          ],
        },
      },
      {
        type: 'text',
        md:
          `Over ${W}-start windows the residual swung from ${sgn(Math.min(...vals), 2)} to ${sgn(Math.max(...vals), 2)} and crossed zero ${crossings} ${crossings === 1 ? 'time' : 'times'}. ` +
          `After the break the ERA was ${f2(eraOf(post))} against a ${f2(weightedModelERA(post))} model ERA. That swing is too big and too recent to call a trait.`,
      },
      caveat(
        `Per-start Pitching+ is synthetic, anchored to the real season value. A ${W}-start window is about ${num(windowPitches)} pitches, ${windowPitches < minPitches ? 'below' : 'barely past'} Pitching+'s ~${minPitches}-pitch stable point. Model ERA, and the results grade built on it, are an illustrative rescale (ERA 4.00 = Pitching+ 100), not an R&D model.`,
      ),
    ],
    modelsUsed: [{ key: 'pitching', n: cur.pitches, scope: `${starts.length} starts` }],
    followUps: ['era-real', 'stuff-decay'],
  }
}

// ---- 6. Location: two-strike knuckle curves to lefties -----------------------
// Coarse regions of a location view, named from the batter's side. Catcher's
// view: a left-handed batter stands on the catcher's right (x > 0).
function regionsFor(view, stand) {
  const z0 = view.szBot
  const z1 = view.szTop
  const h = (z1 - z0) / 3
  const W = ZONE_HALF_WIDTH
  const inside = (x) => (stand === 'L' ? x > 0 : x < 0)
  const row = (z) => (z > z1 ? 'above' : z > z1 - h ? 'up' : z > z0 + h ? 'mid' : z >= z0 ? 'low' : 'below')
  const col = (x) => (Math.abs(x) > W ? (inside(x) ? 'offIn' : 'offAway') : Math.abs(x) <= W / 3 ? 'mid' : inside(x) ? 'in' : 'away')
  const AT = { up: 'up in the zone', mid: 'belt-high', low: 'at the knees' }
  const COL = { offIn: 'strip just off the plate inside', in: 'inner third', mid: 'middle third', away: 'outer third', offAway: 'strip just off the plate away' }
  const SIDE = { offIn: 'inside', in: 'inside', mid: 'middle', away: 'away', offAway: 'away' }
  const name = (r, c) => {
    if (r === 'mid' && c === 'mid') return 'the heart of the zone'
    if (r === 'above') return 'the area above the zone'
    if (r === 'below') return SIDE[c] === 'middle' ? 'the chase area below the knees' : `the chase area low and ${SIDE[c]}`
    return `the ${COL[c]} ${AT[r]}`
  }
  const regions = new Map()
  for (const c of view.cells) {
    const r = row(c.z)
    const k = col(c.x)
    const key = r === 'above' ? r : r === 'below' ? `${r}|${SIDE[k]}` : `${r}|${k}`
    const reg = regions.get(key) ?? { name: name(r, k), n: 0, sum: 0 }
    reg.n += c.n
    reg.sum += c.n * c.value
    regions.set(key, reg)
  }
  return [...regions.values()].map((r) => ({ ...r, v: r.sum / r.n }))
}

function kcLocation(ctx) {
  const kc = pitchOf(ctx, 'KC')
  const filter = { pitch: 'KC', count: 'TWO', hand: 'L' }
  const view = locationView(ctx.summary, { type: filter.pitch, count: filter.count, stand: filter.hand })
  const regions = regionsFor(view, filter.hand)
  const eligible = regions.filter((r) => r.n >= Math.max(5, 0.05 * view.n))
  const best = eligible.reduce((a, b) => (b.v > a.v ? b : a))
  const danger = eligible.reduce((a, b) => (b.v < a.v ? b : a))
  const common = regions.reduce((a, b) => (b.n > a.n ? b : a))
  const grade = locGrade(view.locationPlus)
  const stable = view.n >= stableAt('location')
  const scope = 'KC · 2 strikes · vs LHB'

  return {
    id: 'kc-location',
    category: 'Location',
    prompt: 'Where should he throw the knuckle curve with two strikes against lefties?',
    triggers: ['where*', 'location*', 'locate', 'zone', 'heatmap*', 'heat map*', 'two strikes', '2 strikes', 'two-strike', '2-strike', 'lefties', 'lefty', 'lhb', 'left-handed', 'throw', 'bury', 'curveball', 'knuckle curve'],
    steps: [
      loading(ctx),
      { label: `Querying Location+ ${getModel('location').version} (KC, n=${num(kc.pitches)})`, durationMs: 650 },
      { label: `Filtering: 2 strikes · vs LHB (n=${num(view.n)})`, durationMs: 550 },
      { label: 'Smoothing the location grid (0.25 ft kernel)', durationMs: 800 },
    ],
    blocks: [
      {
        type: 'text',
        md:
          `**With two strikes on a lefty, aim the knuckle curve at ${best.name}, where it scores best (Location+ ${r0(best.v)}), and keep it away from ${danger.name} (${r0(danger.v)}).**\n\n` +
          `Cavalli has thrown ${num(view.n)} knuckle curves to lefties with two strikes. Their Location+ averages ${r0(view.locationPlus)}, grade ${chip(grade)} (${lower(gradeWord(grade))}), against ${r0(kc.locationPlus)} for the pitch overall.`,
      },
      { type: 'heatmap', title: 'Knuckle curve · 2 strikes · vs LHB', sub: 'Catcher’s view · smoothed', filter },
      {
        type: 'text',
        md: `Most of these land ${common.name} (${r0((100 * common.n) / view.n)}% of them).${common === best ? ' That is already the best spot, so the plan is to repeat it.' : ` Moving more of them to ${best.name} is the gain on the table.`}`,
      },
      caveat(
        `${num(view.n)} pitches is ${stable ? 'above' : 'below'} Location+'s ~${stableAt('location')}-pitch stable point, so read this slice ${stable ? 'with some confidence' : 'as directional'}. ` +
          `Batter hand is a display filter; Location+ doesn't use it. The locations are real, but the map's Location+ values are synthetic.`,
      ),
    ],
    modelsUsed: [{ key: 'location', n: view.n, scope }],
    followUps: ['kc-vs-sw', 'stuff-decay'],
  }
}

// ---- 7. Future models: Stuff Decay+ (registry entry + data only) ------------
function stuffDecay(ctx) {
  const decay = ctx.synthetic.stuff_decay
  const model = getModel('stuffDecay')
  const rows = ctx.pitcher.arsenal
    .filter((p) => decay.by_pitch[p.type])
    .map((p) => {
      const v = decay.by_pitch[p.type]
      return { p, v, first: v[0], last: v[v.length - 1], drop: v[v.length - 1] - v[0] }
    })
  // A pitch "holds" when it loses less than 2 Stuff+ points from first bucket to last.
  const holders = rows.filter((r) => r.drop > -2)
  const faders = rows.filter((r) => r.drop <= -2).sort((a, b) => a.drop - b.drop)
  const worst = faders[0]
  const lastBucket = decay.buckets[decay.buckets.length - 1]
  const lateShare = decay.bucket_share[decay.bucket_share.length - 1]
  const lateFrom = decay.buckets[3].split('-')[0]
  const after = parseInt(lastBucket, 10) - 1
  const lateLeaders = [...holders].sort((a, b) => b.last - a.last).slice(0, 2)
  const g = (r, v) => stuffGradeFor(r.p.type, v)
  const pname2 = (r) => pname(r.p)

  return {
    id: 'stuff-decay',
    category: 'Future models',
    prompt: 'Does his stuff hold up deep into starts?',
    triggers: ['deep*', 'deep into', 'late', 'fatigue*', 'tire', 'decay*', 'stamina*', 'times through', 'third time', 'pitch count', 'hold up', 'holds up', 'innings'],
    steps: [
      loading(ctx),
      { label: `Loading ${model.label} ${model.version} from the model registry (new model)`, durationMs: 700 },
      { label: `Querying ${model.label} by pitch-count bucket (${decay.buckets.length} buckets)`, durationMs: 750 },
      { label: 'Comparing early vs late Stuff+ by pitch', durationMs: 550 },
    ],
    blocks: [
      {
        type: 'text',
        md:
          `**Mostly yes: the ${listOf(holders.map(pname2))} hold${holders.length === 1 ? 's' : ''} up deep into starts, but the ${pname(worst.p)} fades from ${r0(worst.first)} to ${r0(worst.last)} Stuff+ after pitch ${after}.**\n\n` +
          `That takes the ${pname(worst.p)} from grade ${chip(g(worst, worst.first))} early to ${chip(g(worst, worst.last))} late. First bucket to last, by pitch:\n\n` +
          rows.map((r) => `- **${r.p.savantType}** ${r0(r.first)} → ${r0(r.last)} (${sgn(r.drop)})`).join('\n'),
      },
      {
        type: 'chart',
        title: `${model.label} by pitch count`,
        sub: 'Stuff+ within a start, one line per pitch',
        spec: {
          kind: 'line',
          categories: decay.buckets.map((b) => (b.endsWith('+') ? b : b.replace('-', '–'))),
          series: rows.map((r) => ({ name: r.p.savantType, color: r.p.color, values: r.v, points: true })),
          axes: { x: { label: 'Pitch of the start' }, y: { label: 'Stuff+' } },
          annotations: [{ type: 'hline', y: 100, label: 'League avg' }],
        },
      },
      {
        type: 'text',
        md: `**From about pitch ${lateFrom} on, lean on the ${listOf(lateLeaders.map(pname2))}**, and use the ${pname(worst.p)} to change eye levels rather than to finish hitters. ${listOf(faders.map((r) => r.p.savantType))} all lose ${f1(-faders.at(-1).drop)} to ${f1(-worst.drop)} points by the last bucket.`,
      },
      caveat(
        `${model.label} is hypothetical: it was added to the model registry with synthetic data to show how a new model output appears here, with no new page code. ` +
          `Only ${r0(lateShare * 100)}% of pitches come in the ${lastBucket} bucket, so the last point is thin.`,
      ),
    ],
    modelsUsed: [
      { key: 'stuffDecay', n: ctx.totalPitches, scope: SEASON.toString() },
      { key: 'stuff', n: ctx.totalPitches, scope: SEASON.toString() },
    ],
    followUps: ['ff-ride', 'skill-proof'],
  }
}

// ---- Registry ------------------------------------------------------------------
const BUILDERS = [ffRide, chGrip, kcVsSweeper, eraReal, skillProof, kcLocation, stuffDecay]

/** All scripted conversations, computed from the loaded context. */
export const buildScripts = (ctx) => BUILDERS.map((b) => b(ctx))

// The landing page's sample prompts, all shown. 'stuff-decay' is left out: it
// needs a model that doesn't exist yet, so the page shows COMING_SOON instead.
export const SAMPLE_IDS = ['ff-ride', 'era-real', 'kc-location', 'ch-grip', 'kc-vs-sw', 'skill-proof']
export const COMING_SOON = {
  category: 'Future model',
  prompt: 'Does his stuff hold up deep into starts? Stuff Decay+ will answer this once R&D ships it.',
}

/** Honest non-answers: never fake an answer to an unmatched question. */
export function fallbackScript(ctx, otherName = null) {
  const name = ctx.pitcher.name
  return {
    id: otherName ? 'other-pitcher' : 'unmatched',
    steps: [{ label: 'Matching the question to the demo set', durationMs: 500 }],
    blocks: [
      {
        type: 'text',
        md: otherName
          ? `**This demo only covers ${name}.** I found ${otherName} in the question, but model answers for other pitchers aren't loaded here, and I won't guess. Try one of these about ${name}:`
          : `**I can't answer that one in this demo.** It answers a fixed set of questions about ${name}'s ${SEASON} season, and I won't guess beyond them. Try one of these:`,
      },
    ],
    modelsUsed: [],
    followUps: SAMPLE_IDS.slice(0, 3),
  }
}
