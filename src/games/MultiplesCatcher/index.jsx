import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import GameScene from './GameScene'

export default function MultiplesCatcher({ difficulty = 1, onComplete }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      backgroundColor: '#1a1a2e',
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

  // Touch handlers — forwarded into the Phaser scene
  const handleLeft = () => sceneRef.current?.moveBall(-1)
  const handleRight = () => sceneRef.current?.moveBall(1)
  const handleDrop = () => sceneRef.current?.dropBall()

  return (
    <div className="w-full h-full flex flex-col items-center bg-gray-950">
      {/* Phaser canvas lives here */}
      <div ref={containerRef} className="w-full flex-1 min-h-0" />

      {/* On-screen touch controls */}
      <div className="w-full max-w-[480px] flex items-center justify-between px-6 py-3 bg-gray-900 border-t border-gray-700 shrink-0">
        <TouchButton onPress={handleLeft} label="←" color="bg-indigo-600 active:bg-indigo-400" />
        <TouchButton onPress={handleDrop} label="↓ Drop" color="bg-amber-500 active:bg-amber-300" wide />
        <TouchButton onPress={handleRight} label="→" color="bg-indigo-600 active:bg-indigo-400" />
      </div>
    </div>
  )
}

function TouchButton({ onPress, label, color, wide }) {
  // Use pointerdown so it responds immediately on touch screens
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      className={`
        ${color} ${wide ? 'px-10' : 'px-6'} py-4
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
  id: 'multiples-catcher',
  title: 'Multiples Catcher',
  topics: ['multiples', 'multiplication'],
  minAge: 7,
  maxAge: 10,
}
