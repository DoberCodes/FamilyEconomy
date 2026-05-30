import { useEffect, useState } from 'react'

function formatStatusTime(value) {
  return value.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function TopStatusBar({ title, actionLabel, onAction }) {
  const [timeLabel, setTimeLabel] = useState(() => formatStatusTime(new Date()))

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setTimeLabel(formatStatusTime(new Date()))
    }, 30000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [])

  return (
    <header className={actionLabel && typeof onAction === 'function' ? 'status-row status-row-with-action' : 'status-row'}>
      <span className="status-meta">{timeLabel}</span>
      <span className="page-title">{title}</span>
      {actionLabel && typeof onAction === 'function' ? (
        <button type="button" className="status-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </header>
  )
}