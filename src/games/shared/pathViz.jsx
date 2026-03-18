import { palette } from '../../theme.js'

// ── Segment offset spreading ───────────────────────────────────────────────────
// When multiple path segments traverse the same board edge they overlap in SVG.
// We spread them apart perpendicular to their direction so each is legible.
//
// Lateral segments (L/R)  → spread vertically   (yOffsets)
// Vertical segments (U/D) → spread horizontally  (xOffsets)
//
// Grouping is by EDGE (the unordered pair of cells a segment connects).
// Only segments that share the exact same edge — going either way — truly
// overlap and need spreading. Segments that merely share a row or column but
// connect different cells are NOT grouped together.
//
// Symmetric spread formula (k = order of first appearance, 0-based):
//   offset[k] = ((count − 1) / 2 − k) × SPREAD
//
// Examples (SPREAD = 0.18 SVG units):
//   count 1: [0]
//   count 2: [+0.09, −0.09]
//   count 3: [+0.18,  0,  −0.18]
//   count 4: [+0.27, +0.09, −0.09, −0.27]

const SPREAD = 0.18

function applySpread(segIndices, offsets) {
  const count = segIndices.length
  for (let k = 0; k < count; k++) {
    offsets[segIndices[k]] = ((count - 1) / 2 - k) * SPREAD
  }
}

export function computeSegmentOffsets(history) {
  const n = history.length - 1
  const xOffsets = new Array(n).fill(0)
  const yOffsets = new Array(n).fill(0)

  // Group segment indices by their canonical edge key.
  // Canonical form: the node with the smaller row (or smaller col if same row)
  // is listed first, so forward and backward traversals get the same key.
  const byEdge = {}
  for (let i = 0; i < n; i++) {
    const [c1, r1] = history[i]
    const [c2, r2] = history[i + 1]
    const key = (r1 < r2 || (r1 === r2 && c1 <= c2))
      ? `${c1},${r1}|${c2},${r2}`
      : `${c2},${r2}|${c1},${r1}`
    ;(byEdge[key] = byEdge[key] || []).push(i)
  }

  for (const segs of Object.values(byEdge)) {
    if (segs.length <= 1) continue
    const [c1, r1] = history[segs[0]]
    const [c2, r2] = history[segs[0] + 1]
    const isLateral = r1 === r2   // lateral → spread vertically; vertical → spread horizontally
    applySpread(segs, isLateral ? yOffsets : xOffsets)
  }

  return { xOffsets, yOffsets }
}

// ── Arrowhead helper ──────────────────────────────────────────────────────────
// Returns SVG polygon `points` string for a filled triangle arrowhead whose
// tip sits exactly at (x2,y2). Returns null for degenerate segments.
export function arrowHead(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 0.01) return null
  const ux = dx / len, uy = dy / len
  const px = -uy,     py = ux
  const L = 0.14, W = 0.10
  const lx = x2 - ux * L + px * W,  ly = y2 - uy * L + py * W
  const rx = x2 - ux * L - px * W,  ry = y2 - uy * L - py * W
  return `${x2.toFixed(3)},${y2.toFixed(3)} ${lx.toFixed(3)},${ly.toFixed(3)} ${rx.toFixed(3)},${ry.toFixed(3)}`
}

// ── Path color helpers ────────────────────────────────────────────────────────
// During a flash: first occurrence of the repeat → green, second → pink.
export function segColor(i, flash) {
  if (!flash) return palette.objBasicBlue
  const { start, unitLen } = flash
  if (i >= start && i < start + unitLen) return palette.correctGreen
  if (i >= start + unitLen && i < start + 2 * unitLen) return palette.objBasicPink
  return palette.objBasicBlue
}

export function dotColor(i, flash) {
  if (!flash) return palette.objBasicBlue
  const { start, unitLen } = flash
  if (i >= start && i < start + unitLen) return palette.correctGreen
  if (i >= start + unitLen && i <= start + 2 * unitLen) return palette.objBasicPink
  return palette.objBasicBlue
}

// ── PathLayer ─────────────────────────────────────────────────────────────────
// Renders path segments (with arrowheads + parallel spreading) and dots.
//
// Props:
//   displayHistory  – array of [col, row] positions (may include proposed ghost)
//   flash           – { start, unitLen, proposedPos } | null
//   toSvgCoord      – function(col, row) → [svgX, svgY]
//   hidePlayerDot   – when true, skips the dot at the last node if no flash is
//                     active (use in games that draw the player marker separately
//                     on top of the current position)
//   getSegColor     – optional function(segIndex: number) => cssColor string.
//                     When provided, overrides the default flash-based segment
//                     coloring. Useful for validation-coloured paths (e.g.
//                     NumberLabyrinth) where flash is always null.
//   getDotColor     – optional function(dotIndex: number) => cssColor string.
//                     dotIndex is 1-based (matches the slice(1) iteration).
//                     When provided, overrides the default flash-based dot color.
export function PathLayer({ displayHistory, flash, toSvgCoord, hidePlayerDot = false, getSegColor, getDotColor }) {
  if (displayHistory.length <= 1) return null
  const { xOffsets, yOffsets } = computeSegmentOffsets(displayHistory)

  return (
    <>
      {/* ── Segments with arrowheads ── */}
      {displayHistory.slice(0, -1).map((from, i) => {
        const to = displayHistory[i + 1]
        const xOff = xOffsets[i], yOff = yOffsets[i]
        const [x1b, y1b] = toSvgCoord(from[0], from[1])
        const [x2b, y2b] = toSvgCoord(to[0], to[1])
        const x1 = x1b + xOff, y1 = y1b + yOff
        const x2 = x2b + xOff, y2 = y2b + yOff
        const inRepeat = flash && i >= flash.start && i < flash.start + 2 * flash.unitLen
        const color   = getSegColor ? getSegColor(i) : segColor(i, flash)
        const sw      = flash ? 0.08 : 0.055
        const opacity = flash ? (inRepeat ? 1 : 0.28) : 0.85
        const lx1 = x1 + 0.20 * (x2 - x1),  ly1 = y1 + 0.20 * (y2 - y1)
        const lx2 = x1 + 0.68 * (x2 - x1),  ly2 = y1 + 0.68 * (y2 - y1)
        const atx  = x1 + 0.85 * (x2 - x1),  aty  = y1 + 0.85 * (y2 - y1)
        const arrPts = arrowHead(x1, y1, atx, aty)
        return (
          <g key={`seg-${i}`} style={{ pointerEvents: 'none' }}>
            <line
              x1={lx1} y1={ly1} x2={lx2} y2={ly2}
              stroke={color} strokeWidth={sw}
              strokeLinecap="round" opacity={opacity}
            />
            {arrPts && (
              <polygon points={arrPts} fill={color} opacity={opacity} />
            )}
          </g>
        )
      })}

      {/* ── Dots at visited nodes (skip index 0 = start) ── */}
      {displayHistory.slice(1).map(([c, r], idx) => {
        const i = idx + 1
        const isLast = i === displayHistory.length - 1
        if (hidePlayerDot && !flash && isLast) return null
        const isProposed = flash && isLast
        const [cx, cy] = toSvgCoord(c, r)
        const inRepeat = flash && i >= flash.start && i <= flash.start + 2 * flash.unitLen
        return (
          <circle
            key={`dot-${i}`}
            cx={cx} cy={cy}
            r={isProposed ? 0.2 : 0.1}
            fill={getDotColor ? getDotColor(i) : dotColor(i, flash)}
            opacity={flash ? (inRepeat ? (isProposed ? 0.65 : 1) : 0.25) : 1}
            style={{ pointerEvents: 'none' }}
          />
        )
      })}
    </>
  )
}
