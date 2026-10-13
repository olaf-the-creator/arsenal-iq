// Chadwick's response provider: getResponse(prompt, context) yields a stream
// of events the UI renders. Today it's backed by the scripted answers in
// scripts.js and simulates a model's pacing.
//
// SWAP POINT for a real LLM: keep this signature and the event shapes below.
// A Rails endpoint would stream the model's output (e.g. server-sent events),
// with the model calling tools that query the Stuff+, Location+ and Pitching+
// APIs and emitting the same block schema (text, chart, table, heatmap,
// compare, callout, checklist). The UI doesn't change.
//
// Events, in order:
//   { type: 'thinking' }
//   { type: 'meta', modelsUsed: [{ key, n, scope }], role }
//   { type: 'step', index, label, status: 'running' | 'done' }
//   { type: 'block', index, block }          non-text block, complete
//   { type: 'block', index, block: {…, md: ''} } then
//   { type: 'text', index, delta }            text and callout blocks stream
//   { type: 'done', followUps: [{ id, prompt }] }
import { buildScripts, fallbackScript } from './scripts.js'
import { loadChadwickContext } from './context.js'
import { matchPrompt } from './match.js'

const STREAMED = new Set(['text', 'callout'])

// Resolves after ms, or early when the signal aborts.
function wait(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve()
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true })
  })
}

// Chunks of one to three words with their trailing spaces, so text arrives
// word by word at an uneven pace.
function chunks(md) {
  const words = md.match(/\S+\s*/g) ?? []
  const out = []
  for (let i = 0; i < words.length; ) {
    const n = 1 + Math.floor(Math.random() * 3)
    out.push(words.slice(i, i + n).join(''))
    i += n
  }
  return out
}

const pause = (chunk) => (/[.:!?]\s*$/.test(chunk) ? 140 : /\n/.test(chunk) ? 90 : 0) + 22 + Math.random() * 48

/** The scripted answer for a prompt (or an honest fallback). */
export async function resolveScript(prompt) {
  const ctx = await loadChadwickContext()
  const scripts = buildScripts(ctx)
  const match = matchPrompt(prompt, scripts, { pitcherName: ctx.pitcher.name, roster: ctx.roster })
  const script = match.script ?? fallbackScript(ctx, match.otherPitcher)
  const prompts = new Map(scripts.map((s) => [s.id, s.prompt]))
  return { script, role: ctx.pitcher.role, followUps: script.followUps.map((id) => ({ id, prompt: prompts.get(id) })) }
}

/**
 * Streams the answer to a prompt. context: { signal (AbortSignal), instant
 * (skip pacing, e.g. prefers-reduced-motion) }.
 */
export async function* getResponse(prompt, { signal, instant = false } = {}) {
  const sleep = (ms) => (instant ? Promise.resolve() : wait(ms, signal))
  yield { type: 'thinking' }
  const [{ script, role, followUps }] = await Promise.all([resolveScript(prompt), sleep(600 + Math.random() * 300)])
  if (signal?.aborted) return
  yield { type: 'meta', modelsUsed: script.modelsUsed, role }

  for (const [index, step] of script.steps.entries()) {
    yield { type: 'step', index, label: step.label, status: 'running' }
    await sleep(step.durationMs)
    if (signal?.aborted) return
    yield { type: 'step', index, label: step.label, status: 'done' }
  }

  for (const [index, block] of script.blocks.entries()) {
    if (!STREAMED.has(block.type) || instant) {
      yield { type: 'block', index, block }
      await sleep(STREAMED.has(block.type) ? 0 : 450)
    } else {
      yield { type: 'block', index, block: { ...block, md: '' } }
      for (const delta of chunks(block.md)) {
        await sleep(pause(delta))
        if (signal?.aborted) return
        yield { type: 'text', index, delta }
      }
      await sleep(250)
    }
    if (signal?.aborted) return
  }
  yield { type: 'done', followUps }
}
