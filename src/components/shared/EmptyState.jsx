export default function EmptyState({ children, className = '' }) {
  if (!children) {
    return null
  }

  return (
    <p className={`panel-muted${className ? ` ${className}` : ''}`}>
      {children}
    </p>
  )
}
