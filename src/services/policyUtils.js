import { toDateValue } from '../utils/dateUtils.js'

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

export function computeStaleJobBonusData({
  createdAt,
  nowMs,
  enabled,
  startHours,
  periodHours,
  ratePercent,
  capPercent,
  basePoints,
}) {
  const base = Math.max(0, Number(basePoints) || 0)
  const createdAtDate = toDateValue(createdAt)

  const safeStartHours = Math.max(0, Number(startHours) || 0)
  const safePeriodHours = Math.max(1, Number(periodHours) || 24)
  const safeRatePercent = Math.max(0, Number(ratePercent) || 0)
  const safeCapPercent = Math.max(0, Number(capPercent) || 0)

  if (!enabled || !createdAtDate || safeRatePercent <= 0 || safeCapPercent <= 0) {
    return {
      applied: false,
      bonusPercent: 0,
      periodsElapsed: 0,
      ageHours: 0,
      adjustedPoints: base,
      basePoints: base,
    }
  }

  const currentMs = Number(nowMs) || Date.now()
  const ageMs = Math.max(0, currentMs - createdAtDate.getTime())
  const startMs = safeStartHours * 60 * 60 * 1000

  if (ageMs < startMs) {
    return {
      applied: false,
      bonusPercent: 0,
      periodsElapsed: 0,
      ageHours: ageMs / (60 * 60 * 1000),
      adjustedPoints: base,
      basePoints: base,
    }
  }

  const periodMs = safePeriodHours * 60 * 60 * 1000
  const periodsElapsed = Math.floor((ageMs - startMs) / periodMs) + 1
  const bonusPercent = Math.min(safeCapPercent, periodsElapsed * safeRatePercent)
  const adjustedPoints = Math.max(0, Math.round(base * (1 + bonusPercent / 100)))

  return {
    applied: bonusPercent > 0 && adjustedPoints > base,
    bonusPercent,
    periodsElapsed,
    ageHours: ageMs / (60 * 60 * 1000),
    adjustedPoints,
    basePoints: base,
  }
}
