function toDateValue(value) {
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

export function computeCappedPenalty(currentCredits, configuredPenalty) {
  return Math.min(
    Math.max(0, Number(currentCredits) || 0),
    Math.max(0, Number(configuredPenalty) || 0),
  )
}

export function computeBlockingPoolClaimCount(
  activePoolClaimIds,
  pendingCheckJobIds,
  allowClaimingWithPendingChecks,
) {
  const claimIds = Array.isArray(activePoolClaimIds) ? activePoolClaimIds : []

  if (!allowClaimingWithPendingChecks) {
    return claimIds.length
  }

  const pendingIds = pendingCheckJobIds instanceof Set
    ? pendingCheckJobIds
    : new Set(Array.isArray(pendingCheckJobIds) ? pendingCheckJobIds : [])

  return claimIds.filter((id) => !pendingIds.has(id)).length
}

export function computeClaimCountdownData({
  claimedAt,
  nowMs,
  missedAfterHours,
  missedJobTimingEnabled,
  missedJobDefaultHours,
}) {
  const claimedAtDate = toDateValue(claimedAt)
  if (!claimedAtDate) {
    return { hasTimer: false, expired: false, remainingMs: null, timeoutHours: null }
  }

  const customHours = Number(missedAfterHours) || 0
  const timeoutHours = customHours > 0
    ? customHours
    : missedJobTimingEnabled
      ? Math.max(1, Number(missedJobDefaultHours) || 24)
      : 0

  if (timeoutHours <= 0) {
    return { hasTimer: false, expired: false, remainingMs: null, timeoutHours: null }
  }

  const timeoutMs = timeoutHours * 60 * 60 * 1000
  const remainingMs = claimedAtDate.getTime() + timeoutMs - (Number(nowMs) || Date.now())

  return {
    hasTimer: true,
    expired: remainingMs <= 0,
    remainingMs,
    timeoutHours,
  }
}
