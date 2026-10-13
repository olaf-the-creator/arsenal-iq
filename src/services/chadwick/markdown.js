// A small Markdown subset for Chadwick answers: paragraphs, "- " lists, **bold**
// and [[55]] grade chips. Content is our own scripted text (or, later, model
// output), escaped before any markup is added.
import { gradeColor, gradeTextColor } from '../../utils/grades.js'

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function inline(text) {
  return escapeHtml(text)
    .replace(/\[\[(\d{2})\]\]/g, (_, g) => {
      const n = Number(g)
      return `<span class="gchip" style="background:${gradeColor(n)};color:${gradeTextColor(n)}" title="20-80 grade">${n}</span>`
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

/**
 * HTML for a Markdown string. A half-typed chip is hidden and an open ** is
 * closed, so partial text (streaming, or stopped mid-answer) renders cleanly.
 */
export function renderMarkdown(md) {
  let src = md
  const open = src.lastIndexOf('[[')
  if (open > src.lastIndexOf(']]')) src = src.slice(0, open)
  if ((src.match(/\*\*/g) ?? []).length % 2) src += '**'
  return src
    .split(/\n{2,}/)
    .filter((b) => b.trim())
    .map((block) => {
      const lines = block.split('\n')
      if (lines.every((l) => l.startsWith('- '))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`
      return `<p>${lines.map(inline).join('<br>')}</p>`
    })
    .join('')
}

/** Plain text for copying: markup removed, chips as their numbers. */
export const markdownToText = (md) => md.replace(/\*\*/g, '').replace(/\[\[(\d{2})\]\]/g, '$1')
