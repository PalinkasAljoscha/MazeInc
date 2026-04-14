import { useRef } from 'react'
import GameScene from './GameScene'
import { usePhaserGame } from '../../hooks/usePhaserGame.js'

export default function FeedTheNumbers({ level = 2, speed = 4, onComplete }) {
  const containerRef = useRef(null)
  usePhaserGame(containerRef, GameScene, { level, speed, onComplete })

  return (
    <div className="w-full h-full flex flex-col items-center bg-gray-950">
      {/* Phaser canvas — Send button is rendered inside the canvas */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}

export const meta = {
  id: 'feed-the-numbers',
  title: 'Feed the Numbers',
  topics: ['addition', 'number recognition'],
  minAge: 6,
  maxAge: 10,
  minLevel: 2,
  maxLevel: 3,
  minScreenWidth: 320,
  minScreenHeight: 480,
  defaultLevel: 2,
  defaultSpeed: 4,
}
