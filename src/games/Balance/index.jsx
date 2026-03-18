import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import GameScene from './GameScene'
import TouchButton from '../../components/TouchButton.jsx'
import { usePhaserGame } from '../../hooks/usePhaserGame.js'

export default function Balance({ level = 2, speed = 4, onComplete }) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const sceneRef = usePhaserGame(containerRef, GameScene, { level, speed, onComplete })

  const handleLeft  = () => sceneRef.current?.moveCube(-1)
  const handleRight = () => sceneRef.current?.moveCube(1)
  const handleDrop  = () => sceneRef.current?.dropCube()

  return (
    <div className="w-full h-full flex flex-col items-center bg-gray-950">
      <div ref={containerRef} className="w-full flex-1 min-h-0" />

      <div className="w-full max-w-[480px] flex items-center justify-between px-6 py-3 bg-gray-900 border-t border-gray-700 shrink-0">
        <TouchButton onPress={handleLeft}  label="←" color="bg-indigo-600 active:bg-indigo-400" />
        <TouchButton onPress={handleDrop}  label={t('balance.controls.drop')} color="bg-amber-500 active:bg-amber-300" wide />
        <TouchButton onPress={handleRight} label="→" color="bg-indigo-600 active:bg-indigo-400" />
      </div>
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
}
