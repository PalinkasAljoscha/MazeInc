import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from '../../theme.js'
import { PathLayer } from '../shared/pathViz.jsx'

// ── Level config ───────────────────────────────────────────────────────────────
const LEVEL_CONFIGS = {
  1: { cols: 4, rows: 4, pathMinStep: 3,  pathMaxStep: 10, fillMinStep: 1, fillMaxStep: 7,  minPct: 0.35, maxPct: 0.45, globalMin: 1, globalMax: 100,  pHigher: 0.75 },
  2: { cols: 5, rows: 5, pathMinStep: 4,  pathMaxStep: 14, fillMinStep: 1, fillMaxStep: 10, minPct: 0.35, maxPct: 0.45, globalMin: 1, globalMax: 150,  pHigher: 0.75 },
  3: { cols: 6, rows: 6, pathMinStep: 5,  pathMaxStep: 20, fillMinStep: 1, fillMaxStep: 20, minPct: 0.35, maxPct: 0.45, globalMin: 1, globalMax: 350,  pHigher: 0.75 },
  4: { cols: 7, rows: 7, pathMinStep: 6,  pathMaxStep: 25, fillMinStep: 1, fillMaxStep: 30, minPct: 0.35, maxPct: 0.45, globalMin: 1, globalMax: 700,  pHigher: 0.75 },
  5: { cols: 8, rows: 8, pathMinStep: 7,  pathMaxStep: 30, fillMinStep: 1, fillMaxStep: 40, minPct: 0.35, maxPct: 0.45, globalMin: 1, globalMax: 999,  pHigher: 0.75 },
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

// ── Board generation helpers ───────────────────────────────────────────────────
function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)) }

// Iterative DFS from (0,0) to (cols-1,rows-1). No-adjacent-visited pruning keeps
// the path from touching itself (maze-like). Returns [[c,r], ...] or null.
function generateSolutionPathDfs(cols, rows, minLength, maxLength) {
  const goalKey = `${cols - 1},${rows - 1}`

  function manhattan(c, r) {
    return Math.abs((cols - 1) - c) + Math.abs((rows - 1) - r)
  }

  const stack = [{ pos: [0, 0], visited: new Set(['0,0']), path: [[0, 0]] }]

  while (stack.length > 0) {
    const { pos, visited, path } = stack.pop()
    const [c, r] = pos
    const cands = shuffle(getNeighbors(c, r, cols, rows))

    for (const [nc, nr] of cands) {
      const ncKey = `${nc},${nr}`
      if (visited.has(ncKey)) continue

      // No-adjacent-visited pruning: no neighbor of (nc,nr) other than current pos is visited
      const hasAdjacentVisited = getNeighbors(nc, nr, cols, rows).some(([nnc, nnr]) => {
        const k = `${nnc},${nnr}`
        return k !== `${c},${r}` && visited.has(k)
      })
      if (hasAdjacentVisited) continue

      const newLen = path.length + 1
      if (newLen + manhattan(nc, nr) > maxLength) continue

      const newPath = [...path, [nc, nr]]
      const newVisited = new Set(visited)
      newVisited.add(ncKey)

      if (ncKey === goalKey) {
        if (newLen >= minLength) return newPath
        // too short — don't add to stack
      } else {
        stack.push({ pos: [nc, nr], visited: newVisited, path: newPath })
      }
    }
  }
  return null
}

// Assigns strictly increasing values to each cell in the path.
function assignPathValues(path, pathMinStep, pathMaxStep, globalMin) {
  const baseVal = randInt(globalMin, globalMin + 19)
  const values = new Map()
  let current = baseVal
  for (const [c, r] of path) {
    values.set(`${c},${r}`, current)
    current += randInt(pathMinStep, pathMaxStep)
  }
  return values
}

// BFS-wave fill: expands outward from the path, assigning values based on
// neighbor count and label (A = ascending side, B = descending side).
function fillBoard(cols, rows, path, pathValues, pHigher, fillMinStep, fillMaxStep, globalMin, globalMax) {
  const board = new Map(pathValues)
  const labels = new Map()
  for (const key of pathValues.keys()) labels.set(key, 'A')

  function sampleStep() { return randInt(fillMinStep, fillMaxStep) }
  function clamp(v) { return Math.max(globalMin, Math.min(globalMax, v)) }

  while (board.size < cols * rows) {
    const snapshot = new Set(board.keys())
    const neighborBatch = new Set()
    for (const key of snapshot) {
      const [c, r] = key.split(',').map(Number)
      for (const [nc, nr] of getNeighbors(c, r, cols, rows)) {
        const nk = `${nc},${nr}`
        if (!snapshot.has(nk)) neighborBatch.add(nk)
      }
    }
    if (neighborBatch.size === 0) break

    for (const cellKey of neighborBatch) {
      const [c, r] = cellKey.split(',').map(Number)
      const numberedNbrs = getNeighbors(c, r, cols, rows).filter(([nc, nr]) => snapshot.has(`${nc},${nr}`))
      const nNbrs = numberedNbrs.length

      let newVal, newLabel
      if (nNbrs === 1) {
        const nbrVal = board.get(`${numberedNbrs[0][0]},${numberedNbrs[0][1]}`)
        if (Math.random() < pHigher) {
          newVal = clamp(nbrVal + sampleStep()); newLabel = 'A'
        } else {
          newVal = clamp(nbrVal - sampleStep()); newLabel = 'B'
        }
      } else if (nNbrs === 2) {
        const v0 = board.get(`${numberedNbrs[0][0]},${numberedNbrs[0][1]}`)
        const v1 = board.get(`${numberedNbrs[1][0]},${numberedNbrs[1][1]}`)
        const l0 = labels.get(`${numberedNbrs[0][0]},${numberedNbrs[0][1]}`)
        const l1 = labels.get(`${numberedNbrs[1][0]},${numberedNbrs[1][1]}`)
        const lo = Math.min(v0, v1), hi = Math.max(v0, v1)
        if (l0 === 'A' && l1 === 'A') {
          newVal = clamp(hi + sampleStep()); newLabel = 'B'
        } else {
          if (hi - lo >= 2) {
            newVal = randInt(lo + 1, hi - 1); newLabel = 'A'
          } else if (clamp(lo - sampleStep()) < lo) {
            newVal = clamp(lo - sampleStep()); newLabel = 'B'
          } else {
            newVal = clamp(hi + sampleStep()); newLabel = 'A'
          }
        }
      } else {
        const minAdj = Math.min(...numberedNbrs.map(([nc, nr]) => board.get(`${nc},${nr}`)))
        newVal = clamp(minAdj - sampleStep()); newLabel = 'B'
      }

      board.set(cellKey, newVal)
      labels.set(cellKey, newLabel)
    }
  }
  return board
}

// Top-level generator. Retries up to 20 times (DFS can return null when the
// search space is exhausted before finding a path in the length window).
function generateNumberLabyrinthBoard(cfg) {
  const { cols, rows, minPct, maxPct, pHigher, pathMinStep, pathMaxStep, fillMinStep, fillMaxStep, globalMin, globalMax } = cfg
  const T = cols * rows
  const lo = Math.floor(minPct * T)
  const hi = Math.floor(maxPct * T)

  for (let attempt = 0; attempt < 20; attempt++) {
    const path = generateSolutionPathDfs(cols, rows, lo, hi)
    if (!path) continue

    const pathValues = assignPathValues(path, pathMinStep, pathMaxStep, globalMin)
    const board = fillBoard(cols, rows, path, pathValues, pHigher, fillMinStep, fillMaxStep, globalMin, globalMax)

    return {
      grid: Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => board.get(`${c},${r}`))),
      path: path.map(([c, r]) => ({ col: c, row: r })),
    }
  }
  return null
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function NumberLabyrinth({ level = 1, onComplete }) {
  const { t } = useTranslation()
  const cfg = LEVEL_CONFIGS[level] ?? LEVEL_CONFIGS[1]
  const { cols, rows } = cfg

  // Board is generated once on mount; remount (Start New) regenerates it.
  const [boardData] = useState(() => {
    let result
    do { result = generateNumberLabyrinthBoard(cfg) } while (!result)
    return result
  })
  const { grid } = boardData

  const [pos, setPos]               = useState([0, 0])
  const [history, setHistory]       = useState([[0, 0]])
  const [validated, setValidated]   = useState(false)
  const [invalidSteps, setInvalidSteps] = useState(new Set())
  const [won, setWon]               = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)

  const startRef = useRef(Date.now())

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
      const sec = Math.round((Date.now() - startRef.current) / 1000)
      setElapsedSec(sec)
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
    setElapsedSec(0)
    startRef.current = Date.now()
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
              {t('numberLabyrinth.timeLabel')}:{' '}
              <span className="font-black" style={{ color: palette.white }}>{elapsedSec}s</span>
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
  minScreenWidth: 400,
  minScreenHeight: 400,
  defaultLevel: 1,
  defaultSpeed: 4,
}
