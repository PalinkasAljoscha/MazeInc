import { useRef } from 'react'
import GameScene from './GameScene'
import { usePhaserGame } from '../../hooks/usePhaserGame.js'

export default function AtTheRestaurant({ level = 1, onComplete }) {
  const containerRef = useRef(null)
  usePhaserGame(containerRef, GameScene, { level, speed: 4, onComplete })

  return (
    <div className="w-full h-full flex flex-col items-center bg-gray-950">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}

export const meta = {
  id:       'at-the-restaurant',
  title:    'At the Restaurant',
  topics:   ['addition', 'mental-math'],
  minAge:   5,
  maxAge:   9,
  minLevel: 1,
  maxLevel: 5,
  minScreenWidth: 320,
  minScreenHeight: 480,
  defaultLevel: 1,
  defaultSpeed: 4,
}
