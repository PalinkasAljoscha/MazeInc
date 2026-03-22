import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from './theme.js'
import MultiplesCatcher, { meta as multiplesCatcherMeta } from './games/MultiplesCatcher'
import NewWays, { meta as newWaysMeta } from './games/NewWays'
import FeedTheNumbers, { meta as feedTheNumbersMeta } from './games/FeedTheNumbers'
import Balance, { meta as balanceMeta } from './games/Balance'
import LadderToInfinity, { meta as ladderMeta } from './games/LadderToInfinity'
import NumberLabyrinth, { meta as numberLabyrinthMeta } from './games/NumberLabyrinth'
import AtTheRestaurant, { meta as atTheRestaurantMeta } from './games/AtTheRestaurant'

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
  {
    id: 'at-the-restaurant',
    enabled: true,
    component: AtTheRestaurant,
    titleKey: 'games.atTheRestaurant.title',
    descKey: 'games.atTheRestaurant.description',
    emoji: '🍽️',
    color: 'from-orange-400 to-red-500',
    shadow: 'shadow-red-300',
    minLevel: atTheRestaurantMeta.minLevel,
    maxLevel: atTheRestaurantMeta.maxLevel,
  },
].filter(g => g.enabled)

// ── Game order ─────────────────────────────────────────────────────────────────
// Set to 'random' to shuffle on every app start, or list IDs explicitly to fix
// the order. Any enabled game not listed in the array appears at the end.
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

// ── Picker wheel ───────────────────────────────────────────────────────────────
// small=true reduces all dimensions by ~35% (used when two pickers are shown)
function Picker({ label, value, min, max, onChange, small = false }) {
  const btn   = small ? 'text-xl w-6 h-6 rounded-lg'   : 'text-3xl w-10 h-10 rounded-xl'
  const val   = small ? 'text-3xl w-9'                  : 'text-5xl w-14'
  const lbl   = small ? 'text-xs'                       : 'text-sm'
  const gap   = small ? 'gap-2'                         : 'gap-3'
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-white/70 font-bold uppercase tracking-wide ${lbl}`}>{label}</div>
      <div className={`flex items-center ${gap}`}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className={`text-white font-black flex items-center justify-center bg-white/15 hover:bg-white/25 active:scale-90 transition-all disabled:opacity-25 disabled:cursor-not-allowed ${btn}`}
        >
          ‹
        </button>
        <span className={`text-white font-black text-center tabular-nums leading-none ${val}`}>
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className={`text-white font-black flex items-center justify-center bg-white/15 hover:bg-white/25 active:scale-90 transition-all disabled:opacity-25 disabled:cursor-not-allowed ${btn}`}
        >
          ›
        </button>
      </div>
    </div>
  )
}

// ── Settings modal (level + speed selection) ───────────────────────────────────
// settingsModal shape: { gameConfig, fromGame, pendingLevel, pendingSpeed }
function SettingsModal({ modal, onUpdate, onOK, onCancel, t }) {
  const { gameConfig, fromGame, pendingLevel, pendingSpeed } = modal
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/65 z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-3xl px-8 py-7 shadow-2xl flex flex-col items-center gap-6 mx-4 w-full max-w-xs">
        {/* Title */}
        <h2 className="text-white font-black text-xl text-center leading-tight">
          {t('home.chooseDifficulty')}
        </h2>

        {/* Pickers — stacked vertically + smaller when both level and speed shown */}
        <div className="flex flex-col items-center gap-4">
          <Picker
            label={t('levels.label')}
            value={pendingLevel}
            min={gameConfig.minLevel}
            max={gameConfig.maxLevel}
            onChange={(lvl) => onUpdate({ pendingLevel: lvl })}
            small={gameConfig.hasSpeed}
          />
          {gameConfig.hasSpeed && (
            <Picker
              label={t('home.speedLabel')}
              value={pendingSpeed}
              min={1}
              max={5}
              onChange={(spd) => onUpdate({ pendingSpeed: spd })}
              small
            />
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          {fromGame && (
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-black text-lg rounded-xl py-2.5 transition-colors active:scale-95"
            >
              {t('home.cancel')}
            </button>
          )}
          <button
            onClick={onOK}
            className="flex-1 text-white font-black text-lg rounded-xl py-2.5 transition-colors active:scale-95"
            style={{ backgroundColor: palette.btnBlue }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = palette.btnBlueHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = palette.btnBlue}
          >
            {t('home.ok')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Home page ──────────────────────────────────────────────────────────────────
function HomePage({ onSelectGame }) {
  const { t, i18n } = useTranslation()

  return (
    <div className="relative w-screen h-screen flex flex-col items-center bg-gradient-to-b from-sky-400 to-blue-600 overflow-auto py-8 px-4">
      {/* Language switcher */}
      <div className="absolute top-4 right-4 flex gap-2">
        {/* To add a language: 1) create src/locales/<code>.json, 2) register in i18n.js, 3) add entry here */}
        {[
          { code: 'en', label: 'English' },
          { code: 'fr', label: 'Français' },
          { code: 'de', label: 'Deutsch' },
        ].map(({ code, label }) => (
          <button
            key={code}
            onClick={() => i18n.changeLanguage(code)}
            className="text-sm font-black leading-none transition-opacity px-1"
            style={{ opacity: i18n.language === code ? 1 : 0.4 }}
            aria-label={label}
          >
            {code.toUpperCase()}
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
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {ORDERED_GAMES.map((game) => (
          <div
            key={game.id}
            className={`bg-gradient-to-br ${game.color} ${game.shadow} rounded-2xl px-4 pt-3 pb-4 shadow-xl border-4 border-white/30`}
          >
            {/* Top row: emoji left, play button right */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-4xl">{game.emoji}</div>
              <button
                onClick={() => onSelectGame(game)}
                className="bg-white/25 hover:bg-white/35 active:scale-95 rounded-xl p-3 text-white text-xl font-black transition-all duration-100"
                aria-label={t('home.play')}
              >
                ▶
              </button>
            </div>
            <h2 className="text-xl font-black text-white leading-tight mb-1">{t(game.titleKey)}</h2>
            <p className="text-white/80 text-xs font-semibold leading-snug line-clamp-3">
              {t(game.descKey)}
            </p>
          </div>
        ))}

        {/* Placeholder */}
        <div className="rounded-2xl p-4 border-4 border-dashed border-white/40 text-center opacity-60">
          <div className="text-3xl mb-1">🔜</div>
          <p className="text-white font-black text-base">{t('home.comingSoon')}</p>
        </div>
      </div>
    </div>
  )
}

// ── App root ───────────────────────────────────────────────────────────────────
export default function App() {
  const { t } = useTranslation()

  // Active game state — only ever mutated together via startGame()
  const [activeGame, setActiveGame]   = useState(null)
  const [activeLevel, setActiveLevel] = useState(null)
  const [activeSpeed, setActiveSpeed] = useState(4)
  const [gameKey, setGameKey]         = useState(0)

  // Settings modal: null | { gameConfig, fromGame, pendingLevel, pendingSpeed }
  const [settingsModal, setSettingsModal] = useState(null)

  // Always start a completely fresh game instance — never mutate a running game
  function startGame(gameConfig, level, speed) {
    setActiveGame(gameConfig.id)
    setActiveLevel(level)
    setActiveSpeed(speed)
    setGameKey((k) => k + 1)
    setSettingsModal(null)
  }

  function openSettingsFromHome(gameConfig) {
    setSettingsModal({
      gameConfig,
      fromGame: false,
      pendingLevel: gameConfig.minLevel,
      pendingSpeed: 4,
    })
  }

  function openSettingsFromGame() {
    setSettingsModal({
      gameConfig: activeGameConfig,
      fromGame: true,
      pendingLevel: activeLevel,
      pendingSpeed: activeSpeed,
    })
  }

  function handleSettingsUpdate(patch) {
    setSettingsModal((prev) => ({ ...prev, ...patch }))
  }

  function handleSettingsOK() {
    startGame(settingsModal.gameConfig, settingsModal.pendingLevel, settingsModal.pendingSpeed)
  }

  function handleSettingsCancel() {
    setSettingsModal(null)
  }

  const activeGameConfig = activeGame ? GAMES.find((g) => g.id === activeGame) : null
  const GameComponent = activeGameConfig?.component ?? null

  // ── Game view ──────────────────────────────────────────────────────────────
  if (GameComponent) {
    const game = activeGameConfig
    return (
      <div className="w-screen h-screen flex flex-col bg-gray-900">
        {/* Header bar */}
        <div className="flex items-center px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
          {/* Left: Home + game info + Change button */}
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setActiveGame(null)}
              className="text-white font-black text-lg bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl px-4 py-1 transition-colors shrink-0"
            >
              {t('home.backButton')}
            </button>
            <div>
              <div className="text-white/60 text-xs font-bold leading-none">{t('app.name')}</div>
              <h1 className="text-white font-black text-xl leading-tight">
                {game.emoji} {t(game.titleKey)}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-white/50 text-xs font-semibold">
                  {t('levels.label')} {activeLevel}
                  {game.hasSpeed && ` · ${t('home.speedLabel')} ${activeSpeed}`}
                </span>
                <button
                  onClick={openSettingsFromGame}
                  className="text-white font-black text-xs px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                  style={{ backgroundColor: palette.btnBlue }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = palette.btnBlueHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = palette.btnBlue}
                >
                  {t('home.change')}
                </button>
              </div>
            </div>
          </div>

          {/* Center: Start New */}
          <div className="flex justify-center flex-1">
            <button
              onClick={() => startGame(game, activeLevel, activeSpeed)}
              className="text-white font-black text-xl rounded-2xl px-6 py-2 active:scale-95 transition-transform duration-100"
              style={{ backgroundColor: palette.btnBlue }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = palette.btnBlueHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = palette.btnBlue}
            >
              {t('home.startNew')}
            </button>
          </div>

          {/* Right: spacer */}
          <div className="flex-1" />
        </div>

        {/* Game canvas */}
        <div className="flex-1 min-h-0">
          <GameComponent
            key={gameKey}
            level={activeLevel}
            speed={activeSpeed}
            onComplete={(result) => console.log('Game complete', result)}
          />
        </div>

        {/* Settings modal (Change button) */}
        {settingsModal && (
          <SettingsModal
            modal={settingsModal}
            onUpdate={handleSettingsUpdate}
            onOK={handleSettingsOK}
            onCancel={handleSettingsCancel}
            t={t}
          />
        )}
      </div>
    )
  }

  // ── Home view ──────────────────────────────────────────────────────────────
  return (
    <>
      <HomePage onSelectGame={openSettingsFromHome} />
      {settingsModal && (
        <SettingsModal
          modal={settingsModal}
          onUpdate={handleSettingsUpdate}
          onOK={handleSettingsOK}
          onCancel={handleSettingsCancel}
          t={t}
        />
      )}
    </>
  )
}
