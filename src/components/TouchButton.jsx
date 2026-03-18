export default function TouchButton({ onPress, label, color = '', wide, disabled, style }) {
  // Use pointerdown so it responds immediately on touch screens
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault()
        if (!disabled) onPress()
      }}
      disabled={disabled}
      style={style}
      className={`
        ${color} ${wide ? 'px-10' : 'px-6'} py-4
        rounded-2xl text-white font-black text-2xl
        select-none touch-none
        transition-transform active:scale-90
        shadow-lg
        disabled:opacity-30
      `}
    >
      {label}
    </button>
  )
}
