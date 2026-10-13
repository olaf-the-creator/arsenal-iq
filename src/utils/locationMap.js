// Canvas drawing for the Location+ map, shared by the profile's
// LocationHeatmap and Chadwick's heatmap answers so both render the same way.
// Catcher's view; takes a roll-up from services/locations.js locationView().
import { DOMAIN, ZONE_HALF_WIDTH } from '../services/locations.js'
import { divergingRgb } from './grades.js'

export const SPAN = 12 // Location+ points from 100 to full color
const PLATE_ROOM = 30 // room for the plate below the plotted area

const color = (v) => divergingRgb((v - 100) / SPAN)

/**
 * Draws a location view onto a canvas at width x height CSS pixels.
 * mode 'smooth': Gaussian kernel smoothing of the cells (weighted by pitches)
 * on a finer grid, faded where he rarely throws so sparse areas don't read as
 * signal. mode 'raw': the summary cells re-binned into hexagons;
 * hexes with a single pitch are skipped.
 */
export function drawLocationMap(canvas, view, { width, height, mode = 'smooth' }) {
  if (!canvas) return
  const plotH = height - PLATE_ROOM
  const PX = (x) => ((x - DOMAIN.x0) / (DOMAIN.x1 - DOMAIN.x0)) * width
  const PY = (z) => ((DOMAIN.z1 - z) / (DOMAIN.z1 - DOMAIN.z0)) * plotH

  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#fafbfc'
  ctx.fillRect(0, 0, width, height)

  const { cells } = view
  if (cells.length && mode === 'smooth') {
    const NX = 44
    const NZ = 50
    const H2 = 2 * 0.25 * 0.25 // 0.25 ft bandwidth
    const off = document.createElement('canvas')
    off.width = NX
    off.height = NZ
    const octx = off.getContext('2d')
    const img = octx.createImageData(NX, NZ)
    const val = new Float32Array(NX * NZ)
    const den = new Float32Array(NX * NZ)
    let maxD = 0
    for (let j = 0; j < NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const x = DOMAIN.x0 + ((i + 0.5) / NX) * (DOMAIN.x1 - DOMAIN.x0)
        const z = DOMAIN.z1 - ((j + 0.5) / NZ) * (DOMAIN.z1 - DOMAIN.z0)
        let sw = 0
        let sv = 0
        for (const c of cells) {
          const d2 = (c.x - x) ** 2 + (c.z - z) ** 2
          if (d2 > 0.6) continue
          const w = c.n * Math.exp(-d2 / H2)
          sw += w
          sv += w * c.value
        }
        const k = j * NX + i
        den[k] = sw
        val[k] = sw ? sv / sw : 100
        maxD = Math.max(maxD, sw)
      }
    }
    for (let k = 0; k < NX * NZ; k++) {
      const alpha = Math.min(den[k] / (0.3 * maxD || 1), 1) ** 0.8
      img.data.set([...color(val[k]), Math.round(alpha * 235)], k * 4)
    }
    octx.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(off, 0, 0, width, plotH)
  } else if (cells.length) {
    // Hexagonal bins: the summary's square cells are re-binned by center into a
    // pointy-top hex grid (in pixels, so hexes stay regular), averaging Location+
    // weighted by pitches. A backend could bin hexes directly.
    const R = 15 // hex side in px, about the area of a 0.25 ft square
    const bins = new Map()
    for (const c of cells) {
      const px = PX(c.x)
      const py = PY(c.z)
      // Pixel to fractional axial coordinates, then cube-round.
      const q = ((Math.sqrt(3) / 3) * px - py / 3) / R
      const r = (2 / 3) * py / R
      let rq = Math.round(q)
      let rr = Math.round(r)
      const rs = Math.round(-q - r)
      const dq = Math.abs(rq - q)
      const dr = Math.abs(rr - r)
      const ds = Math.abs(rs - (-q - r))
      if (dq > dr && dq > ds) rq = -rr - rs
      else if (dr > ds) rr = -rq - rs
      const key = `${rq},${rr}`
      const b = bins.get(key) || { q: rq, r: rr, n: 0, sv: 0 }
      b.n += c.n
      b.sv += c.n * c.value
      bins.set(key, b)
    }
    for (const b of bins.values()) {
      if (b.n < 2) continue
      const cx = R * Math.sqrt(3) * (b.q + b.r / 2)
      const cy = R * 1.5 * b.r
      ctx.fillStyle = `rgb(${color(b.sv / b.n).join(' ')})`
      ctx.beginPath()
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI / 180) * (60 * k - 30)
        const hx = cx + (R - 0.4) * Math.cos(ang)
        const hy = cy + (R - 0.4) * Math.sin(ang)
        if (k === 0) ctx.moveTo(hx, hy)
        else ctx.lineTo(hx, hy)
      }
      ctx.closePath()
      ctx.fill()
    }
  }

  // Strike zone at the average zone of the batters in view, in thirds.
  const Z = { x0: -ZONE_HALF_WIDTH, x1: ZONE_HALF_WIDTH, z0: view.szBot ?? 1.5, z1: view.szTop ?? 3.4 }
  ctx.strokeStyle = '#1b1f2a'
  ctx.lineWidth = 2
  ctx.strokeRect(PX(Z.x0), PY(Z.z1), PX(Z.x1) - PX(Z.x0), PY(Z.z0) - PY(Z.z1))
  ctx.lineWidth = 0.7
  ctx.strokeStyle = 'rgb(27 31 42 / 0.35)'
  for (let k = 1; k < 3; k++) {
    const x = Z.x0 + (k * (Z.x1 - Z.x0)) / 3
    const z = Z.z0 + (k * (Z.z1 - Z.z0)) / 3
    ctx.beginPath()
    ctx.moveTo(PX(x), PY(Z.z0))
    ctx.lineTo(PX(x), PY(Z.z1))
    ctx.moveTo(PX(Z.x0), PY(z))
    ctx.lineTo(PX(Z.x1), PY(z))
    ctx.stroke()
  }
  // Home plate.
  const py = height - 22
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#9aa0ad'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(PX(-0.71), py)
  ctx.lineTo(PX(0.71), py)
  ctx.lineTo(PX(0.71), py + 7)
  ctx.lineTo(PX(0), py + 14)
  ctx.lineTo(PX(-0.71), py + 7)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}
