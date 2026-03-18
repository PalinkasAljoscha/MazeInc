import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { palette } from '../theme.js'
import { GAME_W, GAME_H } from '../games/shared/phaserConstants.js'

/**
 * Mounts a Phaser game inside `containerRef`, wires the registry values,
 * and handles the sceneReady / gameComplete event cycle.
 *
 * Intentionally uses an empty dependency array so the game instance is
 * created once on mount and destroyed on unmount. Level/speed changes are
 * handled by React remounting the whole component via a `key` prop change
 * in App.jsx — not by re-running this effect.
 *
 * @param {React.RefObject<HTMLElement>} containerRef  ref on the canvas wrapper div
 * @param {typeof Phaser.Scene}          SceneClass    the GameScene class to run
 * @param {{ level, speed, onComplete }} options
 * @returns {React.RefObject<Phaser.Scene>} sceneRef   set after 'sceneReady' fires
 */
export function usePhaserGame(containerRef, SceneClass, { level, speed, onComplete }) {
  const sceneRef = useRef(null)

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      backgroundColor: palette.gameBg,
      scene: [SceneClass],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: containerRef.current,
        width: GAME_W,
        height: GAME_H,
      },
    })

    game.registry.set('level', level)
    game.registry.set('speed', speed)

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
  }, []) // intentionally no deps — game is self-contained; remount via key prop

  return sceneRef
}
