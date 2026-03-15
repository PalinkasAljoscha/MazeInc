import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import GameScene from './GameScene'
import { palette } from '../../theme.js'

export default function FeedTheNumbers({ level = 2, speed = 4, onComplete }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      backgroundColor: palette.gameBg,
      scene: [GameScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: containerRef.current,
        width: 480,
        height: 680,
      },
    }

    const game = new Phaser.Game(config)
    game.registry.set('level', level)
    game.registry.set('speed', speed)

    game.events.on('gameComplete', ({ score }) => {
      if (onComplete) onComplete({ correct: true, score })
    })

    return () => {
      game.destroy(true)
    }
  }, []) // intentionally no deps — game is self-contained

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
}
