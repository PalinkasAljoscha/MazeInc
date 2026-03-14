import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Phaser from 'phaser'
import GameScene from './GameScene'
import { palette } from '../../theme.js'

export default function FeedTheNumbers({ level = 2, onComplete }) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const sceneRef = useRef(null)

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

    game.events.on('sceneReady', (scene) => {
      sceneRef.current = scene
    })

    game.events.on('gameComplete', ({ score }) => {
      if (onComplete) onComplete({ correct: true, score })
    })

    return () => {
      game.destroy(true)
      sceneRef.current = null
    }
  }, []) // intentionally no deps — game is self-contained

  const handleShoot = () => sceneRef.current?.shootBall()

  return (
    <div className="w-full h-full flex flex-col items-center bg-gray-950">
      {/* Phaser canvas */}
      <div ref={containerRef} className="w-full flex-1 min-h-0" />

      {/* Touch control — single shoot button */}
      <div className="w-full max-w-[480px] flex items-center justify-center px-6 py-3 bg-gray-900 border-t border-gray-700 shrink-0">
        <TouchButton
          onPress={handleShoot}
          label={t('feedTheNumbers.controls.shoot')}
          color="bg-amber-500 active:bg-amber-300"
        />
      </div>
    </div>
  )
}

function TouchButton({ onPress, label, color }) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      className={`
        ${color} px-20 py-4
        rounded-2xl text-white font-black text-2xl
        select-none touch-none
        transition-transform active:scale-90
        shadow-lg
      `}
    >
      {label}
    </button>
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
