import { useRef } from 'react'
import GameScene from './GameScene'
import { usePhaserGame } from '../../hooks/usePhaserGame.js'

export default function MultiplesCatcher({ level = 2, speed = 4, demo = false, onComplete }) {
  const containerRef = useRef(null)
  usePhaserGame(containerRef, GameScene, { level, speed, demo, onComplete })

  return (
    <div className="w-full h-full flex flex-col bg-gray-950">
      <div ref={containerRef} className="w-full flex-1 min-h-0" />
    </div>
  )
}

export const meta = {
  id: 'multiples-catcher',
  title: 'Multiples Catcher',
  topics: ['multiples', 'multiplication'],
  minAge: 7,
  maxAge: 10,
  minLevel: 2,
  maxLevel: 4,
  minScreenWidth: 320,
  minScreenHeight: 480,
  defaultLevel: 2,
  defaultSpeed: 4,
}
