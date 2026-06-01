export default function StatusPill({ children, className = '' }) {
  if (!children) {
    return null
  }

  return (
    <span className={`status-pill${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}
