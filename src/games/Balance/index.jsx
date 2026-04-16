import { useRef } from 'react'
import GameScene from './GameScene'
import { usePhaserGame } from '../../hooks/usePhaserGame.js'

export default function Balance({ level = 2, speed = 4, demo = false, onComplete }) {
  const containerRef = useRef(null)
  usePhaserGame(containerRef, GameScene, { level, speed, demo, onComplete })

  return (
    <div className="w-full h-full flex flex-col bg-gray-950">
      <div ref={containerRef} className="w-full flex-1 min-h-0" />
    </div>
  )
}

export const meta = {
  id: 'balance',
  title: 'Balance',
  topics: ['addition', 'integers', 'negative numbers'],
  minAge: 8,
  maxAge: 14,
  minLevel: 1,
  maxLevel: 5,
  minScreenWidth: 360,
  minScreenHeight: 520,
  defaultLevel: 1,
  defaultSpeed: 4,
}
