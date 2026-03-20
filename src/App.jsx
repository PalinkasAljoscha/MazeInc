import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from './theme.js'
import MultiplesCatcher, { meta as multiplesCatcherMeta } from './games/MultiplesCatcher'
import NewWays, { meta as newWaysMeta } from './games/NewWays'
import FeedTheNumbers, { meta as feedTheNumbersMeta } from './games/FeedTheNumbers'
import Balance, { meta as balanceMeta } from './games/Balance'
import LadderToInfinity, { meta as ladderMeta } from './games/LadderToInfinity'
import NumberLabyrinth, { meta as numberLabyrinthMeta } from './games/NumberLabyrinth'

const ALL_LEVELS = [1, 2, 3, 4, 5]

const GAMES = [
  {
    id: 'multiples-catcher',
    enabled: true,
    component: MultiplesCatcher,
    titleKey: 'games.multiplesCatcher.title',
    descKey: 'games.multiplesCatcher.description',
    emoji: '🎯',
    color: 'from-purple-500 to-indigo-600',
    shadow: 'shadow-indigo-300',
    minLevel: multiplesCatcherMeta.minLevel,
    maxLevel: multiplesCatcherMeta.maxLevel,
    hasSpeed: true,
  },
  {
    id: 'new-ways',
    enabled: true,
    component: NewWays,
    titleKey: 'games.newWays.title',
    descKey: 'games.newWays.description',
    emoji: '🗺️',
    color: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-teal-300',
    minLevel: newWaysMeta.minLevel,
    maxLevel: newWaysMeta.maxLevel,
  },
  {
    id: 'balance',
    enabled: true,
    component: Balance,
    titleKey: 'games.balance.title',
    descKey: 'games.balance.description',
    emoji: '⚖️',
    color: 'from-cyan-500 to-blue-600',
    shadow: 'shadow-blue-300',
    minLevel: balanceMeta.minLevel,
    maxLevel: balanceMeta.maxLevel,
    hasSpeed: true,
  },
  {
    id: 'feed-the-numbers',
    enabled: false,
    component: FeedTheNumbers,
    titleKey: 'games.feedTheNumbers.title',
    descKey: 'games.feedTheNumbers.description',
    emoji: '🍽️',
    color: 'from-rose-500 to-pink-600',
    shadow: 'shadow-pink-300',
    minLevel: feedTheNumbersMeta.minLevel,
    maxLevel: feedTheNumbersMeta.maxLevel,
    hasSpeed: true,
  },
  {
    id: 'ladder',
    enabled: true,
    component: LadderToInfinity,
    titleKey: 'games.ladder.title',
    descKey: 'games.ladder.description',
    emoji: '🪜',
    color: 'from-sky-600 to-indigo-700',
    shadow: 'shadow-indigo-300',
    minLevel: ladderMeta.minLevel,
    maxLevel: ladderMeta.maxLevel,
  },
  {
    id: 'number-labyrinth',
    enabled: true,
    component: NumberLabyrinth,
    titleKey: 'games.numberLabyrinth.title',
    descKey: 'games.numberLabyrinth.description',
    emoji: '🔢',
    color: 'from-amber-500 to-orange-600',
    shadow: 'shadow-orange-300',
    minLevel: numberLabyrinthMeta.minLevel,
    maxLevel: numberLabyrinthMeta.maxLevel,
  },
].filter(g => g.enabled)

// ── Game order ─────────────────────────────────────────────────────────────────
// Set to 'random' to shuffle on every app start, or list IDs explicitly to fix
// the order. Any enabled game not listed in the array appears at the end.
// const GAME_ORDER = [
//   'number-labyrinth',
//   'balance',
//   'multiples-catcher',
//   'new-ways',
//   'ladder',
// ]
const GAME_ORDER = 'random'

const ORDERED_GAMES = (() => {
  if (GAME_ORDER === 'random') {
    const a = [...GAMES]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const indexed = Object.fromEntries(GAME_ORDER.map((id, i) => [id, i]))
  return [...GAMES].sort((a, b) => {
    const ai = indexed[a.id] ?? Infinity
    const bi = indexed[b.id] ?? Infinity
    return ai - bi
  })
})()

function HomePage({ onSelectGame }) {
  const { t, i18n } = useTranslation()

  const [selectedLevels, setSelectedLevels] = useState(
    Object.fromEntries(ORDERED_GAMES.map((g) => [g.id, g.minLevel]))
  )
  const [selectedSpeeds, setSelectedSpeeds] = useState(
    Object.fromEntries(ORDERED_GAMES.filter((g) => g.hasSpeed).map((g) => [g.id, 4]))
  )

  const setLevel = (gameId, lvl) =>
    setSelectedLevels((prev) => ({ ...prev, [gameId]: lvl }))
  const setSpeed = (gameId, spd) =>
    setSelectedSpeeds((prev) => ({ ...prev, [gameId]: spd }))

  return (
    <div className="relative w-screen h-screen flex flex-col items-center bg-gradient-to-b from-sky-400 to-blue-600 overflow-auto py-8 px-4">
      {/* ── Language switcher ── */}
      <div className="absolute top-4 right-4 flex gap-2">
        {['en', 'fr'].map((lang) => (
          <button
            key={lang}
            onClick={() => i18n.changeLanguage(lang)}
            className="text-2xl leading-none transition-opacity"
            style={{ opacity: i18n.language === lang ? 1 : 0.4 }}
            aria-label={lang === 'en' ? 'English' : 'Français'}
          >
            {lang === 'en' ? '🇬🇧' : '🇫🇷'}
          </button>
        ))}
      </div>
      {/* Title */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-2">🧮</div>
        <h1 className="text-5xl font-black text-white drop-shadow-lg tracking-wide">
          {t('app.name')}
        </h1>
        <p className="text-blue-100 text-xl mt-2 font-bold">
          {t('home.subtitle')}
        </p>
      </div>

      {/* Game cards */}
      <div className="flex flex-col gap-5 w-full max-w-sm">
        {ORDERED_GAMES.map((game) => (
          <div
            key={game.id}
            className={`
              bg-gradient-to-br ${game.color} ${game.shadow}
              rounded-3xl p-6 text-left shadow-xl
              border-4 border-white/30
            `}
          >
            <div className="text-5xl mb-3">{game.emoji}</div>
            <h2 className="text-2xl font-black text-white mb-1">{t(game.titleKey)}</h2>
            <p className="text-white/90 font-semibold text-sm leading-snug">
              {t(game.descKey)}
            </p>

            {/* Level selector */}
            <p className="text-white/70 text-xs font-bold mt-3 mb-1.5">
              {t('levels.label')}
            </p>
            <div className="flex gap-1.5">
              {ALL_LEVELS.map((lvl) => {
                const supported = lvl >= game.minLevel && lvl <= game.maxLevel
                const selected = selectedLevels[game.id] === lvl
                return (
                  <button
                    key={lvl}
                    disabled={!supported}
                    onClick={() => setLevel(game.id, lvl)}
                    className={`
                      flex-1 rounded-xl py-1.5 px-0.5 text-center transition-colors
                      ${selected
                        ? 'bg-white text-gray-800 shadow'
                        : supported
                        ? 'bg-white/20 text-white hover:bg-white/30'
                        : 'bg-black/10 text-white/25 cursor-not-allowed'}
                    `}
                  >
                    <div className="text-xs font-black">{lvl}</div>
                    <div className="text-[8px] leading-tight font-semibold break-words">
                      {t(`levels.${lvl}`)}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <button
                onClick={() => onSelectGame(game.id, selectedLevels[game.id], selectedSpeeds[game.id])}
                className="bg-white/25 rounded-2xl px-5 py-2 text-white font-black text-lg active:scale-95 transition-transform duration-100"
              >
                {t('home.play')}
              </button>

              {game.hasSpeed && (
                <div className="flex items-center gap-2 pb-1">
                  <input
                    type="range"
                    min="1" max="5" step="1"
                    value={selectedSpeeds[game.id]}
                    onChange={(e) => setSpeed(game.id, Number(e.target.value))}
                    className="w-24 accent-white cursor-pointer"
                  />
                  <span className="text-white/70 text-xs font-bold">{t('home.speed')}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Placeholder for future games */}
        <div className="rounded-3xl p-6 border-4 border-dashed border-white/40 text-center opacity-60">
          <div className="text-4xl mb-2">🔜</div>
          <p className="text-white font-black text-lg">{t('home.comingSoon')}</p>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const [activeGame, setActiveGame] = useState(null)
  const [activeLevel, setActiveLevel] = useState(null)
  const [activeSpeed, setActiveSpeed] = useState(4)
  const [gameKey, setGameKey] = useState(0)

  function handleSelectGame(gameId, level, speed = 4) {
    setActiveGame(gameId)
    setActiveLevel(level)
    setActiveSpeed(speed)
  }

  const activeGameConfig = activeGame ? GAMES.find((g) => g.id === activeGame) : null
  const GameComponent = activeGameConfig?.component ?? null
  if (GameComponent) {
    const game = activeGameConfig
    return (
      <div className="w-screen h-screen flex flex-col bg-gray-900">
        {/* Header bar */}
        <div className="flex items-center px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
          {/* Left: Home button + game info */}
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setActiveGame(null)}
              className="text-white font-black text-lg bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl px-4 py-1 transition-colors shrink-0"
            >
              {t('home.backButton')}
            </button>
            <div>
              <div className="text-white/60 text-xs font-bold leading-none">{t('app.name')}</div>
              <h1 className="text-white font-black text-xl leading-tight">{game.emoji} {t(game.titleKey)}</h1>
              <div className="text-white/50 text-xs font-semibold leading-tight mt-0.5">
                {t('levels.label')} {activeLevel}
                {game.hasSpeed && ` · ${t('home.speedLabel')} ${activeSpeed}`}
              </div>
            </div>
          </div>

          {/* Center: Start New button */}
          <div className="flex justify-center flex-1">
            <button
              onClick={() => setGameKey((k) => k + 1)}
              className="text-white font-black text-xl rounded-2xl px-6 py-2 transition-colors active:scale-95 transition-transform duration-100"
              style={{ backgroundColor: palette.btnBlue }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = palette.btnBlueHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = palette.btnBlue}
            >
              {t('home.startNew')}
            </button>
          </div>

          {/* Right: spacer to keep center truly centered */}
          <div className="flex-1" />
        </div>

        {/* Game fills remaining space */}
        <div className="flex-1 min-h-0">
          <GameComponent
            key={gameKey}
            level={activeLevel}
            speed={activeSpeed}
            onComplete={(result) => console.log('Game complete', result)}
          />
        </div>
      </div>
    )
  }

  return <HomePage onSelectGame={handleSelectGame} />
}
