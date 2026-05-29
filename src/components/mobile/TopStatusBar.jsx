import { useEffect, useState } from 'react'

function formatStatusTime(value) {
  return value.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function TopStatusBar({ title }) {
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
    <header className="status-row">
      <span>{timeLabel}</span>
      <span className="page-title">{title}</span>
    </header>
  )
}