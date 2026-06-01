export default function ProgressTrack({
  value = 0,
  light = false,
  className = '',
  label = 'Progress',
}) {
  const safeValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
  const lightClass = light ? ' xp-track-light' : ''
  const extraClass = className ? ` ${className}` : ''

  return (
    <div
      className={`xp-track${lightClass}${extraClass}`}
      aria-label={`${label}: ${safeValue}%`}
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={safeValue}
    >
      <span style={{ width: `${safeValue}%` }}></span>
    </div>
  )
}
