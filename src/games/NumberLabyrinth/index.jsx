import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from '../../theme.js'
import { PathLayer } from '../shared/pathViz.jsx'

// ── Level config ───────────────────────────────────────────────────────────────
const LEVELS = {
  1: { cols: 4, rows: 5, minVal: 0, maxVal: 120 },
  2: { cols: 5, rows: 5, minVal: 0, maxVal: 300 },
  3: { cols: 6, rows: 6, minVal: 0, maxVal: 500 },
  4: { cols: 7, rows: 7, minVal: 0, maxVal: 700 },
  5: { cols: 8, rows: 8, minVal: 8, maxVal: 999 },
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]

function getNeighbors(c, r, cols, rows) {
  return DIRS
    .map(([dc, dr]) => [c + dc, r + dr])
    .filter(([nc, nr]) => nc >= 0 && nc < cols && nr >= 0 && nr < rows)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Solution path generation ───────────────────────────────────────────────────
// Generates a path from (0,0) to (cols-1, rows-1) of exactly targetLen cells.
// Uses biased random walk with backtracking-safe pruning.
function generateSolutionPath(cols, rows, targetLen) {
  const gcol = cols - 1, grow = rows - 1

  function dist(c, r) {
    return Math.abs(gcol - c) + Math.abs(grow - r)
  }

  for (let attempt = 0; attempt < 500; attempt++) {
    const path = [[0, 0]]
    const visited = new Set(['0,0'])
    let c = 0, r = 0

    while (path.length < targetLen) {
      const left = targetLen - path.length
      const d = dist(c, r)

      if (d === 0) break // arrived at goal before filling targetLen

      // Only consider neighbors that still allow reaching goal within remaining steps
      const cands = getNeighbors(c, r, cols, rows)
        .filter(([nc, nr]) => !visited.has(`${nc},${nr}`) && dist(nc, nr) <= left - 1)

      if (cands.length === 0) break

      const pool = shuffle(cands)
      // When very close to needing to commit toward goal, bias toward it
      if (left - d <= 3) pool.sort((a, b) => dist(a[0], a[1]) - dist(b[0], b[1]))

      const [nc, nr] = pool[0]
      visited.add(`${nc},${nr}`)
      c = nc; r = nr
      path.push([c, r])
    }

    if (c === gcol && r === grow && path.length === targetLen) return path
  }

  // Fallback: simple L-shaped path
  const path = [[0, 0]]
  let pc = 0, pr = 0
  while (pc < cols - 1) { pc++; path.push([pc, pr]) }
  while (pr < rows - 1) { pr++; path.push([pc, pr]) }
  return path
}

// ── Board number generation ────────────────────────────────────────────────────
// Implements the 4-step filling algorithm described in the game spec.
function getFieldNumbers(cols, rows, minVal, maxVal) {
  const T = cols * rows
  const K = maxVal
  const minLen = Math.floor(0.35 * T)
  const maxLen = Math.floor(0.55 * T)

  // Try increasing path lengths until one succeeds
  let solutionPath = null
  for (let len = minLen; len <= maxLen && !solutionPath; len++) {
    const p = generateSolutionPath(cols, rows, len)
    if (p[p.length - 1][0] === cols - 1 && p[p.length - 1][1] === rows - 1) {
      solutionPath = p
    }
  }
  if (!solutionPath) {
    solutionPath = [[0, 0]]
    let pc = 0, pr = 0
    while (pc < cols - 1) { pc++; solutionPath.push([pc, pr]) }
    while (pr < rows - 1) { pr++; solutionPath.push([pc, pr]) }
  }

  // Step 1: assign strictly ascending numbers to solution path
  const L = solutionPath.length
  const uniqueVals = new Set()
  let att = 0
  while (uniqueVals.size < L && att < 200000) {
    uniqueVals.add(minVal + Math.floor(Math.random() * (maxVal - minVal + 1)))
    att++
  }
  const pathNumbers = [...uniqueVals].sort((a, b) => a - b)
  while (pathNumbers.length < L) pathNumbers.push(pathNumbers[pathNumbers.length - 1] + 1)

  const grid = Array.from({ length: rows }, () => new Array(cols).fill(null))
  const pathSet = new Set()
  for (let i = 0; i < solutionPath.length; i++) {
    const [c, r] = solutionPath[i]
    grid[r][c] = pathNumbers[i]
    pathSet.add(`${c},${r}`)
  }

  // Step 2: neighbors of path cells → random values < K/2
  const step2Set = new Set()
  for (const [c, r] of solutionPath) {
    for (const [nc, nr] of getNeighbors(c, r, cols, rows)) {
      if (grid[nr][nc] === null) {
        grid[nr][nc] = Math.floor(Math.random() * (K / 2))
        step2Set.add(`${nc},${nr}`)
      }
    }
  }

  // Step 3: neighbors of step-2 cells → values strictly > their step-2 neighbors
  for (const key of step2Set) {
    const [c, r] = key.split(',').map(Number)
    for (const [nc, nr] of getNeighbors(c, r, cols, rows)) {
      if (grid[nr][nc] === null) {
        let maxNeighbor = 0
        for (const [nnc, nnr] of getNeighbors(nc, nr, cols, rows)) {
          if (step2Set.has(`${nnc},${nnr}`)) {
            maxNeighbor = Math.max(maxNeighbor, grid[nnr][nnc] ?? 0)
          }
        }
        const minAllowed = maxNeighbor + 1
        const range = maxVal - minAllowed
        grid[nr][nc] = range > 0 ? minAllowed + Math.floor(Math.random() * range) : maxVal
      }
    }
  }

  // Step 4: remaining cells → random values < K/2.2
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === null) {
        grid[r][c] = Math.floor(Math.random() * (K / 2.2))
      }
    }
  }

  return { grid, solutionPath }
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function NumberLabyrinth({ level = 1, onComplete }) {
  const { t } = useTranslation()
  const { cols, rows, minVal, maxVal } = LEVELS[level] ?? LEVELS[1]

  // Board is generated once on mount; remount (Start New) regenerates it.
  const [boardData] = useState(() => getFieldNumbers(cols, rows, minVal, maxVal))
  const { grid } = boardData

  const [pos, setPos]               = useState([0, 0])
  const [history, setHistory]       = useState([[0, 0]])
  const [validated, setValidated]   = useState(false)
  const [invalidSteps, setInvalidSteps] = useState(new Set())
  const [won, setWon]               = useState(false)

  const atGoal = pos[0] === cols - 1 && pos[1] === rows - 1

  // ── Movement ─────────────────────────────────────────────────────────────
  // Moving in the opposite direction of the previous move undoes that move
  // instead of adding a new step.
  const tryMove = useCallback((dir) => {
    if (validated) return
    const DELTAS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }
    const [dc, dr] = DELTAS[dir]
    const [c, r] = pos
    const nc = c + dc, nr = r + dr
    if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) return
    // Undo: target cell is where we came from (second-to-last in history)
    if (history.length >= 2) {
      const [pc, pr] = history[history.length - 2]
      if (nc === pc && nr === pr) {
        setPos([pc, pr])
        setHistory(h => h.slice(0, -1))
        return
      }
    }
    setPos([nc, nr])
    setHistory(h => [...h, [nc, nr]])
  }, [pos, validated, cols, rows, history])

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const keyMap = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' }
    const onKey = (e) => {
      const dir = keyMap[e.key]
      if (dir) { e.preventDefault(); tryMove(dir) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tryMove])

  // ── Click adjacent cell ───────────────────────────────────────────────────
  const handleCellClick = useCallback((cc, cr) => {
    if (validated) return
    const [c, r] = pos
    const dc = cc - c, dr = cr - r
    if (Math.abs(dc) + Math.abs(dr) !== 1) return
    const dir = dc === 1 ? 'R' : dc === -1 ? 'L' : dr === 1 ? 'D' : 'U'
    tryMove(dir)
  }, [pos, validated, tryMove])

  // ── Done: validate path ───────────────────────────────────────────────────
  const handleDone = useCallback(() => {
    if (!atGoal || validated) return
    const invalid = new Set()
    for (let i = 0; i < history.length - 1; i++) {
      const [c1, r1] = history[i]
      const [c2, r2] = history[i + 1]
      if (grid[r2][c2] <= grid[r1][c1]) invalid.add(i)
    }
    setInvalidSteps(invalid)
    setValidated(true)
    if (invalid.size === 0) {
      setWon(true)
      onComplete?.({ correct: true, score: history.length - 1 })
    }
  }, [atGoal, validated, history, grid, onComplete])

  // ── Retry: reset path, keep same board ───────────────────────────────────
  const handleRetry = useCallback(() => {
    setPos([0, 0])
    setHistory([[0, 0]])
    setValidated(false)
    setInvalidSteps(new Set())
    setWon(false)
  }, [])

  // ── SVG helpers ──────────────────────────────────────────────────────────
  // Board (col, row): (0,0) = top-left, (cols-1, rows-1) = bottom-right.
  // SVG y-axis also increases downward, so no row-flip needed.
  const toSvgCoord = useCallback((c, r) => [c + 0.5, r + 0.5], [])

  const pad  = 0.55
  const vbW  = cols + 2 * pad
  const vbH  = rows + 2 * pad

  // Font size scaled down for larger boards to keep numbers readable
  const fontSize = cols <= 5 ? 0.36 : cols <= 7 ? 0.30 : 0.30

  // ── Path color helpers for validation state ──────────────────────────────
  // Passed to PathLayer as getSegColor / getDotColor overrides so that segments
  // and dots turn green (valid step) or red (invalid step) after the player
  // hits "Done". When not yet validated, both return the default blue.
  const getSegColor = (i) => validated
    ? (invalidSteps.has(i) ? palette.wrongRed : palette.correctGreen)
    : palette.objBasicBlue

  // dotIndex is 1-based; the step it validates is dotIndex-1 (0-based segment).
  const getDotColor = (i) => validated
    ? (invalidSteps.has(i - 1) ? palette.wrongRed : palette.correctGreen)
    : palette.objBasicBlue

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="w-full h-full flex flex-col items-center relative"
      style={{ background: palette.gameBg }}
    >
      {/* ── Top bar: Done / Retry ── */}
      <div className="flex items-center justify-center gap-4 py-2 shrink-0">
        {!validated && (
          <button
            onClick={handleDone}
            disabled={!atGoal}
            className="px-8 py-2 rounded-xl font-black text-xl text-white"
            style={{
              background: palette.btnBlue,
              opacity: atGoal ? 1 : 0.35,
              cursor: atGoal ? 'pointer' : 'not-allowed',
            }}
          >
            {t('numberLabyrinth.done')}
          </button>
        )}
        {validated && !won && (
          <>
            <span className="font-bold text-sm" style={{ color: palette.wrongRed }}>
              {t('numberLabyrinth.invalid', { count: invalidSteps.size })}
            </span>
            <button
              onClick={handleRetry}
              className="px-8 py-2 rounded-xl font-black text-xl text-white"
              style={{ background: palette.btnBlue }}
            >
              {t('numberLabyrinth.retry')}
            </button>
          </>
        )}
      </div>

      {/* ── Board SVG ── */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center px-2">
        <svg
          viewBox={`${-pad} ${-pad} ${vbW} ${vbH}`}
          style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* ── Cells ── */}
          {Array.from({ length: rows }, (_, row) =>
            Array.from({ length: cols }, (_, col) => {
              const light = (col + row) % 2 === 0
              return (
                <rect
                  key={`cell-${col}-${row}`}
                  x={col} y={row} width={1} height={1}
                  fill={light ? palette.boardCellLight : palette.boardCellDark}
                  stroke={palette.gameBg} strokeWidth={0.025}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCellClick(col, row)}
                />
              )
            })
          )}

          {/* ── Start marker: green flag (top-left, tilted 50° left outside board) ── */}
          {(() => {
            const sq = 0.095
            const fCols = 4, fRows = 3
            const flagW = fCols * sq, flagH = fRows * sq
            const poleX = 0.20, poleBaseY = 0.92, flagTop = 0.05
            const poleColor = palette.flagPoleColor
            return (
              <g style={{ pointerEvents: 'none' }}
                transform={`rotate(-20, ${poleX}, ${poleBaseY})`}>
                <line x1={poleX} y1={flagTop} x2={poleX} y2={poleBaseY}
                  stroke={poleColor} strokeWidth={0.05} strokeLinecap="round" />
                <rect x={poleX - flagW} y={flagTop} width={flagW} height={flagH}
                  fill={palette.correctGreen} opacity={0.92} />
              </g>
            )
          })()}

          {/* ── Goal: checkered flag (bottom-right, tilted 50° right outside board) ── */}
          {(() => {
            const sq = 0.095
            const fCols = 4, fRows = 3
            const flagW = fCols * sq, flagH = fRows * sq
            const poleX = cols - 0.20
            const poleBaseY = rows - 1 + 0.92, flagTop = rows - 1 + 0.05
            const poleColor = palette.flagPoleColor
            const checks = []
            for (let r = 0; r < fRows; r++) {
              for (let c = 0; c < fCols; c++) {
                if ((r + c) % 2 === 0) {
                  checks.push(
                    <rect key={`chk-${r}-${c}`}
                      x={poleX + c * sq} y={flagTop + r * sq}
                      width={sq} height={sq} fill="#222" opacity={0.9}
                    />
                  )
                }
              }
            }
            return (
              <g style={{ pointerEvents: 'none' }}
                transform={`rotate(20, ${poleX}, ${poleBaseY})`}>
                <line x1={poleX} y1={flagTop} x2={poleX} y2={poleBaseY}
                  stroke={poleColor} strokeWidth={0.05} strokeLinecap="round" />
                <rect x={poleX} y={flagTop} width={flagW} height={flagH}
                  fill="#eeeeee" opacity={0.92} />
                {checks}
              </g>
            )
          })()}

          {/* ── Path ── */}
          <PathLayer
            displayHistory={history}
            flash={null}
            toSvgCoord={toSvgCoord}
            hidePlayerDot={!validated}
            getSegColor={getSegColor}
            getDotColor={getDotColor}
          />

          {/* ── Player position: blue ring on current cell ──
               Outer diameter ≈ 95% of field width  → outer r ≈ 0.476
               Inner diameter = 93% of total         → inner r ≈ 0.442
               SVG stroke circle: r = midpoint = 0.459, strokeWidth = 0.034        ── */}
          {!won && (
            <circle
              cx={pos[0] + 0.5} cy={pos[1] + 0.5} r={0.436}
              fill="none"
              stroke={palette.objBasicBlue} strokeWidth={0.034}
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* ── Numbers (rendered last so they always appear above path and player marker) ── */}
          {Array.from({ length: rows }, (_, row) =>
            Array.from({ length: cols }, (_, col) => {
              const light = (col + row) % 2 === 0
              return (
                <text
                  key={`num-${col}-${row}`}
                  x={col + 0.5} y={row + 0.5}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={fontSize} fontWeight="bold"
                  fill={light ? palette.boardTextDark : palette.boardTextLight}
                  style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'Arial, sans-serif' }}
                >
                  {grid[row][col]}
                </text>
              )
            })
          )}
        </svg>
      </div>

{/* ── Win overlay ── */}
      {won && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.72)' }}
        >
          <div
            className="rounded-2xl text-center shadow-2xl"
            style={{ background: palette.gameHeader, padding: '36px 52px', minWidth: 260 }}
          >
            <div className="text-4xl font-black mb-5" style={{ color: palette.scoreYellow }}>
              {t('numberLabyrinth.wonTitle')}
            </div>
            <div className="text-lg mb-7" style={{ color: palette.silverGray }}>
              {t('numberLabyrinth.movesLabel')}:{' '}
              <span className="font-black" style={{ color: palette.white }}>{history.length - 1}</span>
            </div>
            <button
              onClick={handleRetry}
              className="rounded-xl px-8 py-3 text-xl font-black text-white transition-opacity hover:opacity-80 active:scale-95"
              style={{ background: palette.btnBlue }}
            >
              {t('numberLabyrinth.playAgain')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const meta = {
  id: 'number-labyrinth',
  title: 'Number Labyrinth',
  topics: ['numbers', 'ordering', 'navigation'],
  minAge: 7,
  maxAge: 99,
  minLevel: 1,
  maxLevel: 5,
}
