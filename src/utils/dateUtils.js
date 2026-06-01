export function toDateValue(value) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function toDate(value) {
  return toDateValue(value)
}

export function startOfToday(value = new Date()) {
  const date = toDateValue(value) || new Date()
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function startOfWeek(value = new Date()) {
  const source = toDateValue(value) || new Date()
  const start = new Date(source)
  const day = start.getDay()
  const daysSinceMonday = (day + 6) % 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - daysSinceMonday)
  return start
}

export function getWindowStart(period, referenceDate = new Date()) {
  if (period === 'day') {
    return startOfToday(referenceDate)
  }

  if (period === 'week') {
    return startOfWeek(referenceDate)
  }

  return null
}

export function getWindowLabel(period) {
  return period === 'day' ? 'today' : 'this week'
}

export function isWithinDateRange(value, start, end) {
  return Boolean(value && value >= start && value < end)
}

export function formatRelativeActivityTime(value, nowMs = Date.now()) {
  const date = toDateValue(value)
  if (!date) {
    return 'Unknown time'
  }

  const diffMinutes = Math.max(0, Math.round((nowMs - date.getTime()) / (1000 * 60)))
  if (diffMinutes < 1) {
    return 'just now'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  const diffDays = Math.round(diffHours / 24)
  if (diffDays <= 7) {
    return `${diffDays}d ago`
  }

  return date.toLocaleDateString()
}

export function formatShortDate(value) {
  const date = toDateValue(value)
  if (!date) {
    return 'No date'
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(value) {
  const date = toDateValue(value)
  if (!date) {
    return 'Unknown time'
  }

  return date.toLocaleString()
}

export function formatHours(value) {
  if (!Number.isFinite(value)) {
    return 'n/a'
  }

  if (value >= 24) {
    return `${(value / 24).toFixed(1)}d`
  }

  if (value >= 1) {
    return `${value.toFixed(1)}h`
  }

  return `${Math.round(value * 60)}m`
}
