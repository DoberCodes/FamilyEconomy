export default function StatusNote({ children, tone = 'info', className = '' }) {
  if (!children) {
    return null
  }

  const toneClass = tone === 'error' ? ' status-error' : ''

  return (
    <p className={`status-note${toneClass}${className ? ` ${className}` : ''}`}>
      {children}
    </p>
  )
}
