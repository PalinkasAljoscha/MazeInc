import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import MultiplesCatcher, { meta as multiplesCatcherMeta } from './games/MultiplesCatcher'
import NewWays, { meta as newWaysMeta } from './games/NewWays'

const ALL_LEVELS = [1, 2, 3, 4, 5]

// Map game id → React component (used when rendering the active game)
const GAME_COMPONENTS = {
  'multiples-catcher': MultiplesCatcher,
  'new-ways': NewWays,
}

const GAMES = [
  {
    id: 'multiples-catcher',
    titleKey: 'games.multiplesCatcher.title',
    descKey: 'games.multiplesCatcher.description',
    emoji: '🎯',
    color: 'from-purple-500 to-indigo-600',
    shadow: 'shadow-indigo-300',
    minLevel: multiplesCatcherMeta.minLevel,
    maxLevel: multiplesCatcherMeta.maxLevel,
  },
  {
    id: 'new-ways',
    titleKey: 'games.newWays.title',
    descKey: 'games.newWays.description',
    emoji: '🗺️',
    color: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-teal-300',
    minLevel: newWaysMeta.minLevel,
    maxLevel: newWaysMeta.maxLevel,
  },
]

function HomePage({ onSelectGame }) {
  const { t } = useTranslation()

  const [selectedLevels, setSelectedLevels] = useState(
    Object.fromEntries(GAMES.map((g) => [g.id, g.minLevel]))
  )

  const setLevel = (gameId, lvl) =>
    setSelectedLevels((prev) => ({ ...prev, [gameId]: lvl }))

  return (
    <div className="w-screen h-screen flex flex-col items-center bg-gradient-to-b from-sky-400 to-blue-600 overflow-auto py-8 px-4">
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
        {GAMES.map((game) => (
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

            <button
              onClick={() => onSelectGame(game.id, selectedLevels[game.id])}
              className="mt-4 bg-white/25 rounded-2xl px-5 py-2 text-white font-black text-lg active:scale-95 transition-transform duration-100"
            >
              {t('home.play')}
            </button>
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

  function handleSelectGame(gameId, level) {
    setActiveGame(gameId)
    setActiveLevel(level)
  }

  const GameComponent = activeGame ? GAME_COMPONENTS[activeGame] : null
  if (GameComponent) {
    const game = GAMES.find((g) => g.id === activeGame)
    return (
      <div className="w-screen h-screen flex flex-col bg-gray-900">
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
          <button
            onClick={() => setActiveGame(null)}
            className="text-white font-black text-lg bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl px-4 py-1 transition-colors"
          >
            {t('home.backButton')}
          </button>
          <div>
            <div className="text-white/60 text-xs font-bold leading-none">{t('app.name')}</div>
            <h1 className="text-white font-black text-xl leading-tight">{game.emoji} {t(game.titleKey)}</h1>
          </div>
        </div>

        {/* Game fills remaining space */}
        <div className="flex-1 min-h-0">
          <GameComponent
            level={activeLevel}
            onComplete={(result) => console.log('Game complete', result)}
          />
        </div>
      </div>
    )
  }

  return <HomePage onSelectGame={handleSelectGame} />
}
