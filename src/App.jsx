import { useState } from 'react'
import MultiplesCatcher from './games/MultiplesCatcher'

const GAMES = [
  {
    id: 'multiples-catcher',
    title: 'Multiples Catcher',
    emoji: '🎯',
    description: 'Catch falling balls in the right slot! Is the number a multiple of the slot number?',
    color: 'from-purple-500 to-indigo-600',
    shadow: 'shadow-indigo-300',
  },
]

function HomePage({ onSelectGame }) {
  return (
    <div className="w-screen h-screen flex flex-col items-center bg-gradient-to-b from-sky-400 to-blue-600 overflow-auto py-8 px-4">
      {/* Title */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-2">🧮</div>
        <h1 className="text-5xl font-black text-white drop-shadow-lg tracking-wide">
          Math Trainer
        </h1>
        <p className="text-blue-100 text-xl mt-2 font-bold">
          Pick a game and start playing!
        </p>
      </div>

      {/* Game cards */}
      <div className="flex flex-col gap-5 w-full max-w-sm">
        {GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game.id)}
            className={`
              bg-gradient-to-br ${game.color} ${game.shadow}
              rounded-3xl p-6 text-left shadow-xl
              active:scale-95 transition-transform duration-100
              border-4 border-white/30
            `}
          >
            <div className="text-5xl mb-3">{game.emoji}</div>
            <h2 className="text-2xl font-black text-white mb-1">{game.title}</h2>
            <p className="text-white/90 font-semibold text-sm leading-snug">
              {game.description}
            </p>
            <div className="mt-4 inline-block bg-white/25 rounded-2xl px-5 py-2 text-white font-black text-lg">
              Play →
            </div>
          </button>
        ))}

        {/* Placeholder for future games */}
        <div className="rounded-3xl p-6 border-4 border-dashed border-white/40 text-center opacity-60">
          <div className="text-4xl mb-2">🔜</div>
          <p className="text-white font-black text-lg">More games coming soon!</p>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [activeGame, setActiveGame] = useState(null)

  if (activeGame === 'multiples-catcher') {
    return (
      <div className="w-screen h-screen flex flex-col bg-gray-900">
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
          <button
            onClick={() => setActiveGame(null)}
            className="text-white font-black text-lg bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl px-4 py-1 transition-colors"
          >
            ← Home
          </button>
          <h1 className="text-white font-black text-xl">🎯 Multiples Catcher</h1>
        </div>

        {/* Game fills remaining space */}
        <div className="flex-1 min-h-0">
          <MultiplesCatcher
            difficulty={1}
            onComplete={(result) => {
              // Could navigate back or show result; game handles its own end screen
              console.log('Game complete', result)
            }}
          />
        </div>
      </div>
    )
  }

  return <HomePage onSelectGame={setActiveGame} />
}
