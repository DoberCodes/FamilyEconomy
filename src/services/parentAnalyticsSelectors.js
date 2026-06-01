import { isWithinDateRange, startOfWeek, toDateValue } from '../utils/dateUtils.js'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

function sortByCreatedAtDesc(left, right) {
  const leftMs = toDateValue(left.createdAt)?.getTime() || 0
  const rightMs = toDateValue(right.createdAt)?.getTime() || 0
  return rightMs - leftMs
}

function sumPenaltyCredits(entries = []) {
  return entries.reduce((sum, entry) => sum + (Number(entry.penaltyCredits) || 0), 0)
}

function countType(entries = [], type) {
  return entries.filter((entry) => entry.type === type).length
}

function rankByJobCount(entries = [], limit = 5) {
  return Object.entries(
    entries.reduce((accumulator, entry) => {
      const key = entry.jobTitle || 'Unknown job'
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {}),
  )
    .map(([title, count]) => ({ title, count }))
    .sort((left, right) => right.count - left.count || left.title.localeCompare(right.title))
    .slice(0, limit)
}

export function getConsequenceAnalytics({
  consequenceEvents = [],
  childNameById = {},
  auditReportRange = '30',
  auditReportChildId = 'all',
  auditReportType = 'all',
  now = new Date(),
} = {}) {
  const nowDate = toDateValue(now) || new Date()
  const thisWeekStart = startOfWeek(nowDate)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const trailWindowStart = new Date(nowDate.getTime() - (30 * DAY_MS))

  const consequenceEventsSorted = consequenceEvents.slice().sort(sortByCreatedAtDesc)
  const thisWeekConsequenceEvents = consequenceEventsSorted.filter((entry) =>
    isWithinDateRange(toDateValue(entry.createdAt), thisWeekStart, nowDate),
  )
  const lastWeekConsequenceEvents = consequenceEventsSorted.filter((entry) =>
    isWithinDateRange(toDateValue(entry.createdAt), lastWeekStart, thisWeekStart),
  )

  const visibleAuditTrailEvents = consequenceEventsSorted
    .filter((entry) => isWithinDateRange(toDateValue(entry.createdAt), trailWindowStart, nowDate))
    .slice(0, 20)

  const reportRangeDays = auditReportRange === 'all'
    ? null
    : Math.max(1, Number(auditReportRange) || 30)
  const reportStart = reportRangeDays
    ? new Date(nowDate.getTime() - (reportRangeDays * DAY_MS))
    : null

  const reportFilteredEvents = consequenceEventsSorted.filter((entry) => {
    const createdAt = toDateValue(entry.createdAt)
    if (!createdAt) {
      return false
    }

    if (reportStart && !isWithinDateRange(createdAt, reportStart, nowDate)) {
      return false
    }

    if (auditReportChildId !== 'all' && entry.childId !== auditReportChildId) {
      return false
    }

    if (auditReportType === 'missed' && entry.type !== 'job_marked_missed') {
      return false
    }

    if (auditReportType === 'denied' && entry.type !== 'job_check_denied') {
      return false
    }

    if (auditReportType === 'penalty' && (Number(entry.penaltyCredits) || 0) <= 0) {
      return false
    }

    return true
  })

  const consequenceByChild = Object.entries(
    thisWeekConsequenceEvents.reduce((accumulator, entry) => {
      const childKey = entry.childId || 'unknown'
      if (!accumulator[childKey]) {
        accumulator[childKey] = { count: 0, penaltyCredits: 0 }
      }
      accumulator[childKey].count += 1
      accumulator[childKey].penaltyCredits += Number(entry.penaltyCredits) || 0
      return accumulator
    }, {}),
  )
    .map(([childId, aggregate]) => ({
      childId,
      childLabel: childNameById[childId] || 'Unknown child',
      count: aggregate.count,
      penaltyCredits: aggregate.penaltyCredits,
    }))
    .sort((left, right) => right.count - left.count || left.childLabel.localeCompare(right.childLabel))

  const deniedChecksThisWeek = thisWeekConsequenceEvents.filter((entry) => entry.type === 'job_check_denied')
  const deniedChecksLastWeek = lastWeekConsequenceEvents.filter((entry) => entry.type === 'job_check_denied')

  return {
    consequenceEventsSorted,
    thisWeekConsequenceEvents,
    lastWeekConsequenceEvents,
    thisWeekPenaltyTotal: sumPenaltyCredits(thisWeekConsequenceEvents),
    lastWeekPenaltyTotal: sumPenaltyCredits(lastWeekConsequenceEvents),
    thisWeekDeniedCount: countType(thisWeekConsequenceEvents, 'job_check_denied'),
    lastWeekDeniedCount: countType(lastWeekConsequenceEvents, 'job_check_denied'),
    thisWeekMissedCount: countType(thisWeekConsequenceEvents, 'job_marked_missed'),
    lastWeekMissedCount: countType(lastWeekConsequenceEvents, 'job_marked_missed'),
    visibleAuditTrailEvents,
    reportFilteredEvents,
    topConsequenceJobs: rankByJobCount(thisWeekConsequenceEvents, 5),
    consequenceByChild,
    mostMissedJobs: rankByJobCount(
      thisWeekConsequenceEvents.filter(
        (entry) => entry.type === 'job_marked_missed' || entry.type === 'job_missed',
      ),
      3,
    ),
    deniedChecksThisWeek,
    deniedChecksLastWeek,
    deniedPenaltyThisWeek: sumPenaltyCredits(deniedChecksThisWeek),
    deniedPenaltyLastWeek: sumPenaltyCredits(deniedChecksLastWeek),
  }
}

export function getDynamicPressureRewards(rewards = []) {
  return rewards
    .filter((reward) => reward?.pricingMeta?.dynamicPricingApplied)
    .map((reward) => {
      const baseCost = Number(reward.pricingMeta.baseCost || reward.baseCost || reward.cost || 0)
      const adjustedCost = Number(reward.cost || 0)
      const upliftPct = baseCost > 0
        ? Math.round(((adjustedCost - baseCost) / baseCost) * 100)
        : 0

      return {
        id: reward.id,
        title: reward.title,
        demandCount: Number(reward.pricingMeta.demandCount || 0),
        upliftPct,
      }
    })
    .sort((left, right) => {
      if (right.upliftPct !== left.upliftPct) {
        return right.upliftPct - left.upliftPct
      }
      return right.demandCount - left.demandCount
    })
    .slice(0, 3)
}

export function getReviewAnalytics({ jobCheckRequests = [], rewardRequests = [], now = new Date() } = {}) {
  const nowDate = toDateValue(now) || new Date()
  const thisWeekStart = startOfWeek(nowDate)
  const reviewedChecks = jobCheckRequests.filter((request) => {
    const reviewedAt = toDateValue(request.reviewedAt)
    return (request.status === 'approved' || request.status === 'denied')
      && isWithinDateRange(reviewedAt, thisWeekStart, nowDate)
  })

  const reviewDurationsHours = reviewedChecks
    .map((request) => {
      const createdAt = toDateValue(request.createdAt)
      const reviewedAt = toDateValue(request.reviewedAt)

      if (!createdAt || !reviewedAt) {
        return null
      }

      const diffMs = reviewedAt.getTime() - createdAt.getTime()
      if (diffMs < 0) {
        return null
      }

      return diffMs / HOUR_MS
    })
    .filter((value) => Number.isFinite(value))

  const pendingChecks = jobCheckRequests.filter((request) => request.status === 'pending')
  const stalePendingChecks = pendingChecks.filter((request) => {
    const createdAt = toDateValue(request.createdAt)
    if (!createdAt) {
      return false
    }

    const ageHours = (nowDate.getTime() - createdAt.getTime()) / HOUR_MS
    return ageHours >= 24
  })

  return {
    reviewedChecks,
    reviewDurationsHours,
    avgReviewHours: reviewDurationsHours.length > 0
      ? reviewDurationsHours.reduce((sum, value) => sum + value, 0) / reviewDurationsHours.length
      : null,
    pendingChecks,
    stalePendingChecks,
    pendingRewardRequestsAnalytics: rewardRequests.filter((request) => request.status === 'pending'),
  }
}

export function getCelebrationAnalytics({ jobs = [], rewardRequests = [], goals = [], now = new Date() } = {}) {
  const nowDate = toDateValue(now) || new Date()
  const thisWeekStart = startOfWeek(nowDate)
  const celebrationTimelineEvents = [
    ...jobs
      .filter((job) => job.status === 'done')
      .map((job) => ({
        id: `celebrate-job:${job.id || job.title}`,
        type: 'job_done',
        title: `${job.title || 'Job'} completed`,
        icon: '✅',
        childId: job.claimedBy || job.childId || '',
        credits: job.rewardType === 'xp' ? 0 : (Number(job.points) || 0),
        at: toDateValue(job.completedAt),
      })),
    ...rewardRequests
      .filter((request) => request.status === 'approved' || request.status === 'fulfilled')
      .map((request) => ({
        id: `celebrate-reward:${request.id}`,
        type: request.status === 'fulfilled' ? 'reward_fulfilled' : 'reward_approved',
        title: `${request.rewardTitle || 'Reward'} ${request.status === 'fulfilled' ? 'fulfilled' : 'approved'}`,
        icon: request.status === 'fulfilled' ? '📦' : '🎁',
        childId: request.requestedBy || request.childId || '',
        credits: Number(request.cost) || 0,
        at: toDateValue(request.status === 'fulfilled' ? request.fulfilledAt : request.reviewedAt),
      })),
    ...goals
      .filter((goal) => goal.status === 'ready_to_claim' || goal.status === 'completed')
      .map((goal) => ({
        id: `celebrate-goal:${goal.id || goal.name}`,
        type: goal.status === 'completed' ? 'goal_completed' : 'goal_ready',
        title: `${goal.rewardTitle || goal.name || 'Goal'} ${goal.status === 'completed' ? 'completed' : 'ready for claim'}`,
        icon: goal.status === 'completed' ? '🏁' : '🎯',
        childId: goal.childId || '',
        credits: Number(goal.target) || 0,
        at: toDateValue(goal.status === 'completed' ? goal.completedAt : goal.updatedAt),
      })),
  ]
    .filter((entry) => entry.at)
    .sort((left, right) => (right.at?.getTime() || 0) - (left.at?.getTime() || 0))

  const thisWeekCelebrationEvents = celebrationTimelineEvents.filter((entry) =>
    isWithinDateRange(entry.at, thisWeekStart, nowDate),
  )

  return {
    celebrationTimelineEvents,
    recentCelebrationEvents: celebrationTimelineEvents.slice(0, 12),
    thisWeekCelebrationEvents,
    celebrationCounts: thisWeekCelebrationEvents.reduce((accumulator, entry) => {
      accumulator[entry.type] = (accumulator[entry.type] || 0) + 1
      return accumulator
    }, {}),
  }
}

export function getParentAnalyticsSummary({
  consequenceEvents = [],
  rewards = [],
  jobCheckRequests = [],
  rewardRequests = [],
  jobs = [],
  goals = [],
  childNameById = {},
  auditReportRange = '30',
  auditReportChildId = 'all',
  auditReportType = 'all',
  now = new Date(),
} = {}) {
  return {
    ...getConsequenceAnalytics({
      consequenceEvents,
      childNameById,
      auditReportRange,
      auditReportChildId,
      auditReportType,
      now,
    }),
    dynamicPressureRewards: getDynamicPressureRewards(rewards),
    ...getReviewAnalytics({ jobCheckRequests, rewardRequests, now }),
    ...getCelebrationAnalytics({ jobs, rewardRequests, goals, now }),
  }
}
