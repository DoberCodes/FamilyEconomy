import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db, hasFirebaseConfig } from '../lib/firebase.js'
import { trackAnalyticsEvent } from './analytics.js'
import {
  computeBlockingPoolClaimCount,
  computeCappedPenalty,
  computeStaleJobBonusData,
} from './policyUtils.js'

const DEFAULT_FAMILY_ID = 'family-main'
const DEFAULT_USER_ID = 'kid-alex'
const DEFAULT_ROLE = 'kid'
const CREATOR_OWNER_EMAIL = 'austin.dober@gmail.com'
const DEFAULT_FAMILY_FUND_NAME = 'Community Funds'
const SAVINGS_GOAL_COMPLETION_XP = 140
const WEEKLY_STREAK_MIN_DAYS = 5
const WEEKLY_STREAK_BONUS_XP = 200

function getNextXpThreshold(currentLevel) {
  const level = Math.max(1, Number(currentLevel) || 1)

  // Early levels are intentionally easier, then ramp difficulty over time.
  if (level <= 5) {
    return 180 + (level - 1) * 45
  }

  if (level <= 10) {
    return 360 + (level - 5) * 70
  }

  if (level <= 20) {
    return 710 + (level - 10) * 95
  }

  return 1660 + (level - 20) * 120
}

function normalizeSavingsGoalApprovalMode(value) {
  if (
    value === 'create_and_claim'
    || value === 'claim_only'
    || value === 'no_approval'
  ) {
    return value
  }

  return 'claim_only'
}

function normalizeJobCheckApprovalMode(value) {
  if (value === 'required' || value === 'auto_approve') {
    return value
  }

  return 'required'
}

function normalizeRewardRequestApprovalMode(value) {
  if (value === 'required' || value === 'auto_approve') {
    return value
  }

  return 'required'
}

function normalizePricingWindow(period) {
  return period === 'day' || period === 'week' ? period : 'week'
}

function normalizeFamilyPricingSettings(familyData = {}) {
  const minMultiplierPercent = Math.max(
    25,
    Number(familyData.dynamicPricingMinMultiplierPercent) || 100,
  )
  const maxMultiplierPercent = Math.max(
    minMultiplierPercent,
    Number(familyData.dynamicPricingMaxMultiplierPercent) || 220,
  )

  return {
    dynamicPricingEnabled: Boolean(familyData.dynamicPricingEnabled),
    dynamicPricingWindowPeriod: normalizePricingWindow(familyData.dynamicPricingWindowPeriod),
    dynamicPricingDemandWeight: Math.max(0, Number(familyData.dynamicPricingDemandWeight) || 0),
    dynamicPricingScarcityWeight: Math.max(0, Number(familyData.dynamicPricingScarcityWeight) || 0),
    dynamicPricingMinMultiplierPercent: minMultiplierPercent,
    dynamicPricingMaxMultiplierPercent: maxMultiplierPercent,
    dynamicPricingMaxStepPercent: Math.max(0, Number(familyData.dynamicPricingMaxStepPercent) || 60),
  }
}

function normalizeFamilySavingsSettings(familyData = {}) {
  return {
    savingsGoalApprovalMode: normalizeSavingsGoalApprovalMode(
      familyData.savingsGoalApprovalMode,
    ),
    familyFundEnabled: familyData.familyFundEnabled !== false,
    familyFundName: normalizeFamilyFundName(familyData.familyFundName),
    familyFundBalance: Math.max(0, Number(familyData.familyFundBalance) || 0),
    familyFundContributionHistory: normalizeFamilyFundContributionHistory(
      familyData.familyFundContributionHistory,
    ),
    childSavingsAccountsEnabled: Boolean(familyData.childSavingsAccountsEnabled),
    childSavingsWithdrawalsEnabled: familyData.childSavingsWithdrawalsEnabled !== false,
    familyFundIncomeTaxEnabled: Boolean(familyData.familyFundIncomeTaxEnabled),
    familyFundIncomeTaxPercent: normalizeFundTaxPercent(familyData.familyFundIncomeTaxPercent),
    familyFundSalesTaxEnabled: Boolean(familyData.familyFundSalesTaxEnabled),
    familyFundSalesTaxPercent: normalizeFundTaxPercent(familyData.familyFundSalesTaxPercent),
    jobCheckApprovalMode: normalizeJobCheckApprovalMode(
      familyData.jobCheckApprovalMode,
    ),
  }
}

function normalizeFamilyFundName(value) {
  const trimmed = String(value || '').trim()
  return trimmed || DEFAULT_FAMILY_FUND_NAME
}

function normalizeFundTaxPercent(value) {
  return Math.min(100, Math.max(0, Number(value) || 0))
}

function normalizeFamilyFundContributionHistory(history = []) {
  return Array.isArray(history)
    ? history.map((entry, index) => ({
      id: entry.id || `family-fund:contribution:${index}`,
      childId: entry.childId || null,
      amount: Math.max(0, Number(entry.amount) || 0),
      source: entry.source || 'family_fund',
      createdAt: serializeDateValue(entry.createdAt),
    }))
    : []
}

function calculateFundTaxAmount(baseAmount, enabled, percent) {
  const normalizedAmount = Math.max(0, Number(baseAmount) || 0)
  const normalizedPercent = normalizeFundTaxPercent(percent)
  if (!enabled || normalizedAmount <= 0 || normalizedPercent <= 0) {
    return 0
  }

  return Math.min(normalizedAmount, Math.floor((normalizedAmount * normalizedPercent) / 100))
}

function normalizeFamilyRewardSettings(familyData = {}) {
  return {
    rewardRequestApprovalMode: normalizeRewardRequestApprovalMode(
      familyData.rewardRequestApprovalMode,
    ),
  }
}

function normalizeFamilyJobConsequenceSettings(familyData = {}) {
  return {
    missedJobConsequenceEnabled: Boolean(familyData.missedJobConsequenceEnabled),
    missedJobPenaltyCredits: Math.max(0, Number(familyData.missedJobPenaltyCredits) || 0),
    missedJobTimingEnabled: Boolean(familyData.missedJobTimingEnabled),
    missedJobDefaultHours: Math.max(1, Number(familyData.missedJobDefaultHours) || 24),
    failedJobCheckConsequenceEnabled: Boolean(familyData.failedJobCheckConsequenceEnabled),
    failedJobCheckPenaltyCredits: Math.max(0, Number(familyData.failedJobCheckPenaltyCredits) || 0),
  }
}

function normalizeFamilyJobFlowSettings(familyData = {}) {
  return {
    maxActivePoolClaimsPerChild: Math.max(
      1,
      Number(familyData.maxActivePoolClaimsPerChild) || 1,
    ),
    allowClaimingWithPendingChecks: Boolean(familyData.allowClaimingWithPendingChecks),
  }
}

function normalizeFamilyJobStaleBonusSettings(familyData = {}) {
  return {
    staleJobBonusEnabled: Boolean(familyData.staleJobBonusEnabled),
    staleJobBonusStartHours: Math.max(0, Number(familyData.staleJobBonusStartHours) || 24),
    staleJobBonusPeriodHours: Math.max(1, Number(familyData.staleJobBonusPeriodHours) || 24),
    staleJobBonusRatePercent: Math.max(0, Number(familyData.staleJobBonusRatePercent) || 5),
    staleJobBonusCapPercent: Math.max(0, Number(familyData.staleJobBonusCapPercent) || 30),
  }
}

function normalizeFamilyDashboardSettings(familyData = {}) {
  return {
    familyDashboardTopCardsEnabled: familyData.familyDashboardTopCardsEnabled !== false,
  }
}

function normalizeFamilyRecognitionSettings(familyData = {}) {
  return {
    achievementsEnabled: familyData.achievementsEnabled !== false,
    familyRecognitionEnabled: familyData.familyRecognitionEnabled !== false,
    customBadges: normalizeCustomBadges(familyData.customBadges),
  }
}

function normalizeCustomBadgeMetric(metric) {
  if (
    metric === 'completed_goals'
    || metric === 'contribution_credits'
    || metric === 'helper_jobs'
    || metric === 'reading_jobs'
    || metric === 'streak_days'
  ) {
    return metric
  }

  return 'completed_goals'
}

function normalizeCustomBadges(customBadges = []) {
  if (!Array.isArray(customBadges)) {
    return []
  }

  return customBadges
    .map((badge, index) => {
      const label = String(badge?.label || '').trim()
      if (!label) {
        return null
      }

      const category = badge?.category === 'recognition' ? 'recognition' : 'achievement'
      const metric = normalizeCustomBadgeMetric(badge?.metric)

      return {
        id: String(badge?.id || `custom-badge-${index + 1}`),
        label,
        icon: String(badge?.icon || (category === 'recognition' ? '\u{1F31F}' : '\u{1F3C5}')).trim() || (category === 'recognition' ? '\u{1F31F}' : '\u{1F3C5}'),
        category,
        metric,
        target: Math.max(1, Number(badge?.target) || 1),
      }
    })
    .filter(Boolean)
    .slice(0, 30)
}

function normalizeBadgeThresholdSettings(familyData = {}) {
  return {
    achievementFirstGoalTarget: Math.max(1, Number(familyData.achievementFirstGoalTarget) || 1),
    achievementContributorCreditsTarget: Math.max(1, Number(familyData.achievementContributorCreditsTarget) || 100),
    achievementHelperJobsTarget: Math.max(1, Number(familyData.achievementHelperJobsTarget) || 3),
    achievementReadingJobsTarget: Math.max(1, Number(familyData.achievementReadingJobsTarget) || 5),
    recognitionStreakDaysTarget: Math.max(1, Number(familyData.recognitionStreakDaysTarget) || 3),
    recognitionHelpingHandJobsTarget: Math.max(1, Number(familyData.recognitionHelpingHandJobsTarget) || 1),
    recognitionGoalGetterTarget: Math.max(1, Number(familyData.recognitionGoalGetterTarget) || 1),
  }
}

function normalizeJobBadgeContribution(value) {
  return value === 'helper' || value === 'reading' ? value : 'none'
}

function normalizeConsequenceEvent(event, fallbackId) {
  return {
    id: event.id || fallbackId,
    type: event.type || 'unknown',
    childId: event.childId || null,
    jobId: event.jobId || null,
    jobTitle: event.jobTitle || '',
    decision: event.decision || null,
    penaltyCredits: Math.max(0, Number(event.penaltyCredits) || 0),
    createdBy: event.createdBy || null,
    source: event.source || 'unknown',
    createdAt: serializeDateValue(event.createdAt),
  }
}

function normalizeFeedbackEntry(entry, fallbackId) {
  return {
    id: entry.id || fallbackId,
    category: entry.category || 'general',
    message: entry.message || '',
    createdBy: entry.createdBy || null,
    createdAt: serializeDateValue(entry.createdAt),
  }
}

async function addConsequenceEvent(familyId, eventPayload = {}) {
  if (!familyId || !hasFirebaseConfig || !db) {
    return
  }

  await addDoc(collection(db, 'families', familyId, 'consequenceEvents'), {
    ...eventPayload,
    penaltyCredits: Math.max(0, Number(eventPayload.penaltyCredits) || 0),
    createdAt: serverTimestamp(),
  })
}

function normalizeLevel(levelData = {}) {
  const current = Math.max(1, Number(levelData.current) || 1)

  return {
    current,
    xp: Math.max(0, Number(levelData.xp) || 0),
    nextXp: Math.max(100, Number(levelData.nextXp) || getNextXpThreshold(current)),
  }
}

function applyXpGain(levelData, gainAmount) {
  const gain = Math.max(0, Number(gainAmount) || 0)
  const startingLevel = normalizeLevel(levelData)

  if (gain <= 0) {
    return startingLevel
  }

  let next = {
    ...startingLevel,
    xp: startingLevel.xp + gain,
  }

  while (next.xp >= next.nextXp) {
    next = {
      current: next.current + 1,
      xp: next.xp - next.nextXp,
      nextXp: getNextXpThreshold(next.current),
    }
  }

  return next
}

async function awardFamilyXp(familyId, amount) {
  const gain = Math.max(0, Number(amount) || 0)
  if (!familyId || gain <= 0 || !hasFirebaseConfig || !db) {
    return null
  }

  const familyRef = doc(db, 'families', familyId)

  return runTransaction(db, async (transaction) => {
    const familySnap = await transaction.get(familyRef)

    if (!familySnap.exists()) {
      return null
    }

    const currentLevel = normalizeLevel(familySnap.data()?.level)
    const nextLevel = applyXpGain(currentLevel, gain)

    transaction.update(familyRef, {
      level: nextLevel,
      updatedAt: serverTimestamp(),
    })

    return nextLevel
  })
}

async function getFamilyCollectionCount(familyId, collectionName) {
  if (!familyId || !hasFirebaseConfig || !db) {
    return 0
  }

  const snapshot = await getDocs(collection(db, 'families', familyId, collectionName))
  return snapshot.size
}

async function maybeTrackOnboardingCompleted(context = {}) {
  const { familyId, userId, userRole } = getActiveFamilyContext(context)

  if (!familyId || userRole !== 'parent' || !hasFirebaseConfig || !db) {
    return
  }

  const [childCount, jobCount, rewardCount] = await Promise.all([
    getFamilyCollectionCount(familyId, 'children'),
    getFamilyCollectionCount(familyId, 'jobs'),
    getFamilyCollectionCount(familyId, 'rewards'),
  ])

  if (childCount > 0 && jobCount > 0 && rewardCount > 0) {
    trackAnalyticsEvent(
      'onboarding_completed',
      {
        childCount,
        jobCount,
        rewardCount,
        source: 'familyEconomyService',
      },
      { familyId, userId, userRole },
      {
        dedupe: true,
        dedupeKey: `onboarding_completed:${familyId}`,
      },
    )
  }
}

export function getActiveFamilyContext(override = {}) {
  return {
    familyId:
      override.familyId || import.meta.env.VITE_FAMILY_ID || DEFAULT_FAMILY_ID,
    userId: override.userId || import.meta.env.VITE_USER_ID || DEFAULT_USER_ID,
    userRole:
      override.userRole || import.meta.env.VITE_USER_ROLE || DEFAULT_ROLE,
  }
}

function normalizeJob(job) {
  const missedAfterHoursRaw = Number(job.missedAfterHours)
  const rewardType = job.rewardType === 'xp' ? 'xp' : 'credits'
  const basePoints = Number(job.basePoints ?? job.points ?? job.reward) || 0

  return {
    id: job.id,
    childId: job.childId || null,
    order: Number(job.order) || 0,
    icon: job.icon || '✅',
    title: job.title || job.name || 'Untitled job',
    rewardType,
    basePoints,
    points: Number(job.points ?? job.reward ?? basePoints) || 0,
    status: job.status || (job.done ? 'done' : 'open'),
    claimedBy: job.claimedBy || null,
    claimLimitCount: Number(job.claimLimitCount) || 0,
    claimLimitPeriod:
      job.claimLimitPeriod === 'day' || job.claimLimitPeriod === 'week'
        ? job.claimLimitPeriod
        : null,
    familyClaimLimitCount: Number(job.familyClaimLimitCount) || 0,
    familyClaimLimitPeriod:
      job.familyClaimLimitPeriod === 'day' || job.familyClaimLimitPeriod === 'week'
        ? job.familyClaimLimitPeriod
        : null,
    claimLimitKey: job.claimLimitKey || null,
    autoRecreate: Boolean(job.autoRecreate),
    badgeContribution: normalizeJobBadgeContribution(job.badgeContribution),
    missedAfterHours:
      Number.isFinite(missedAfterHoursRaw) && missedAfterHoursRaw > 0
        ? missedAfterHoursRaw
        : null,
    claimedAt: serializeDateValue(job.claimedAt),
    completedAt: serializeDateValue(job.completedAt),
    createdAt: serializeDateValue(job.createdAt),
    createdBy: job.createdBy || null,
    requiresApproval:
      job.requiresApproval === true ? true
      : job.requiresApproval === false ? false
      : null,
  }
}

function normalizeJobLimitKey(title) {
  return (title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normalizeGoalStatus(value) {
  if (
    value === 'pending_parent_approval'
    || value === 'countered'
    || value === 'ready_to_claim'
    || value === 'completed'
    || value === 'denied'
  ) {
    return value
  }

  return 'active'
}

function normalizeGoal(goal, fallbackId, options = {}) {
  const target = Number(goal.target) || 1
  const explicitStatus = normalizeGoalStatus(goal.status)
  const isFamilyGoal = !goal.childId
  const familyFundContributionHistory = normalizeFamilyFundContributionHistory(
    options.familyFundContributionHistory,
  )
  const goalContributionHistory = Array.isArray(goal.contributionHistory)
    ? goal.contributionHistory.map((entry, index) => ({
      id: entry.id || `${fallbackId || goal.id || 'goal'}:contribution:${index}`,
      childId: entry.childId || null,
      amount: Math.max(0, Number(entry.amount) || 0),
      source: entry.source || 'savings_goal',
      createdAt: serializeDateValue(entry.createdAt),
    }))
    : []
  const contributionHistory = isFamilyGoal && familyFundContributionHistory.length > 0
    ? familyFundContributionHistory
    : goalContributionHistory
  const legacyFamilyGoalContributionTotal = isFamilyGoal && familyFundContributionHistory.length === 0
    ? goalContributionHistory.reduce((sum, entry) => sum + entry.amount, 0)
    : 0
  const saved = isFamilyGoal && explicitStatus !== 'completed' && explicitStatus !== 'denied'
    ? Math.max(
      0,
      Number(options.familyFundBalance) || 0,
      Number(goal.saved) || 0,
      legacyFamilyGoalContributionTotal,
    )
    : Math.max(0, Number(goal.saved) || 0)
  const status = explicitStatus === 'active' && target > 0 && saved >= target
    ? 'ready_to_claim'
    : explicitStatus

  return {
    id: goal.id || fallbackId || null,
    childId: goal.childId || null,
    name: goal.name || 'Untitled goal',
    rewardId: goal.rewardId || null,
    rewardTitle: goal.rewardTitle || '',
    saved,
    target,
    status,
    requestedBy: goal.requestedBy || null,
    requestedAt: serializeDateValue(goal.requestedAt),
    parentReviewedBy: goal.parentReviewedBy || null,
    parentReviewedAt: serializeDateValue(goal.parentReviewedAt),
    counterTarget: Number(goal.counterTarget) || 0,
    counterNote: goal.counterNote || '',
    counteredAt: serializeDateValue(goal.counteredAt),
    counteredBy: goal.counteredBy || null,
    contributionHistory,
    negotiationHistory: Array.isArray(goal.negotiationHistory)
      ? goal.negotiationHistory
      : [],
    readyToClaimAt: serializeDateValue(goal.readyToClaimAt),
    completedAt: serializeDateValue(goal.completedAt),
    approvedAt: serializeDateValue(goal.approvedAt),
    approvedBy: goal.approvedBy || null,
    updatedAt: serializeDateValue(goal.updatedAt),
  }
}

function normalizeReward(reward, fallbackId) {
  return {
    id: reward.id || fallbackId,
    childId: reward.childId || null,
    title: reward.title || 'Untitled reward',
    baseCost: Number(reward.baseCost ?? reward.cost) || 0,
    cost: Number(reward.cost) || 0,
    repeatMode: reward.repeatMode === 'once' ? 'once' : 'recur',
    claimLimitCount: Number(reward.claimLimitCount) || 0,
    claimLimitPeriod:
      reward.claimLimitPeriod === 'day' || reward.claimLimitPeriod === 'week'
        ? reward.claimLimitPeriod
        : null,
    familyClaimLimitCount: Number(reward.familyClaimLimitCount) || 0,
    familyClaimLimitPeriod:
      reward.familyClaimLimitPeriod === 'day' || reward.familyClaimLimitPeriod === 'week'
        ? reward.familyClaimLimitPeriod
        : null,
    requiresApproval:
      reward.requiresApproval === true ? true
      : reward.requiresApproval === false ? false
      : null,
  }
}

function calculateRewardMultiplier({ reward, demandCount, pricingSettings }) {
  const demandWeight = Number(pricingSettings.dynamicPricingDemandWeight) || 0
  const scarcityWeight = Number(pricingSettings.dynamicPricingScarcityWeight) || 0

  const demandMultiplier = 1 + (demandCount * demandWeight) / 100

  let scarcityRatio = 0
  if (reward.familyClaimLimitCount > 0) {
    scarcityRatio = Math.min(1, demandCount / reward.familyClaimLimitCount)
  }

  const scarcityMultiplier = 1 + scarcityRatio * (scarcityWeight / 100)
  const rawMultiplier = demandMultiplier * scarcityMultiplier

  const minMultiplier = Math.max(
    0.25,
    (Number(pricingSettings.dynamicPricingMinMultiplierPercent) || 100) / 100,
  )
  const maxMultiplier = Math.max(
    minMultiplier,
    (Number(pricingSettings.dynamicPricingMaxMultiplierPercent) || 220) / 100,
  )
  const maxStepMultiplier = 1 + (Math.max(0, Number(pricingSettings.dynamicPricingMaxStepPercent) || 0) / 100)

  const boundedMultiplier = Math.max(
    minMultiplier,
    Math.min(rawMultiplier, maxMultiplier, maxStepMultiplier),
  )

  return {
    demandMultiplier,
    scarcityMultiplier,
    scarcityRatio,
    rawMultiplier,
    boundedMultiplier,
    guardrails: {
      minMultiplier,
      maxMultiplier,
      maxStepMultiplier,
    },
  }
}

function calculateRewardAdjustedCost(reward, rewardRequests, pricingSettings) {
  const baseCost = Number(reward.baseCost ?? reward.cost) || 0

  if (!pricingSettings.dynamicPricingEnabled) {
    return {
      adjustedCost: baseCost,
      pricingMeta: {
        dynamicPricingApplied: false,
        baseCost,
        adjustedCost: baseCost,
        projectedNextCost: baseCost,
        projectedDelta: 0,
        demandCount: 0,
        scarcityRatio: 0,
        multiplier: 1,
        rawMultiplier: 1,
        guardrails: {
          minMultiplier: 1,
          maxMultiplier: 1,
          maxStepMultiplier: 1,
        },
        windowPeriod: pricingSettings.dynamicPricingWindowPeriod,
      },
    }
  }

  const windowStart = startOfCurrentWindow(pricingSettings.dynamicPricingWindowPeriod)
  const demandCount = rewardRequests
    .filter((item) => item.rewardId === reward.id)
    .filter((item) => item.status === 'pending' || item.status === 'approved' || item.status === 'fulfilled')
    .filter((item) => {
      const createdAt = item.createdAt?.toDate?.() || null
      if (!windowStart || !createdAt) {
        return false
      }
      return createdAt >= windowStart
    }).length

  const multiplier = calculateRewardMultiplier({ reward, demandCount, pricingSettings })
  const adjustedCost = Math.max(1, Math.round(baseCost * multiplier.boundedMultiplier))

  const projectedDemandCount = demandCount + 1
  const nextMultiplier = calculateRewardMultiplier({
    reward,
    demandCount: projectedDemandCount,
    pricingSettings,
  })
  const projectedNextCost = Math.max(1, Math.round(baseCost * nextMultiplier.boundedMultiplier))

  return {
    adjustedCost,
    pricingMeta: {
      dynamicPricingApplied: adjustedCost !== baseCost,
      baseCost,
      adjustedCost,
      projectedNextCost,
      projectedDelta: projectedNextCost - adjustedCost,
      demandCount,
      scarcityRatio: multiplier.scarcityRatio,
      multiplier: multiplier.boundedMultiplier,
      rawMultiplier: multiplier.rawMultiplier,
      guardrails: multiplier.guardrails,
      windowPeriod: pricingSettings.dynamicPricingWindowPeriod,
    },
  }
}

function calculateJobAdjustedPoints(job, staleBonusSettings, nowMs = Date.now()) {
  const basePoints = Number(job.basePoints ?? job.points) || 0
  const bonusData = computeStaleJobBonusData({
    createdAt: job.createdAt,
    nowMs,
    enabled: staleBonusSettings.staleJobBonusEnabled,
    startHours: staleBonusSettings.staleJobBonusStartHours,
    periodHours: staleBonusSettings.staleJobBonusPeriodHours,
    ratePercent: staleBonusSettings.staleJobBonusRatePercent,
    capPercent: staleBonusSettings.staleJobBonusCapPercent,
    basePoints,
  })

  return {
    adjustedPoints: bonusData.adjustedPoints,
    staleBonusMeta: {
      ...bonusData,
      startHours: staleBonusSettings.staleJobBonusStartHours,
      periodHours: staleBonusSettings.staleJobBonusPeriodHours,
      ratePercent: staleBonusSettings.staleJobBonusRatePercent,
      capPercent: staleBonusSettings.staleJobBonusCapPercent,
    },
  }
}

function startOfCurrentWindow(period) {
  const now = new Date()

  if (period === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  if (period === 'week') {
    const start = new Date(now)
    const day = start.getDay()
    const daysSinceMonday = (day + 6) % 7
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - daysSinceMonday)
    return start
  }

  return null
}

function startOfWeekForDate(value = new Date()) {
  const start = new Date(value)
  const day = start.getDay()
  const daysSinceMonday = (day + 6) % 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - daysSinceMonday)
  return start
}

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

function serializeDateValue(value) {
  const date = toDateValue(value)
  return date ? date.toISOString() : null
}

function toDayKey(value) {
  const date = toDateValue(value)
  if (!date) {
    return null
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekKey(value = new Date()) {
  return toDayKey(startOfWeekForDate(value))
}

function countWeeklyCompletionDays(jobs, childId = null, referenceDate = new Date()) {
  const start = startOfWeekForDate(referenceDate)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  const dayKeys = new Set()

  ;(jobs || [])
    .filter((job) => job.status === 'done')
    .forEach((job) => {
      if (childId) {
        const ownerId = job.claimedBy || job.childId || null
        if (ownerId !== childId) {
          return
        }
      }

      const completedAt = toDateValue(job.completedAt)
      if (!completedAt || completedAt < start || completedAt >= end) {
        return
      }

      const key = toDayKey(completedAt)
      if (key) {
        dayKeys.add(key)
      }
    })

  return dayKeys.size
}

async function maybeAwardWeeklyStreakBonus(familyId, childId, context = {}) {
  if (!familyId || !childId || !hasFirebaseConfig || !db) {
    return false
  }

  const jobsSnapshot = await getDocs(collection(db, 'families', familyId, 'jobs'))
  const jobs = jobsSnapshot.docs
    .map((item) => normalizeJob({ id: item.id, ...item.data() }))

  const weeklyDays = countWeeklyCompletionDays(jobs, childId)
  if (weeklyDays < WEEKLY_STREAK_MIN_DAYS) {
    return false
  }

  const bonusKey = `${childId}:${getWeekKey()}`
  const familyRef = doc(db, 'families', familyId)

  const markedAwarded = await runTransaction(db, async (transaction) => {
    const familySnap = await transaction.get(familyRef)
    if (!familySnap.exists()) {
      return false
    }

    const existingMap = familySnap.data()?.weeklyStreakBonusByChild || {}
    if (existingMap[bonusKey]) {
      return false
    }

    transaction.update(familyRef, {
      weeklyStreakBonusByChild: {
        ...existingMap,
        [bonusKey]: true,
      },
      updatedAt: serverTimestamp(),
    })

    return true
  })

  if (!markedAwarded) {
    return false
  }

  await awardFamilyXp(familyId, WEEKLY_STREAK_BONUS_XP)

  trackAnalyticsEvent(
    'weekly_streak_bonus_awarded',
    {
      itemType: 'streak',
      childId,
      weeklyDays,
      bonusXp: WEEKLY_STREAK_BONUS_XP,
      source: 'reviewJobCheckRequest',
      screen: 'kid',
    },
    context,
  )

  return true
}

function normalizeRewardRequest(request, fallbackId) {
  return {
    id: request.id || fallbackId,
    requestKind: request.requestKind === 'proposal' ? 'proposal' : 'purchase',
    childId: request.childId || null,
    rewardId: request.rewardId || null,
    rewardTitle: request.rewardTitle || 'Unknown reward',
    cost: Number(request.cost) || 0,
    costBeforeTax: Number(request.costBeforeTax) || Number(request.cost) || 0,
    salesTaxPercent: normalizeFundTaxPercent(request.salesTaxPercent),
    salesTaxAmount: Math.max(0, Number(request.salesTaxAmount) || 0),
    totalCost: Number(request.totalCost) || Number(request.cost) || 0,
    requestedBy: request.requestedBy || null,
    status: request.status || 'pending',
    childNote: request.childNote || '',
    parentNote: request.parentNote || '',
    counterRewardTitle: request.counterRewardTitle || '',
    counterCost: Number(request.counterCost) || 0,
    childRespondedAt: serializeDateValue(request.childRespondedAt),
    fulfilledAt: serializeDateValue(request.fulfilledAt),
    fulfilledBy: request.fulfilledBy || null,
    reviewedBy: request.reviewedBy || null,
    autoApproved: Boolean(request.autoApproved),
    notificationDismissedAt: serializeDateValue(request.notificationDismissedAt),
    notificationDismissedBy: request.notificationDismissedBy || null,
    linkedRewardId: request.linkedRewardId || null,
    linkedRewardTitle: request.linkedRewardTitle || '',
    linkedRewardCost: Number(request.linkedRewardCost) || 0,
    createdAt: serializeDateValue(request.createdAt),
    reviewedAt: serializeDateValue(request.reviewedAt),
    updatedAt: serializeDateValue(request.updatedAt),
  }
}

function normalizeChildProfile(profile, fallbackId) {
  return {
    id: profile.id || fallbackId,
    displayName: profile.displayName || 'Kid',
    avatar: profile.avatar || '🧒',
    weeklyGoalCredits: Number(profile.weeklyGoalCredits) || 0,
    credits: Number(profile.credits) || 0,
    savingsBalance: Math.max(0, Number(profile.savingsBalance) || 0),
    sessionCodeEnabled: Boolean(profile.sessionCodeEnabled),
    sessionCode: profile.sessionCode || '',
    allowChildSetSessionCode: Boolean(profile.allowChildSetSessionCode),
    createdBy: profile.createdBy || null,
  }
}

function normalizeJobCheckRequest(request, fallbackId) {
  return {
    id: request.id || fallbackId,
    jobId: request.jobId || null,
    childId: request.childId || null,
    jobTitle: request.jobTitle || 'Unknown job',
    rewardType: request.rewardType === 'xp' ? 'xp' : 'credits',
    points: Number(request.points) || 0,
    requestedBy: request.requestedBy || null,
    status: request.status || 'pending',
    reviewedBy: request.reviewedBy || null,
    createdAt: serializeDateValue(request.createdAt),
    reviewedAt: serializeDateValue(request.reviewedAt),
  }
}

function emptyDashboardResult() {
  return {
    data: {
      profileName: '',
      streakDays: 0,
      level: {
        current: 1,
        xp: 0,
        nextXp: getNextXpThreshold(1),
      },
      balance: {
        credits: 0,
      },
      jobs: [],
      goals: [],
    },
    source: 'empty',
  }
}

export async function getFamilyDashboard(context = {}) {
  const { familyId: activeFamilyId, userRole, userId } = getActiveFamilyContext(
    context,
  )
  const selectedChildId = context.selectedChildId || null
  const targetFamilyId = activeFamilyId

  if (!hasFirebaseConfig || !db) {
    return {
      ...emptyDashboardResult(),
      context: { familyId: targetFamilyId, userId, userRole },
    }
  }

  const familyRef = doc(db, 'families', targetFamilyId)
  const familySnapshot = await getDoc(familyRef)

  if (!familySnapshot.exists()) {
    return {
      ...emptyDashboardResult(),
      context: {
        familyId: targetFamilyId,
        userId,
        userRole,
      },
    }
  }

  const familyData = familySnapshot.data()
  const staleBonusSettings = normalizeFamilyJobStaleBonusSettings(familyData)

  const jobsSnapshot = await getDocs(collection(db, 'families', targetFamilyId, 'jobs'))
  const goalSnapshot = await getDocs(collection(db, 'families', targetFamilyId, 'goals'))

  const allJobs = jobsSnapshot.docs
    .map((item) => normalizeJob({ id: item.id, ...item.data() }))
    .map((job) => {
      if (job.status !== 'open' || job.claimedBy) {
        return {
          ...job,
          staleBonusMeta: {
            applied: false,
            bonusPercent: 0,
            periodsElapsed: 0,
            ageHours: 0,
            adjustedPoints: Number(job.points) || 0,
            basePoints: Number(job.basePoints ?? job.points) || 0,
            startHours: staleBonusSettings.staleJobBonusStartHours,
            periodHours: staleBonusSettings.staleJobBonusPeriodHours,
            ratePercent: staleBonusSettings.staleJobBonusRatePercent,
            capPercent: staleBonusSettings.staleJobBonusCapPercent,
          },
        }
      }

      const adjusted = calculateJobAdjustedPoints(job, staleBonusSettings)

      return {
        ...job,
        points: adjusted.adjustedPoints,
        staleBonusMeta: adjusted.staleBonusMeta,
      }
    })

  const jobs = allJobs
    .filter((job) =>
      selectedChildId ? !job.childId || job.childId === selectedChildId : true,
    )
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  const familyFundBalance = Math.max(0, Number(familyData.familyFundBalance) || 0)
  const familyFundContributionHistory = normalizeFamilyFundContributionHistory(
    familyData.familyFundContributionHistory,
  )
  const goals = goalSnapshot.docs
    .map((item) => normalizeGoal(
      { id: item.id, ...item.data() },
      item.id,
      { familyFundBalance, familyFundContributionHistory },
    ))
    .filter((goal) =>
      selectedChildId ? !goal.childId || goal.childId === selectedChildId : true,
    )

  let selectedChild = null
  if (selectedChildId) {
    const selectedChildRef = doc(db, 'families', targetFamilyId, 'children', selectedChildId)
    const selectedChildSnap = await getDoc(selectedChildRef)
    if (selectedChildSnap.exists()) {
      selectedChild = normalizeChildProfile(
        { id: selectedChildSnap.id, ...selectedChildSnap.data() },
        selectedChildSnap.id,
      )
    }
  }

  return {
    source: 'firestore',
    data: {
      profileName: selectedChild?.displayName || familyData.profileName || '',
      streakDays: countWeeklyCompletionDays(allJobs, selectedChildId || null),
      level: {
        current: Number(familyData.level?.current) || 1,
        xp: Number(familyData.level?.xp) || 0,
        nextXp:
          Number(familyData.level?.nextXp)
          || getNextXpThreshold(Number(familyData.level?.current) || 1),
      },
      balance: {
        credits: selectedChild ? Number(selectedChild.credits) || 0 : Number(familyData.balance?.credits) || 0,
      },
      jobs,
      goals,
    },
    context: {
      familyId: targetFamilyId,
      userId,
      userRole,
    },
  }
}

export async function createJob(jobPayload, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can create jobs.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const targetFamilyId = activeFamilyId
  const title = (jobPayload.title || '').trim()

  if (!title) {
    throw new Error('Job title is required.')
  }

  const points = Number(jobPayload.points) || 0
  const rewardType = jobPayload.rewardType === 'xp' ? 'xp' : 'credits'
  const claimLimitCount = Number(jobPayload.claimLimitCount) || 0
  const claimLimitPeriod =
    jobPayload.claimLimitPeriod === 'day' || jobPayload.claimLimitPeriod === 'week'
      ? jobPayload.claimLimitPeriod
      : null
  const familyClaimLimitCount = Number(jobPayload.familyClaimLimitCount) || 0
  const familyClaimLimitPeriod =
    jobPayload.familyClaimLimitPeriod === 'day' || jobPayload.familyClaimLimitPeriod === 'week'
      ? jobPayload.familyClaimLimitPeriod
      : null
  const claimLimitKey = normalizeJobLimitKey(title)
  const autoRecreate = Boolean(jobPayload.autoRecreate)
  const badgeContribution = normalizeJobBadgeContribution(jobPayload.badgeContribution)
  const missedAfterHoursRaw = Number(jobPayload.missedAfterHours)
  const missedAfterHours =
    Number.isFinite(missedAfterHoursRaw) && missedAfterHoursRaw > 0
      ? Math.round(missedAfterHoursRaw)
      : null

  const jobRef = await addDoc(collection(db, 'families', targetFamilyId, 'jobs'), {
    title,
    rewardType,
    basePoints: points,
    points,
    icon: jobPayload.icon || '✅',
    childId: jobPayload.childId || null,
    claimLimitCount,
    claimLimitPeriod: claimLimitCount > 0 ? claimLimitPeriod || 'week' : null,
    familyClaimLimitCount,
    familyClaimLimitPeriod:
      familyClaimLimitCount > 0 ? familyClaimLimitPeriod || 'week' : null,
    claimLimitKey: claimLimitCount > 0 ? claimLimitKey : null,
    autoRecreate,
    badgeContribution,
    missedAfterHours,
    requiresApproval:
      jobPayload.requiresApproval === true ? true
      : jobPayload.requiresApproval === false ? false
      : null,
    status: 'open',
    order: Number(jobPayload.order) || Date.now(),
    claimedBy: null,
    createdBy: userId,
    createdAt: serverTimestamp(),
  })

  trackAnalyticsEvent(
    'job_created',
    {
      itemId: jobRef.id,
      itemType: 'job',
      title,
      source: 'createJob',
      screen: 'parent',
    },
    { familyId: targetFamilyId, userId, userRole },
  )

  trackAnalyticsEvent(
    'onboarding_job_created',
    {
      itemId: jobRef.id,
      source: 'createJob',
      screen: 'onboarding',
    },
    { familyId: targetFamilyId, userId, userRole },
    {
      dedupe: true,
      dedupeKey: `onboarding_job_created:${targetFamilyId}:${jobRef.id}`,
    },
  )

  await maybeTrackOnboardingCompleted({ familyId: targetFamilyId, userId, userRole })

  return jobRef.id
}

export async function updateJob(jobId, jobPayload, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update jobs.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const title = (jobPayload.title || '').trim()
  if (!title) {
    throw new Error('Job title is required.')
  }

  const points = Number(jobPayload.points) || 0
  const rewardType = jobPayload.rewardType === 'xp' ? 'xp' : 'credits'
  const claimLimitCount = Number(jobPayload.claimLimitCount) || 0
  const claimLimitPeriod =
    jobPayload.claimLimitPeriod === 'day' || jobPayload.claimLimitPeriod === 'week'
      ? jobPayload.claimLimitPeriod
      : null
  const familyClaimLimitCount = Number(jobPayload.familyClaimLimitCount) || 0
  const familyClaimLimitPeriod =
    jobPayload.familyClaimLimitPeriod === 'day' || jobPayload.familyClaimLimitPeriod === 'week'
      ? jobPayload.familyClaimLimitPeriod
      : null
  const claimLimitKey = normalizeJobLimitKey(title)
  const autoRecreate = Boolean(jobPayload.autoRecreate)
  const badgeContribution = normalizeJobBadgeContribution(jobPayload.badgeContribution)
  const missedAfterHoursRaw = Number(jobPayload.missedAfterHours)
  const missedAfterHours =
    Number.isFinite(missedAfterHoursRaw) && missedAfterHoursRaw > 0
      ? Math.round(missedAfterHoursRaw)
      : null

  await updateDoc(doc(db, 'families', activeFamilyId, 'jobs', jobId), {
    title,
    rewardType,
    points,
    basePoints: points,
    childId: jobPayload.childId || null,
    claimLimitCount,
    claimLimitPeriod: claimLimitCount > 0 ? claimLimitPeriod || 'week' : null,
    familyClaimLimitCount,
    familyClaimLimitPeriod:
      familyClaimLimitCount > 0 ? familyClaimLimitPeriod || 'week' : null,
    claimLimitKey: claimLimitCount > 0 ? claimLimitKey : null,
    autoRecreate,
    badgeContribution,
    missedAfterHours,
    requiresApproval:
      jobPayload.requiresApproval === true ? true
      : jobPayload.requiresApproval === false ? false
      : null,
    updatedAt: serverTimestamp(),
  })
  trackAnalyticsEvent(
    'job_updated',
    {
      itemId: jobId,
      itemType: 'job',
      title,
      source: 'updateJob',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId: null, userRole },
  )
}

export async function deleteJob(jobId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can delete jobs.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  if (!jobId) {
    throw new Error('Job ID is required.')
  }

  await deleteDoc(doc(db, 'families', activeFamilyId, 'jobs', jobId))

  const relatedRequests = await getDocs(
    query(
      collection(db, 'families', activeFamilyId, 'jobCheckRequests'),
      where('jobId', '==', jobId),
    ),
  )

  await Promise.all(relatedRequests.docs.map((item) => deleteDoc(item.ref)))

  trackAnalyticsEvent(
    'job_deleted',
    {
      itemId: jobId,
      itemType: 'job',
      source: 'deleteJob',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId, userRole },
  )
}

export async function claimJob(jobId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'kid') {
    throw new Error('Only kids can claim jobs.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const targetFamilyId = activeFamilyId
  const jobRef = doc(db, 'families', targetFamilyId, 'jobs', jobId)
  const jobSnap = await getDoc(jobRef)

  if (!jobSnap.exists()) {
    throw new Error('Job not found.')
  }

  const jobData = normalizeJob({ id: jobSnap.id, ...jobSnap.data() })
  if (jobData.status !== 'open') {
    throw new Error('Only open jobs can be claimed.')
  }

  if (jobData.childId && jobData.childId !== userId) {
    throw new Error('This job is assigned to a different child.')
  }

  const familySnap = await getDoc(doc(db, 'families', targetFamilyId))
  const familyData = familySnap.exists() ? familySnap.data() : {}
  const flowSettings = normalizeFamilyJobFlowSettings(familyData)
  const staleBonusSettings = normalizeFamilyJobStaleBonusSettings(familyData)
  const adjustedJobPoints = calculateJobAdjustedPoints(jobData, staleBonusSettings)

  const limitCount = Number(jobData.claimLimitCount) || 0
  const limitPeriod = jobData.claimLimitPeriod
  const familyLimitCount = Number(jobData.familyClaimLimitCount) || 0
  const familyLimitPeriod = jobData.familyClaimLimitPeriod
  const limitKey = jobData.claimLimitKey || normalizeJobLimitKey(jobData.title)

  if (limitCount > 0 && limitPeriod && limitKey) {
    const windowStart = startOfCurrentWindow(limitPeriod)
    const myJobsSnapshot = await getDocs(
      query(
        collection(db, 'families', targetFamilyId, 'jobs'),
        where('claimedBy', '==', userId),
      ),
    )

    const usedClaims = myJobsSnapshot.docs
      .map((item) => normalizeJob({ id: item.id, ...item.data() }))
      .filter((item) => item.claimLimitKey === limitKey)
      .filter((item) => item.status === 'claimed' || item.status === 'done')
      .filter((item) => {
        const claimedAt = item.claimedAt?.toDate?.() || null
        if (!windowStart || !claimedAt) {
          return false
        }
        return claimedAt >= windowStart
      }).length

    if (usedClaims >= limitCount) {
      const readablePeriod = limitPeriod === 'day' ? 'today' : 'this week'
      throw new Error(
        `You already reached this job limit (${limitCount} per ${limitPeriod}) ${readablePeriod}.`,
      )
    }
  }

  if (familyLimitCount > 0 && familyLimitPeriod && limitKey) {
    const windowStart = startOfCurrentWindow(familyLimitPeriod)
    const jobsSnapshot = await getDocs(collection(db, 'families', targetFamilyId, 'jobs'))

    const usedFamilyClaims = jobsSnapshot.docs
      .map((item) => normalizeJob({ id: item.id, ...item.data() }))
      .filter((item) => item.claimLimitKey === limitKey)
      .filter((item) => item.status === 'claimed' || item.status === 'done')
      .filter((item) => {
        const claimedAt = item.claimedAt?.toDate?.() || null
        if (!windowStart || !claimedAt) {
          return false
        }
        return claimedAt >= windowStart
      }).length

    if (usedFamilyClaims >= familyLimitCount) {
      const readablePeriod = familyLimitPeriod === 'day' ? 'today' : 'this week'
      throw new Error(
        `This job is at its family limit (${familyLimitCount} per ${familyLimitPeriod}) ${readablePeriod}.`,
      )
    }
  }

  // Global pool jobs are limited to one active claim per child.
  if (!jobData.childId) {
    const activePoolClaimQuery = query(
      collection(db, 'families', targetFamilyId, 'jobs'),
      where('claimedBy', '==', userId),
      where('status', '==', 'claimed'),
      where('childId', '==', null),
    )
    const activePoolClaimSnap = await getDocs(activePoolClaimQuery)
    const activePoolClaimIds = activePoolClaimSnap.docs.map((item) => item.id)

    let pendingCheckJobIds = new Set()
    if (flowSettings.allowClaimingWithPendingChecks && activePoolClaimIds.length > 0) {
      const pendingChecksQuery = query(
        collection(db, 'families', targetFamilyId, 'jobCheckRequests'),
        where('requestedBy', '==', userId),
        where('status', '==', 'pending'),
      )
      const pendingChecksSnap = await getDocs(pendingChecksQuery)
      pendingCheckJobIds = new Set(
        pendingChecksSnap.docs.map((item) => item.data()?.jobId).filter(Boolean),
      )
    }

    const blockingClaimCount = computeBlockingPoolClaimCount(
      activePoolClaimIds,
      pendingCheckJobIds,
      flowSettings.allowClaimingWithPendingChecks,
    )

    if (blockingClaimCount >= flowSettings.maxActivePoolClaimsPerChild) {
      throw new Error(
        `You already have ${blockingClaimCount}/${flowSettings.maxActivePoolClaimsPerChild} pool task(s) in progress.`,
      )
    }
  }

  await updateDoc(jobRef, {
    status: 'claimed',
    points: adjustedJobPoints.adjustedPoints,
    claimedBy: userId,
    claimedAt: serverTimestamp(),
  })
  trackAnalyticsEvent(
    'job_claimed',
    {
      itemId: jobId,
      itemType: 'job',
      title: jobData.title,
      staleBonusPercent: adjustedJobPoints.staleBonusMeta.bonusPercent,
      source: 'claimJob',
      screen: 'kid',
    },
    { familyId: targetFamilyId, userId, userRole },
  )
}

export async function requestJobCheck(job, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'kid') {
    throw new Error('Only kids can request a job check.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  if (!job?.id) {
    throw new Error('Job ID is required for check request.')
  }

  const jobRef = doc(db, 'families', activeFamilyId, 'jobs', job.id)
  const jobSnap = await getDoc(jobRef)

  if (!jobSnap.exists()) {
    throw new Error('Job not found.')
  }

  const jobData = normalizeJob({ id: jobSnap.id, ...jobSnap.data() })
  if (jobData.status !== 'claimed') {
    throw new Error('Only claimed jobs can be submitted for check.')
  }

  if (jobData.claimedBy !== userId) {
    throw new Error('You can only request checks for your claimed jobs.')
  }

  // Check whether this job should be auto-approved.
  const familySnap = await getDoc(doc(db, 'families', activeFamilyId))
  const familySettings = familySnap.exists() ? normalizeFamilySavingsSettings(familySnap.data() || {}) : normalizeFamilySavingsSettings({})
  const familyJobMode = normalizeJobCheckApprovalMode(
    familySnap.exists() ? familySnap.data()?.jobCheckApprovalMode : undefined,
  )
  const effectiveAutoApprove =
    jobData.requiresApproval === false
      ? true
      : jobData.requiresApproval === true
        ? false
        : familyJobMode === 'auto_approve'

  if (effectiveAutoApprove) {
    await updateDoc(jobRef, { status: 'done', completedAt: serverTimestamp() })

    if (jobData.rewardType !== 'xp') {
      const childRef = doc(db, 'families', activeFamilyId, 'children', userId)
      const grossCredits = Math.max(0, Number(jobData.points) || 0)
      const incomeTaxCredits = familySettings.familyFundEnabled
        ? calculateFundTaxAmount(
          grossCredits,
          familySettings.familyFundIncomeTaxEnabled,
          familySettings.familyFundIncomeTaxPercent,
        )
        : 0
      const netCredits = grossCredits - incomeTaxCredits

      await updateDoc(childRef, {
        credits: increment(netCredits),
        updatedAt: serverTimestamp(),
      })

      if (incomeTaxCredits > 0) {
        await updateDoc(doc(db, 'families', activeFamilyId), {
          familyFundBalance: increment(incomeTaxCredits),
          updatedAt: serverTimestamp(),
        })
      }
    }

    await awardFamilyXp(activeFamilyId, Number(jobData.points) || 0)
    await maybeAwardWeeklyStreakBonus(activeFamilyId, userId, {
      familyId: activeFamilyId,
      userId,
      userRole,
      childId: userId,
    })

    if (jobData.autoRecreate) {
      const nextBasePoints = Number(jobData.basePoints ?? jobData.points) || 0
      await addDoc(collection(db, 'families', activeFamilyId, 'jobs'), {
        title: jobData.title,
        rewardType: jobData.rewardType === 'xp' ? 'xp' : 'credits',
        basePoints: nextBasePoints,
        points: nextBasePoints,
        icon: jobData.icon || '✅',
        childId: jobData.childId || null,
        claimLimitCount: Number(jobData.claimLimitCount) || 0,
        claimLimitPeriod: jobData.claimLimitPeriod || null,
        familyClaimLimitCount: Number(jobData.familyClaimLimitCount) || 0,
        familyClaimLimitPeriod: jobData.familyClaimLimitPeriod || null,
        claimLimitKey: jobData.claimLimitKey || normalizeJobLimitKey(jobData.title),
        autoRecreate: true,
        badgeContribution: jobData.badgeContribution,
        missedAfterHours: jobData.missedAfterHours,
        requiresApproval: jobData.requiresApproval,
        status: 'open',
        order: Date.now(),
        claimedBy: null,
        createdBy: jobData.createdBy || userId,
        createdAt: serverTimestamp(),
      })
    }

    trackAnalyticsEvent(
      'job_check_auto_approved',
      { itemId: job.id, itemType: 'job', title: jobData.title, source: 'requestJobCheck', screen: 'kid' },
      { familyId: activeFamilyId, userId, userRole },
    )
    return
  }

  try {
    const pendingQuery = query(
      collection(db, 'families', activeFamilyId, 'jobCheckRequests'),
      where('jobId', '==', job.id),
      where('status', '==', 'pending'),
      limit(1),
    )
    const pendingSnap = await getDocs(pendingQuery)
    if (!pendingSnap.empty) {
      throw new Error('A check request is already pending for this job.')
    }
  } catch (error) {
    if (error?.message === 'A check request is already pending for this job.') {
      throw error
    }
    // If query-read permission is restricted, continue and rely on create/write validation.
    if (error?.code !== 'permission-denied') {
      throw error
    }
  }

  try {
    await addDoc(collection(db, 'families', activeFamilyId, 'jobCheckRequests'), {
      jobId: job.id,
      childId: userId,
      jobTitle: jobData.title,
      rewardType: jobData.rewardType,
      points: Number(jobData.points) || 0,
      requestedBy: userId,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw new Error(
        'Permission denied creating job check request. Deploy the latest firestore.rules to include jobCheckRequests access.',
        { cause: error },
      )
    }
    throw error
  }
}

export async function getFamilyJobCheckRequests(context = {}) {
  const { familyId: activeFamilyId, userRole, userId } = getActiveFamilyContext(
    context,
  )
  const selectedChildId = context.selectedChildId || null

  if (!hasFirebaseConfig || !db) {
    return {
      source: 'empty',
      data: { requests: [] },
      context: { familyId: activeFamilyId, userId, userRole },
    }
  }

  let snapshot
  try {
    snapshot = await getDocs(collection(db, 'families', activeFamilyId, 'jobCheckRequests'))
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return {
        source: 'empty',
        data: { requests: [] },
        context: { familyId: activeFamilyId, userId, userRole },
      }
    }
    throw error
  }

  const requests = snapshot.docs
    .map((item) => normalizeJobCheckRequest({ id: item.id, ...item.data() }, item.id))
    .filter((item) => (selectedChildId ? item.childId === selectedChildId : true))
    .sort((a, b) => {
      if (a.status === b.status) {
        return 0
      }
      return a.status === 'pending' ? -1 : 1
    })

  return {
    source: 'firestore',
    data: { requests },
    context: { familyId: activeFamilyId, userId, userRole },
  }
}

export async function getFamilyConsequenceEvents(context = {}) {
  const { familyId: activeFamilyId, userRole, userId } = getActiveFamilyContext(context)
  const selectedChildId = context.selectedChildId || null

  if (!hasFirebaseConfig || !db) {
    return {
      source: 'empty',
      data: { events: [] },
      context: { familyId: activeFamilyId, userId, userRole },
    }
  }

  let snapshot
  try {
    snapshot = await getDocs(collection(db, 'families', activeFamilyId, 'consequenceEvents'))
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return {
        source: 'empty',
        data: { events: [] },
        context: { familyId: activeFamilyId, userId, userRole },
      }
    }
    throw error
  }

  const events = snapshot.docs
    .map((item) => normalizeConsequenceEvent({ id: item.id, ...item.data() }, item.id))
    .filter((item) => (selectedChildId ? item.childId === selectedChildId : true))
    .sort((a, b) => {
      const left = toDateValue(a.createdAt)?.getTime() || 0
      const right = toDateValue(b.createdAt)?.getTime() || 0
      return right - left
    })

  return {
    source: 'firestore',
    data: { events },
    context: { familyId: activeFamilyId, userId, userRole },
  }
}

export async function reviewJobCheckRequest(requestId, decision, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can review job checks.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  if (decision !== 'approved' && decision !== 'denied') {
    throw new Error('Decision must be approved or denied.')
  }

  const requestRef = doc(db, 'families', activeFamilyId, 'jobCheckRequests', requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    throw new Error('Job check request not found.')
  }

  const requestData = normalizeJobCheckRequest(
    { id: requestSnap.id, ...requestSnap.data() },
    requestSnap.id,
  )

  if (requestData.status !== 'pending') {
    throw new Error('This check request has already been reviewed.')
  }

  await updateDoc(requestRef, {
    status: decision,
    reviewedBy: userId,
    reviewedAt: serverTimestamp(),
  })

  let deniedPenaltyApplied = 0

  if (decision === 'denied') {
    const familyRef = doc(db, 'families', activeFamilyId)
    const familySnap = await getDoc(familyRef)
    const consequenceSettings = normalizeFamilyJobConsequenceSettings(
      familySnap.exists() ? familySnap.data() : {},
    )

    const configuredPenalty = consequenceSettings.failedJobCheckConsequenceEnabled
      ? consequenceSettings.failedJobCheckPenaltyCredits
      : 0

    if (configuredPenalty > 0 && requestData.childId) {
      const childRef = doc(db, 'families', activeFamilyId, 'children', requestData.childId)
      const childSnap = await getDoc(childRef)

      if (childSnap.exists()) {
        const currentCredits = Math.max(0, Number(childSnap.data()?.credits) || 0)
        deniedPenaltyApplied = computeCappedPenalty(currentCredits, configuredPenalty)

        if (deniedPenaltyApplied > 0) {
          await updateDoc(childRef, {
            credits: currentCredits - deniedPenaltyApplied,
            updatedAt: serverTimestamp(),
          })
        }
      }
    }
  }

  if (decision === 'denied') {
    await addConsequenceEvent(activeFamilyId, {
      type: 'job_check_denied',
      childId: requestData.childId,
      jobId: requestData.jobId,
      jobTitle: requestData.jobTitle,
      decision,
      penaltyCredits: deniedPenaltyApplied,
      createdBy: userId,
      source: 'reviewJobCheckRequest',
    })
  }

  if (decision === 'approved') {
    const familyRef = doc(db, 'families', activeFamilyId)
    const familySnap = await getDoc(familyRef)
    const familySettings = familySnap.exists() ? normalizeFamilySavingsSettings(familySnap.data() || {}) : normalizeFamilySavingsSettings({})
    const jobRef = doc(db, 'families', activeFamilyId, 'jobs', requestData.jobId)
    const jobSnap = await getDoc(jobRef)
    const approvedJob = jobSnap.exists()
      ? normalizeJob({ id: jobSnap.id, ...jobSnap.data() })
      : null

    await updateDoc(jobRef, {
      status: 'done',
      completedAt: serverTimestamp(),
    })

    if (requestData.rewardType !== 'xp') {
      const grossCredits = Math.max(0, Number(requestData.points) || 0)
      const incomeTaxCredits = familySettings.familyFundEnabled
        ? calculateFundTaxAmount(
          grossCredits,
          familySettings.familyFundIncomeTaxEnabled,
          familySettings.familyFundIncomeTaxPercent,
        )
        : 0
      const netCredits = grossCredits - incomeTaxCredits
      const childRef = doc(db, 'families', activeFamilyId, 'children', requestData.childId)
      await updateDoc(childRef, {
        credits: increment(netCredits),
        updatedAt: serverTimestamp(),
      })

      if (incomeTaxCredits > 0) {
        await updateDoc(familyRef, {
          familyFundBalance: increment(incomeTaxCredits),
          updatedAt: serverTimestamp(),
        })
      }
    }

    await awardFamilyXp(activeFamilyId, Number(requestData.points) || 0)
    await maybeAwardWeeklyStreakBonus(activeFamilyId, requestData.childId, {
      familyId: activeFamilyId,
      userId,
      userRole,
      childId: requestData.childId,
    })

    if (approvedJob?.autoRecreate) {
      const nextBasePoints = Number(approvedJob.basePoints ?? approvedJob.points) || 0

      await addDoc(collection(db, 'families', activeFamilyId, 'jobs'), {
        title: approvedJob.title,
        rewardType: approvedJob.rewardType === 'xp' ? 'xp' : 'credits',
        basePoints: nextBasePoints,
        points: nextBasePoints,
        icon: approvedJob.icon || '✅',
        childId: approvedJob.childId || null,
        claimLimitCount: Number(approvedJob.claimLimitCount) || 0,
        claimLimitPeriod: approvedJob.claimLimitPeriod || null,
        familyClaimLimitCount: Number(approvedJob.familyClaimLimitCount) || 0,
        familyClaimLimitPeriod: approvedJob.familyClaimLimitPeriod || null,
        claimLimitKey: approvedJob.claimLimitKey || normalizeJobLimitKey(approvedJob.title),
        autoRecreate: true,
        badgeContribution: approvedJob.badgeContribution,
        missedAfterHours: approvedJob.missedAfterHours,
        requiresApproval: approvedJob.requiresApproval,
        status: 'open',
        order: Date.now(),
        claimedBy: null,
        createdBy: approvedJob.createdBy || userId,
        createdAt: serverTimestamp(),
      })
    }
  }

  trackAnalyticsEvent(
    'job_check_reviewed',
    {
      itemId: requestData.jobId,
      itemType: 'job',
      childId: requestData.childId,
      decision,
      deniedPenaltyCredits: deniedPenaltyApplied,
      source: 'reviewJobCheckRequest',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId, userRole },
  )
}

export async function markJobAsMissed(jobId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can mark jobs as missed.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const familyRef = doc(db, 'families', activeFamilyId)
  const jobRef = doc(db, 'families', activeFamilyId, 'jobs', jobId)

  const result = await runTransaction(db, async (transaction) => {
    const [familySnap, jobSnap] = await Promise.all([
      transaction.get(familyRef),
      transaction.get(jobRef),
    ])

    if (!jobSnap.exists()) {
      throw new Error('Job not found.')
    }

    const jobData = normalizeJob({ id: jobSnap.id, ...jobSnap.data() })

    if (jobData.status !== 'claimed') {
      throw new Error('Only claimed jobs can be marked as missed.')
    }

    const consequenceSettings = normalizeFamilyJobConsequenceSettings(
      familySnap.data() || {},
    )

    if (consequenceSettings.missedJobTimingEnabled) {
      const claimedAt = toDateValue(jobData.claimedAt)

      if (!claimedAt) {
        throw new Error('This job has no claim timestamp yet. Try again in a moment.')
      }

      const jobSpecificHours = Number(jobData.missedAfterHours) || 0
      const waitHours = jobSpecificHours > 0
        ? jobSpecificHours
        : consequenceSettings.missedJobDefaultHours
      const waitMs = Math.max(1, waitHours) * 60 * 60 * 1000
      const eligibleAtMs = claimedAt.getTime() + waitMs

      if (Date.now() < eligibleAtMs) {
        const remainingHours = Math.max(
          1,
          Math.ceil((eligibleAtMs - Date.now()) / (60 * 60 * 1000)),
        )
        throw new Error(
          `This job cannot be marked missed yet. Try again in about ${remainingHours} hour(s).`,
        )
      }
    }

    const targetChildId = jobData.claimedBy || jobData.childId || null
    const configuredPenalty = consequenceSettings.missedJobConsequenceEnabled
      ? consequenceSettings.missedJobPenaltyCredits
      : 0

    let appliedPenalty = 0

    if (targetChildId && configuredPenalty > 0) {
      const childRef = doc(db, 'families', activeFamilyId, 'children', targetChildId)
      const childSnap = await transaction.get(childRef)

      if (childSnap.exists()) {
        const currentCredits = Math.max(0, Number(childSnap.data()?.credits) || 0)
        appliedPenalty = computeCappedPenalty(currentCredits, configuredPenalty)

        if (appliedPenalty > 0) {
          transaction.update(childRef, {
            credits: currentCredits - appliedPenalty,
            updatedAt: serverTimestamp(),
          })
        }
      }
    }

    transaction.update(jobRef, {
      status: 'open',
      points: Number(jobData.basePoints ?? jobData.points) || 0,
      claimedBy: null,
      claimedAt: null,
      completedAt: null,
      updatedAt: serverTimestamp(),
    })

    return {
      id: jobData.id,
      title: jobData.title,
      childId: targetChildId,
      appliedPenalty,
      timingEnabled: consequenceSettings.missedJobTimingEnabled,
      waitHours: consequenceSettings.missedJobTimingEnabled
        ? (Number(jobData.missedAfterHours) || consequenceSettings.missedJobDefaultHours)
        : null,
    }
  })

  const pendingRequests = await getDocs(
    query(
      collection(db, 'families', activeFamilyId, 'jobCheckRequests'),
      where('jobId', '==', jobId),
      where('status', '==', 'pending'),
    ),
  )

  await Promise.all(
    pendingRequests.docs.map((item) =>
      updateDoc(item.ref, {
        status: 'denied',
        reviewedBy: userId,
        reviewedAt: serverTimestamp(),
      })),
  )

  await addConsequenceEvent(activeFamilyId, {
    type: 'job_marked_missed',
    childId: result.childId,
    jobId: result.id,
    jobTitle: result.title,
    penaltyCredits: result.appliedPenalty,
    createdBy: userId,
    source: 'markJobAsMissed',
  })

  trackAnalyticsEvent(
    'job_marked_missed',
    {
      itemId: result.id,
      itemType: 'job',
      title: result.title,
      childId: result.childId,
      penaltyCredits: result.appliedPenalty,
      timingEnabled: result.timingEnabled,
      waitHours: result.waitHours,
      source: 'markJobAsMissed',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId, userRole },
  )

  return result
}

export async function getFamilyStoreData(context = {}) {
  const { familyId: activeFamilyId, userRole, userId } = getActiveFamilyContext(
    context,
  )
  const selectedChildId = context.selectedChildId || null

  if (!hasFirebaseConfig || !db) {
    return {
      source: 'empty',
      data: {
        rewards: [],
        requests: [],
        fundTaxSettings: {
          familyFundEnabled: true,
          familyFundSalesTaxEnabled: false,
          familyFundSalesTaxPercent: 0,
        },
      },
      context: { familyId: activeFamilyId, userId, userRole },
    }
  }

  const rewardsSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'rewards'),
  )
  const requestsSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'rewardRequests'),
  )

  const allRequests = requestsSnapshot.docs
    .map((item) =>
      normalizeRewardRequest({ id: item.id, ...item.data() }, item.id),
    )

  const requests = allRequests
    .filter((request) =>
      selectedChildId
        ? !request.childId || request.childId === selectedChildId
        : true,
    )
    .sort((a, b) => {
      if (a.status === b.status) {
        return 0
      }
      return a.status === 'pending' ? -1 : 1
    })

  const rewardUsage = {}
  const dayStart = startOfCurrentWindow('day')
  const weekStart = startOfCurrentWindow('week')

  allRequests
    .filter((request) => request.requestKind === 'purchase')
    .filter((request) => request.status === 'pending' || request.status === 'approved' || request.status === 'fulfilled')
    .forEach((request) => {
      const rewardId = request.rewardId
      if (!rewardId) {
        return
      }

      if (!rewardUsage[rewardId]) {
        rewardUsage[rewardId] = {
          familyDay: 0,
          familyWeek: 0,
          childDay: 0,
          childWeek: 0,
        }
      }

      const createdAt = request.createdAt?.toDate?.() || null
      if (!createdAt) {
        return
      }

      if (dayStart && createdAt >= dayStart) {
        rewardUsage[rewardId].familyDay += 1
        if (selectedChildId && request.requestedBy === selectedChildId) {
          rewardUsage[rewardId].childDay += 1
        }
      }

      if (weekStart && createdAt >= weekStart) {
        rewardUsage[rewardId].familyWeek += 1
        if (selectedChildId && request.requestedBy === selectedChildId) {
          rewardUsage[rewardId].childWeek += 1
        }
      }
    })

  const familySnap = await getDoc(doc(db, 'families', activeFamilyId))
  const familyData = familySnap.data() || {}
  const pricingSettings = normalizeFamilyPricingSettings(familyData)
  const fundTaxSettings = {
    familyFundEnabled: familyData.familyFundEnabled !== false,
    familyFundSalesTaxEnabled: Boolean(familyData.familyFundSalesTaxEnabled),
    familyFundSalesTaxPercent: normalizeFundTaxPercent(familyData.familyFundSalesTaxPercent),
  }

  const rewards = rewardsSnapshot.docs
    .map((item) => normalizeReward({ id: item.id, ...item.data() }, item.id))
    .map((reward) => {
      const pricing = calculateRewardAdjustedCost(reward, requests, pricingSettings)
      return {
        ...reward,
        cost: pricing.adjustedCost,
        pricingMeta: pricing.pricingMeta,
      }
    })
    .filter((reward) =>
      selectedChildId
        ? !reward.childId || reward.childId === selectedChildId
        : true,
    )
    .sort((a, b) => a.cost - b.cost)

  return {
    source: 'firestore',
    data: { rewards, requests, pricingSettings, rewardUsage, fundTaxSettings },
    context: { familyId: activeFamilyId, userId, userRole },
  }
}

export async function requestReward(reward, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'kid') {
    throw new Error('Only kids can request rewards.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  if (!reward?.id) {
    throw new Error('Reward ID is required.')
  }

  const rewardRef = doc(db, 'families', activeFamilyId, 'rewards', reward.id)
  const rewardSnap = await getDoc(rewardRef)

  if (!rewardSnap.exists()) {
    throw new Error('Reward not found.')
  }

  const rewardData = normalizeReward({ id: rewardSnap.id, ...rewardSnap.data() }, rewardSnap.id)

  const familySnap = await getDoc(doc(db, 'families', activeFamilyId))
  const familyData = familySnap.data() || {}
  const pricingSettings = normalizeFamilyPricingSettings(familyData)
  const rewardApprovalSettings = normalizeFamilyRewardSettings(familyData)

  const limitCount = Number(rewardData.claimLimitCount) || 0
  const limitPeriod = rewardData.claimLimitPeriod
  const familyLimitCount = Number(rewardData.familyClaimLimitCount) || 0
  const familyLimitPeriod = rewardData.familyClaimLimitPeriod
  const requestSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'rewardRequests'),
  )
  const allRewardRequests = requestSnapshot.docs
    .map((item) => normalizeRewardRequest({ id: item.id, ...item.data() }, item.id))

  const hasOpenRewardRequest = allRewardRequests.some(
    (item) =>
      item.requestedBy === userId
      && (item.status === 'pending' || item.status === 'countered'),
  )

  if (hasOpenRewardRequest) {
    throw new Error('You already have a reward request waiting. Finish that one before sending another.')
  }

  const pricing = calculateRewardAdjustedCost(rewardData, allRewardRequests, pricingSettings)
  const effectiveCost = pricing.adjustedCost
  const salesTaxAmount = familyData.familyFundEnabled !== false
    ? calculateFundTaxAmount(
      effectiveCost,
      Boolean(familyData.familyFundSalesTaxEnabled),
      familyData.familyFundSalesTaxPercent,
    )
    : 0
  const totalCost = (Number(effectiveCost) || 0) + salesTaxAmount

  const targetChildId = context.selectedChildId || userId
  if (targetChildId) {
    const childRef = doc(db, 'families', activeFamilyId, 'children', targetChildId)
    const childSnap = await getDoc(childRef)

      if (!childSnap.exists()) {
        throw new Error('Child profile not found.')
      }

      const childCredits = Number(childSnap.data()?.credits) || 0
      if (childCredits < Number(totalCost || 0)) {
        const deficit = Number(totalCost || 0) - childCredits
        throw new Error(`Not enough credits. You need ${deficit} more credits.`)
      }
  }

  if (rewardData.repeatMode === 'once') {
    const alreadyRequested = allRewardRequests
      .some(
        (item) =>
          item.requestKind === 'purchase'
          &&
          item.rewardId === rewardData.id
          && item.requestedBy === userId
            && (item.status === 'pending' || item.status === 'approved' || item.status === 'fulfilled'),
      )

    if (alreadyRequested) {
      throw new Error('This reward is one-time only and was already used.')
    }
  }

  if (familyLimitCount > 0 && familyLimitPeriod) {
    const windowStart = startOfCurrentWindow(familyLimitPeriod)

    const usedFamilyClaims = allRewardRequests
      .filter((item) => item.requestKind === 'purchase')
      .filter((item) => item.rewardId === rewardData.id)
      .filter((item) => item.status === 'pending' || item.status === 'approved' || item.status === 'fulfilled')
      .filter((item) => {
        const createdAt = item.createdAt?.toDate?.() || null
        if (!windowStart || !createdAt) {
          return false
        }
        return createdAt >= windowStart
      }).length

    if (usedFamilyClaims >= familyLimitCount) {
      const readablePeriod = familyLimitPeriod === 'day' ? 'today' : 'this week'
      throw new Error(
        `This reward is at its family limit (${familyLimitCount} per ${familyLimitPeriod}) ${readablePeriod}.`,
      )
    }
  }

  if (limitCount > 0 && limitPeriod) {
    const windowStart = startOfCurrentWindow(limitPeriod)

    const usedClaims = allRewardRequests
      .filter((item) => item.requestKind === 'purchase')
      .filter((item) => item.rewardId === rewardData.id)
      .filter((item) => item.requestedBy === userId)
      .filter((item) => item.status === 'pending' || item.status === 'approved' || item.status === 'fulfilled')
      .filter((item) => {
        const createdAt = item.createdAt?.toDate?.() || null
        if (!windowStart || !createdAt) {
          return false
        }
        return createdAt >= windowStart
      }).length

    if (usedClaims >= limitCount) {
      const readablePeriod = limitPeriod === 'day' ? 'today' : 'this week'
      throw new Error(
        `You already reached this reward limit (${limitCount} per ${limitPeriod}) ${readablePeriod}.`,
      )
    }
  }

  const effectiveAutoApprove =
    rewardData.requiresApproval === false
      ? true
      : rewardData.requiresApproval === true
        ? false
        : rewardApprovalSettings.rewardRequestApprovalMode === 'auto_approve'

  const nextStatus = effectiveAutoApprove ? 'approved' : 'pending'

  await addDoc(collection(db, 'families', activeFamilyId, 'rewardRequests'), {
    requestKind: 'purchase',
    rewardId: rewardData.id,
    childId: rewardData.childId || context.selectedChildId || null,
    rewardTitle: rewardData.title,
    cost: Number(effectiveCost) || 0,
    costBeforeTax: Number(effectiveCost) || 0,
    salesTaxPercent: normalizeFundTaxPercent(familyData.familyFundSalesTaxPercent),
    salesTaxAmount,
    totalCost,
    requestedBy: userId,
    status: nextStatus,
    autoApproved: effectiveAutoApprove,
    notificationDismissedAt: null,
    notificationDismissedBy: null,
    createdAt: serverTimestamp(),
    reviewedAt: effectiveAutoApprove ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  })

  if (effectiveAutoApprove) {
    const spendAmount = totalCost

    if (targetChildId) {
      const childRef = doc(db, 'families', activeFamilyId, 'children', targetChildId)

      await runTransaction(db, async (transaction) => {
        const childSnap = await transaction.get(childRef)
        if (!childSnap.exists()) {
          throw new Error('Child profile not found for this reward request.')
        }

        const currentCredits = Number(childSnap.data()?.credits) || 0
        if (currentCredits < spendAmount) {
          throw new Error('This child no longer has enough credits for this reward.')
        }

        transaction.update(childRef, {
          credits: currentCredits - spendAmount,
          updatedAt: serverTimestamp(),
        })
      })
    } else {
      const familyBalanceRef = doc(db, 'families', activeFamilyId)
      await updateDoc(familyBalanceRef, {
        'balance.credits': increment(-spendAmount),
      })
    }

    if (salesTaxAmount > 0) {
      await updateDoc(doc(db, 'families', activeFamilyId), {
        familyFundBalance: increment(salesTaxAmount),
        updatedAt: serverTimestamp(),
      })
    }
  }

  trackAnalyticsEvent(
    'reward_request_submitted',
    {
      itemId: rewardData.id,
      itemType: 'reward',
      title: rewardData.title,
      cost: Number(totalCost) || 0,
      preTaxCost: Number(effectiveCost) || 0,
      salesTaxAmount,
      autoApproved: effectiveAutoApprove,
      source: 'requestReward',
      screen: 'kid',
    },
    { familyId: activeFamilyId, userId, userRole, childId: targetChildId },
  )
}

export async function createCustomRewardRequest(requestPayload, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'kid') {
    throw new Error('Only kids can request custom rewards.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const rewardTitle = (requestPayload.rewardTitle || '').trim()
  const cost = Number(requestPayload.cost) || 0
  const childNote = (requestPayload.childNote || '').trim()
  const childId = context.selectedChildId || userId

  if (!rewardTitle) {
    throw new Error('Reward title is required.')
  }

  if (!Number.isFinite(cost) || cost <= 0) {
    throw new Error('Reward cost must be greater than zero.')
  }

  const requestSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'rewardRequests'),
  )
  const allRewardRequests = requestSnapshot.docs
    .map((item) => normalizeRewardRequest({ id: item.id, ...item.data() }, item.id))

  const hasOpenRewardRequest = allRewardRequests.some(
    (item) =>
      item.requestedBy === userId
      && (item.status === 'pending' || item.status === 'countered'),
  )

  if (hasOpenRewardRequest) {
    throw new Error('You already have a reward request waiting. Finish that one before sending another.')
  }

  await addDoc(collection(db, 'families', activeFamilyId, 'rewardRequests'), {
    requestKind: 'proposal',
    rewardId: null,
    childId,
    rewardTitle,
    cost,
    requestedBy: userId,
    status: 'pending',
    childNote,
    parentNote: '',
    counterRewardTitle: '',
    counterCost: 0,
    createdAt: serverTimestamp(),
  })

  trackAnalyticsEvent(
    'reward_request_submitted',
    {
      itemType: 'reward_proposal',
      title: rewardTitle,
      cost,
      source: 'createCustomRewardRequest',
      screen: 'kid',
    },
    { familyId: activeFamilyId, userId, userRole, childId },
  )
}

export async function reviewRewardRequest(requestId, decision, context = {}, options = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can approve or deny reward requests.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  if (decision !== 'approved' && decision !== 'denied' && decision !== 'countered') {
    throw new Error('Decision must be approved, denied, or countered.')
  }

  const parentNote = (options.parentNote || '').trim()
  const counterRewardTitle = (options.counterRewardTitle || '').trim()
  const counterCost = Number(options.counterCost) || 0

  const requestRef = doc(db, 'families', activeFamilyId, 'rewardRequests', requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    throw new Error('Reward request not found.')
  }

  const requestData = normalizeRewardRequest({ id: requestSnap.id, ...requestSnap.data() }, requestSnap.id)

  if (requestData.status !== 'pending') {
    throw new Error('This reward request has already been reviewed.')
  }

  const isProposal = requestData.requestKind === 'proposal'
  if (decision === 'countered' && !isProposal) {
    throw new Error('Only custom reward proposals can be countered.')
  }

  if (decision === 'countered') {
    const nextTitle = counterRewardTitle || requestData.rewardTitle
    const nextCost = counterCost > 0 ? counterCost : requestData.cost

    if (!nextTitle) {
      throw new Error('Counter reward title is required.')
    }

    if (!Number.isFinite(nextCost) || nextCost <= 0) {
      throw new Error('Counter reward cost must be greater than zero.')
    }

    await updateDoc(requestRef, {
      status: 'countered',
      parentNote,
      counterRewardTitle: nextTitle,
      counterCost: nextCost,
      reviewedBy: userId,
      reviewedAt: serverTimestamp(),
    })

    return
  }

  if (isProposal && decision === 'approved') {
    const approvedTitle = requestData.counterRewardTitle || requestData.rewardTitle
    const approvedCost = Number(requestData.counterCost) > 0
      ? Number(requestData.counterCost)
      : Number(requestData.cost) || 0

    await updateDoc(requestRef, {
      status: 'approved',
      parentNote,
      rewardId: null,
      rewardTitle: approvedTitle,
      cost: approvedCost,
      reviewedBy: userId,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return
  }

  await updateDoc(requestRef, {
    status: decision,
    parentNote,
    reviewedBy: userId,
    reviewedAt: serverTimestamp(),
  })

  if (decision === 'approved') {
    const familySnap = await getDoc(doc(db, 'families', activeFamilyId))
    const familySettings = familySnap.exists() ? normalizeFamilySavingsSettings(familySnap.data() || {}) : normalizeFamilySavingsSettings({})
    const baseCost = Number(requestData.costBeforeTax || requestData.cost) || 0
    const effectiveSalesTax = Number(requestData.salesTaxAmount) > 0
      ? Number(requestData.salesTaxAmount)
      : (familySettings.familyFundEnabled
        ? calculateFundTaxAmount(baseCost, familySettings.familyFundSalesTaxEnabled, familySettings.familyFundSalesTaxPercent)
        : 0)
    const spendAmount = Number(requestData.totalCost) > 0
      ? Number(requestData.totalCost)
      : (baseCost + effectiveSalesTax)
    const targetChildId = requestData.childId || requestData.requestedBy || null

    if (targetChildId) {
      const childRef = doc(db, 'families', activeFamilyId, 'children', targetChildId)

      await runTransaction(db, async (transaction) => {
        const childSnap = await transaction.get(childRef)
        if (!childSnap.exists()) {
          throw new Error('Child profile not found for this reward request.')
        }

        const currentCredits = Number(childSnap.data()?.credits) || 0
        if (currentCredits < spendAmount) {
          throw new Error('This child no longer has enough credits for this reward.')
        }

        transaction.update(childRef, {
          credits: currentCredits - spendAmount,
          updatedAt: serverTimestamp(),
        })
      })
    } else {
      const familyRef = doc(db, 'families', activeFamilyId)
      await updateDoc(familyRef, {
        'balance.credits': increment(-spendAmount),
      })
    }

    if (effectiveSalesTax > 0) {
      await updateDoc(doc(db, 'families', activeFamilyId), {
        familyFundBalance: increment(effectiveSalesTax),
        updatedAt: serverTimestamp(),
      })
    }
  }
}

export async function resolveRewardRequestAsPool(requestId, rewardPayload, context = {}, options = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can resolve reward requests into pool rewards.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const requestRef = doc(db, 'families', activeFamilyId, 'rewardRequests', requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    throw new Error('Reward request not found.')
  }

  const requestData = normalizeRewardRequest({ id: requestSnap.id, ...requestSnap.data() }, requestSnap.id)

  if (requestData.requestKind !== 'proposal' || requestData.status !== 'pending') {
    throw new Error('Only pending custom reward proposals can be moved to the family pool.')
  }

  const title = (rewardPayload.title || requestData.counterRewardTitle || requestData.rewardTitle || '').trim()
  const cost = Number(rewardPayload.cost)

  if (!title) {
    throw new Error('Reward title is required.')
  }

  if (!Number.isFinite(cost) || cost <= 0) {
    throw new Error('Reward cost must be greater than zero.')
  }

  const claimLimitCount = Math.max(0, Number(rewardPayload.claimLimitCount) || 0)
  const claimLimitPeriod =
    rewardPayload.claimLimitPeriod === 'day' || rewardPayload.claimLimitPeriod === 'week'
      ? rewardPayload.claimLimitPeriod
      : null
  const familyClaimLimitCount = Math.max(0, Number(rewardPayload.familyClaimLimitCount) || 0)
  const familyClaimLimitPeriod =
    rewardPayload.familyClaimLimitPeriod === 'day' || rewardPayload.familyClaimLimitPeriod === 'week'
      ? rewardPayload.familyClaimLimitPeriod
      : null
  const repeatMode = rewardPayload.repeatMode === 'once' ? 'once' : 'recur'
  const requiresApproval =
    rewardPayload.requiresApproval === true ? true
    : rewardPayload.requiresApproval === false ? false
    : null
  const parentNote = (options.parentNote || '').trim()

  const rewardRef = await addDoc(collection(db, 'families', activeFamilyId, 'rewards'), {
    title,
    cost,
    baseCost: cost,
    childId: null,
    repeatMode,
    claimLimitCount,
    claimLimitPeriod: claimLimitCount > 0 ? claimLimitPeriod || 'day' : null,
    familyClaimLimitCount,
    familyClaimLimitPeriod:
      familyClaimLimitCount > 0 ? familyClaimLimitPeriod || 'day' : null,
    requiresApproval,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await updateDoc(requestRef, {
    status: 'redirected_to_pool',
    parentNote,
    linkedRewardId: rewardRef.id,
    linkedRewardTitle: title,
    linkedRewardCost: cost,
    reviewedBy: userId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  trackAnalyticsEvent(
    'reward_request_redirected_to_pool',
    {
      itemId: requestId,
      itemType: 'reward_proposal',
      linkedRewardId: rewardRef.id,
      title,
      cost,
      source: 'resolveRewardRequestAsPool',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId, userRole, childId: requestData.childId || requestData.requestedBy || null },
  )

  return rewardRef.id
}

export async function fulfillRewardRequest(requestId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can fulfill reward requests.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const requestRef = doc(db, 'families', activeFamilyId, 'rewardRequests', requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    throw new Error('Reward request not found.')
  }

  const requestData = normalizeRewardRequest({ id: requestSnap.id, ...requestSnap.data() }, requestSnap.id)

  if (requestData.status !== 'approved') {
    throw new Error('Only approved reward requests can be marked fulfilled.')
  }

  if (requestData.requestKind !== 'purchase') {
    throw new Error('Only purchased reward requests can be fulfilled.')
  }

  await updateDoc(requestRef, {
    status: 'fulfilled',
    fulfilledBy: userId,
    fulfilledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  trackAnalyticsEvent(
    'reward_fulfilled',
    {
      itemId: requestData.rewardId || requestData.id,
      itemType: 'reward',
      title: requestData.rewardTitle,
      source: 'fulfillRewardRequest',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId, userRole, childId: requestData.childId || requestData.requestedBy || null },
  )
}

export async function claimApprovedRewardProposal(requestId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'kid') {
    throw new Error('Only kids can claim approved reward ideas.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const requestRef = doc(db, 'families', activeFamilyId, 'rewardRequests', requestId)

  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef)

    if (!requestSnap.exists()) {
      throw new Error('Reward request not found.')
    }

    const requestData = normalizeRewardRequest(
      { id: requestSnap.id, ...requestSnap.data() },
      requestSnap.id,
    )

    if (requestData.requestedBy !== userId) {
      throw new Error('You can only claim your own approved reward idea.')
    }

    if (requestData.requestKind !== 'proposal' || requestData.status !== 'approved') {
      throw new Error('This reward idea is not ready to claim.')
    }

    const familyRef = doc(db, 'families', activeFamilyId)
    const familySnap = await transaction.get(familyRef)
    const familySettings = familySnap.exists() ? normalizeFamilySavingsSettings(familySnap.data() || {}) : normalizeFamilySavingsSettings({})
    const baseCost = Number(requestData.cost) || 0
    const salesTaxAmount = familySettings.familyFundEnabled
      ? calculateFundTaxAmount(baseCost, familySettings.familyFundSalesTaxEnabled, familySettings.familyFundSalesTaxPercent)
      : 0
    const spendAmount = baseCost + salesTaxAmount
    const targetChildId = requestData.childId || requestData.requestedBy || userId
    const childRef = doc(db, 'families', activeFamilyId, 'children', targetChildId)
    const childSnap = await transaction.get(childRef)

    if (!childSnap.exists()) {
      throw new Error('Child profile not found for this reward request.')
    }

    const currentCredits = Number(childSnap.data()?.credits) || 0
    if (currentCredits < spendAmount) {
      throw new Error('You do not have enough credits for this reward yet.')
    }

    transaction.update(childRef, {
      credits: currentCredits - spendAmount,
      updatedAt: serverTimestamp(),
    })

    transaction.update(requestRef, {
      requestKind: 'purchase',
      status: 'approved',
      costBeforeTax: baseCost,
      salesTaxPercent: normalizeFundTaxPercent(familySettings.familyFundSalesTaxPercent),
      salesTaxAmount,
      totalCost: spendAmount,
      childRespondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    if (salesTaxAmount > 0) {
      transaction.update(familyRef, {
        familyFundBalance: increment(salesTaxAmount),
        updatedAt: serverTimestamp(),
      })
    }
  })

  trackAnalyticsEvent(
    'reward_proposal_claimed',
    {
      itemId: requestId,
      itemType: 'reward_proposal',
      source: 'claimApprovedRewardProposal',
      screen: 'kid',
    },
    { familyId: activeFamilyId, userId, userRole, childId: userId },
  )
}

export async function acceptRewardRequestTerms(requestId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'kid') {
    throw new Error('Only kids can accept reward terms.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const requestRef = doc(db, 'families', activeFamilyId, 'rewardRequests', requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    throw new Error('Reward request not found.')
  }

  const requestData = normalizeRewardRequest({ id: requestSnap.id, ...requestSnap.data() }, requestSnap.id)

  if (requestData.requestedBy !== userId) {
    throw new Error('You can only respond to your own reward request.')
  }

  if (requestData.requestKind !== 'proposal' || requestData.status !== 'countered') {
    throw new Error('This reward request is not waiting on your response.')
  }

  await updateDoc(requestRef, {
    status: 'pending',
    rewardTitle: requestData.counterRewardTitle || requestData.rewardTitle,
    cost: Number(requestData.counterCost) > 0 ? Number(requestData.counterCost) : requestData.cost,
    childRespondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function declineRewardRequestTerms(requestId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'kid') {
    throw new Error('Only kids can decline reward terms.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const requestRef = doc(db, 'families', activeFamilyId, 'rewardRequests', requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    throw new Error('Reward request not found.')
  }

  const requestData = normalizeRewardRequest({ id: requestSnap.id, ...requestSnap.data() }, requestSnap.id)

  if (requestData.requestedBy !== userId) {
    throw new Error('You can only respond to your own reward request.')
  }

  if (requestData.requestKind !== 'proposal' || requestData.status !== 'countered') {
    throw new Error('This reward request is not waiting on your response.')
  }

  await updateDoc(requestRef, {
    status: 'denied',
    childRespondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function getHouseholdOnboardingData(context = {}) {
  const { familyId: activeFamilyId, userRole, userId } = getActiveFamilyContext(
    context,
  )

  if (!hasFirebaseConfig || !db) {
    return {
      source: 'seed',
      data: {
        familyExists: false,
        family: null,
        childProfiles: [],
        jobs: [],
        rewards: [],
      },
      context: { familyId: activeFamilyId, userId, userRole },
    }
  }

  const familyRef = doc(db, 'families', activeFamilyId)
  const familySnap = await getDoc(familyRef)

  if (!familySnap.exists()) {
    return {
      source: 'firestore',
      data: {
        familyExists: false,
        family: null,
        childProfiles: [],
        jobs: [],
        rewards: [],
      },
      context: { familyId: activeFamilyId, userId, userRole },
    }
  }

  const childSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'children'),
  )
  const jobsSnapshot = await getDocs(collection(db, 'families', activeFamilyId, 'jobs'))
  const rewardsSnapshot = await getDocs(
    collection(db, 'families', activeFamilyId, 'rewards'),
  )

  const familyData = familySnap.data()

  return {
    source: 'firestore',
    data: {
      familyExists: true,
      family: {
        profileName: familyData.profileName || 'My Family',
        familyRules: familyData.familyRules || '',
        familyAnnouncement: familyData.familyAnnouncement || '',
        onboardingCompletedAt: serializeDateValue(familyData.onboardingCompletedAt),
        updatedAt: serializeDateValue(familyData.updatedAt),
        childSessionSecurityEnabled: Boolean(familyData.childSessionSecurityEnabled),
        creatorOwnerEmail: familyData.creatorOwnerEmail || '',
        creatorMetricsEnabled: Boolean(familyData.creatorMetricsEnabled),
        ...normalizeFamilyPricingSettings(familyData),
        ...normalizeFamilySavingsSettings(familyData),
        ...normalizeFamilyRewardSettings(familyData),
        ...normalizeFamilyJobConsequenceSettings(familyData),
        ...normalizeFamilyJobFlowSettings(familyData),
        ...normalizeFamilyJobStaleBonusSettings(familyData),
        ...normalizeFamilyDashboardSettings(familyData),
        ...normalizeFamilyRecognitionSettings(familyData),
        ...normalizeBadgeThresholdSettings(familyData),
      },
      childProfiles: childSnapshot.docs
        .map((item) => normalizeChildProfile({ id: item.id, ...item.data() }, item.id))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      jobs: jobsSnapshot.docs
        .map((item) => normalizeJob({ id: item.id, ...item.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
      rewards: rewardsSnapshot.docs
        .map((item) => normalizeReward({ id: item.id, ...item.data() }, item.id))
        .sort((a, b) => a.cost - b.cost),
    },
    context: { familyId: activeFamilyId, userId, userRole },
  }
}

export async function createHousehold(household, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can create a household.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const profileName = (household.profileName || '').trim()
  if (!profileName) {
    throw new Error('Household name is required.')
  }

  const familyRules = (household.familyRules || '').trim()
  const familyAnnouncement = (household.familyAnnouncement || '').trim()
  const familyRef = doc(db, 'families', activeFamilyId)
  const familySnap = await getDoc(familyRef)
  const familyDidNotExist = !familySnap.exists()
  const existingFamilyData = familySnap.exists() ? familySnap.data() : {}
  const familyFundEnabled = household.familyFundEnabled === undefined
    ? existingFamilyData.familyFundEnabled !== false
    : household.familyFundEnabled !== false
  const familyFundName = normalizeFamilyFundName(
    household.familyFundName === undefined
      ? existingFamilyData.familyFundName
      : household.familyFundName,
  )
  const familyFundBalance = Math.max(
    0,
    Number(
      household.familyFundBalance === undefined
        ? existingFamilyData.familyFundBalance
        : household.familyFundBalance,
    ) || 0,
  )
  const familyFundIncomeTaxEnabled = household.familyFundIncomeTaxEnabled === undefined
    ? Boolean(existingFamilyData.familyFundIncomeTaxEnabled)
    : Boolean(household.familyFundIncomeTaxEnabled)
  const familyFundIncomeTaxPercent = normalizeFundTaxPercent(
    household.familyFundIncomeTaxPercent === undefined
      ? existingFamilyData.familyFundIncomeTaxPercent
      : household.familyFundIncomeTaxPercent,
  )
  const familyFundSalesTaxEnabled = household.familyFundSalesTaxEnabled === undefined
    ? Boolean(existingFamilyData.familyFundSalesTaxEnabled)
    : Boolean(household.familyFundSalesTaxEnabled)
  const familyFundSalesTaxPercent = normalizeFundTaxPercent(
    household.familyFundSalesTaxPercent === undefined
      ? existingFamilyData.familyFundSalesTaxPercent
      : household.familyFundSalesTaxPercent,
  )
  const childSavingsAccountsEnabled = household.childSavingsAccountsEnabled === undefined
    ? Boolean(existingFamilyData.childSavingsAccountsEnabled)
    : Boolean(household.childSavingsAccountsEnabled)
  const childSavingsWithdrawalsEnabled = household.childSavingsWithdrawalsEnabled === undefined
    ? existingFamilyData.childSavingsWithdrawalsEnabled !== false
    : Boolean(household.childSavingsWithdrawalsEnabled)

  const contextEmail = String(context.userEmail || '').trim().toLowerCase()
  const existingCreatorOwnerEmail = String(existingFamilyData.creatorOwnerEmail || '')
    .trim()
    .toLowerCase()
  const creatorOwnerEmail =
    existingCreatorOwnerEmail
    || (contextEmail === CREATOR_OWNER_EMAIL ? CREATOR_OWNER_EMAIL : '')
  const creatorMetricsEnabled =
    Boolean(existingFamilyData.creatorMetricsEnabled)
    || creatorOwnerEmail === CREATOR_OWNER_EMAIL
  const customBadges = household.customBadges === undefined
    ? normalizeCustomBadges(existingFamilyData.customBadges)
    : normalizeCustomBadges(household.customBadges)

  await setDoc(
    familyRef,
    {
      profileName,
      familyRules,
      familyAnnouncement,
      familyFundEnabled,
      familyFundName,
      familyFundBalance,
      familyFundIncomeTaxEnabled,
      familyFundIncomeTaxPercent,
      familyFundSalesTaxEnabled,
      familyFundSalesTaxPercent,
      childSavingsAccountsEnabled,
      childSavingsWithdrawalsEnabled,
      childSessionSecurityEnabled: Boolean(household.childSessionSecurityEnabled),
      dynamicPricingEnabled: Boolean(household.dynamicPricingEnabled),
      dynamicPricingWindowPeriod: normalizePricingWindow(household.dynamicPricingWindowPeriod),
      dynamicPricingDemandWeight: Math.max(0, Number(household.dynamicPricingDemandWeight) || 0),
      dynamicPricingScarcityWeight: Math.max(0, Number(household.dynamicPricingScarcityWeight) || 0),
      dynamicPricingMinMultiplierPercent: Math.max(25, Number(household.dynamicPricingMinMultiplierPercent) || 100),
      dynamicPricingMaxMultiplierPercent: Math.max(
        Math.max(25, Number(household.dynamicPricingMinMultiplierPercent) || 100),
        Number(household.dynamicPricingMaxMultiplierPercent) || 220,
      ),
      dynamicPricingMaxStepPercent: Math.max(0, Number(household.dynamicPricingMaxStepPercent) || 60),
      savingsGoalApprovalMode: normalizeSavingsGoalApprovalMode(
        household.savingsGoalApprovalMode,
      ),
      rewardRequestApprovalMode: normalizeRewardRequestApprovalMode(
        household.rewardRequestApprovalMode,
      ),
      jobCheckApprovalMode: normalizeJobCheckApprovalMode(
        household.jobCheckApprovalMode,
      ),
      missedJobConsequenceEnabled: Boolean(household.missedJobConsequenceEnabled),
      missedJobPenaltyCredits: Math.max(0, Number(household.missedJobPenaltyCredits) || 0),
      missedJobTimingEnabled: Boolean(household.missedJobTimingEnabled),
      missedJobDefaultHours: Math.max(1, Number(household.missedJobDefaultHours) || 24),
      failedJobCheckConsequenceEnabled: Boolean(household.failedJobCheckConsequenceEnabled),
      failedJobCheckPenaltyCredits: Math.max(0, Number(household.failedJobCheckPenaltyCredits) || 0),
      maxActivePoolClaimsPerChild: Math.max(1, Number(household.maxActivePoolClaimsPerChild) || 1),
      allowClaimingWithPendingChecks: Boolean(household.allowClaimingWithPendingChecks),
      staleJobBonusEnabled: Boolean(household.staleJobBonusEnabled),
      staleJobBonusStartHours: Math.max(0, Number(household.staleJobBonusStartHours) || 24),
      staleJobBonusPeriodHours: Math.max(1, Number(household.staleJobBonusPeriodHours) || 24),
      staleJobBonusRatePercent: Math.max(0, Number(household.staleJobBonusRatePercent) || 5),
      staleJobBonusCapPercent: Math.max(0, Number(household.staleJobBonusCapPercent) || 30),
      familyDashboardTopCardsEnabled: household.familyDashboardTopCardsEnabled !== false,
      achievementsEnabled: household.achievementsEnabled !== false,
      familyRecognitionEnabled: household.familyRecognitionEnabled !== false,
      onboardingCompletedAt: household.onboardingCompleted
        ? serverTimestamp()
        : existingFamilyData.onboardingCompletedAt || null,
      customBadges,
      achievementFirstGoalTarget: Math.max(1, Number(household.achievementFirstGoalTarget) || 1),
      achievementContributorCreditsTarget: Math.max(1, Number(household.achievementContributorCreditsTarget) || 100),
      achievementHelperJobsTarget: Math.max(1, Number(household.achievementHelperJobsTarget) || 3),
      achievementReadingJobsTarget: Math.max(1, Number(household.achievementReadingJobsTarget) || 5),
      recognitionStreakDaysTarget: Math.max(1, Number(household.recognitionStreakDaysTarget) || 3),
      recognitionHelpingHandJobsTarget: Math.max(1, Number(household.recognitionHelpingHandJobsTarget) || 1),
      recognitionGoalGetterTarget: Math.max(1, Number(household.recognitionGoalGetterTarget) || 1),
      streakDays: 0,
      balance: { credits: 0 },
      level: { current: 1, xp: 0, nextXp: getNextXpThreshold(1) },
      creatorOwnerEmail: creatorOwnerEmail || null,
      creatorMetricsEnabled,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  if (familyDidNotExist) {
    trackAnalyticsEvent(
      'onboarding_started',
      {
        source: 'createHousehold',
        screen: 'onboarding',
      },
      { familyId: activeFamilyId, userId, userRole },
      {
        dedupe: true,
        dedupeKey: `onboarding_started:${activeFamilyId}`,
      },
    )

    trackAnalyticsEvent(
      'onboarding_household_created',
      {
        profileName,
        source: 'createHousehold',
        screen: 'onboarding',
      },
      { familyId: activeFamilyId, userId, userRole },
      {
        dedupe: true,
        dedupeKey: `onboarding_household_created:${activeFamilyId}`,
      },
    )
  }

  await maybeTrackOnboardingCompleted({ familyId: activeFamilyId, userId, userRole })
}

export async function createChildProfile(childProfile, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can add child profiles.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const displayName = (childProfile.displayName || '').trim()
  if (!displayName) {
    throw new Error('Child name is required.')
  }

  const avatar = (childProfile.avatar || '').trim() || '🧒'
  const weeklyGoalCredits = Number(childProfile.weeklyGoalCredits) || 0

  await addDoc(collection(db, 'families', activeFamilyId, 'children'), {
    displayName,
    avatar,
    weeklyGoalCredits,
    credits: 0,
    savingsBalance: 0,
    sessionCodeEnabled: false,
    sessionCode: '',
    allowChildSetSessionCode: false,
    createdBy: userId,
    createdAt: serverTimestamp(),
  })

  trackAnalyticsEvent(
    'onboarding_child_created',
    {
      childAvatar: avatar,
      source: 'createChildProfile',
      screen: 'onboarding',
    },
    { familyId: activeFamilyId, userId, userRole },
    {
      dedupe: true,
      dedupeKey: `onboarding_child_created:${activeFamilyId}:${displayName}`,
    },
  )

  await maybeTrackOnboardingCompleted({ familyId: activeFamilyId, userId, userRole })
}

export async function updateChildProfile(childId, childProfile, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update child profiles.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const displayName = (childProfile.displayName || '').trim()
  if (!displayName) {
    throw new Error('Child name is required.')
  }

  const avatar = (childProfile.avatar || '').trim() || '🧒'

  await updateDoc(doc(db, 'families', activeFamilyId, 'children', childId), {
    displayName,
    avatar,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteChildProfile(childId, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can remove child profiles.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  await deleteDoc(doc(db, 'families', activeFamilyId, 'children', childId))
}

export async function setChildSessionSecurity(enabled, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update child session security.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  await setDoc(
    doc(db, 'families', activeFamilyId),
    {
      childSessionSecurityEnabled: Boolean(enabled),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function setFamilyAnnouncement(announcement, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update family announcements.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  await setDoc(
    doc(db, 'families', activeFamilyId),
    {
      familyAnnouncement: String(announcement || '').trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function setChildAllowSessionCode(childId, allowed, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update child session code policy.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  await updateDoc(doc(db, 'families', activeFamilyId, 'children', childId), {
    allowChildSetSessionCode: Boolean(allowed),
    updatedAt: serverTimestamp(),
  })
}

export async function setChildSessionCode(childId, sessionCode, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update child session codes.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const trimmed = (sessionCode || '').trim()
  if (trimmed && !/^\d{4}$/.test(trimmed)) {
    throw new Error('Child session code must be exactly 4 digits.')
  }

  await updateDoc(doc(db, 'families', activeFamilyId, 'children', childId), {
    sessionCodeEnabled: Boolean(trimmed),
    sessionCode: trimmed,
    updatedAt: serverTimestamp(),
  })
}

export async function clearChildSessionCode(childId, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can clear child session codes.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  await updateDoc(doc(db, 'families', activeFamilyId, 'children', childId), {
    sessionCodeEnabled: false,
    sessionCode: '',
    updatedAt: serverTimestamp(),
  })
}

export async function createReward(rewardPayload, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent') {
    throw new Error('Only parents can create rewards.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const title = (rewardPayload.title || '').trim()
  if (!title) {
    throw new Error('Reward title is required.')
  }

  const cost = Number(rewardPayload.cost) || 0
  const claimLimitCount = Number(rewardPayload.claimLimitCount) || 0
  const claimLimitPeriod =
    rewardPayload.claimLimitPeriod === 'day' || rewardPayload.claimLimitPeriod === 'week'
      ? rewardPayload.claimLimitPeriod
      : null
  const familyClaimLimitCount = Number(rewardPayload.familyClaimLimitCount) || 0
  const familyClaimLimitPeriod =
    rewardPayload.familyClaimLimitPeriod === 'day' || rewardPayload.familyClaimLimitPeriod === 'week'
      ? rewardPayload.familyClaimLimitPeriod
      : null
  const repeatMode = rewardPayload.repeatMode === 'once' ? 'once' : 'recur'

  await addDoc(collection(db, 'families', activeFamilyId, 'rewards'), {
    title,
    cost,
    baseCost: cost,
    childId: rewardPayload.childId || null,
    repeatMode,
    claimLimitCount,
    claimLimitPeriod: claimLimitCount > 0 ? claimLimitPeriod || 'day' : null,
    familyClaimLimitCount,
    familyClaimLimitPeriod:
      familyClaimLimitCount > 0 ? familyClaimLimitPeriod || 'day' : null,
    requiresApproval:
      rewardPayload.requiresApproval === true ? true
      : rewardPayload.requiresApproval === false ? false
      : null,
    createdBy: userId,
    createdAt: serverTimestamp(),
  })

  trackAnalyticsEvent(
    'reward_created',
    {
      itemType: 'reward',
      title,
      cost,
      source: 'createReward',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId, userRole },
  )

  trackAnalyticsEvent(
    'onboarding_reward_created',
    {
      source: 'createReward',
      screen: 'onboarding',
      cost,
    },
    { familyId: activeFamilyId, userId, userRole },
    {
      dedupe: true,
      dedupeKey: `onboarding_reward_created:${activeFamilyId}:${title}`,
    },
  )

  await maybeTrackOnboardingCompleted({ familyId: activeFamilyId, userId, userRole })
}

export async function updateReward(rewardId, rewardPayload, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update rewards.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const title = (rewardPayload.title || '').trim()
  if (!title) {
    throw new Error('Reward title is required.')
  }

  const cost = Number(rewardPayload.cost) || 0
  const claimLimitCount = Number(rewardPayload.claimLimitCount) || 0
  const claimLimitPeriod =
    rewardPayload.claimLimitPeriod === 'day' || rewardPayload.claimLimitPeriod === 'week'
      ? rewardPayload.claimLimitPeriod
      : null
  const familyClaimLimitCount = Number(rewardPayload.familyClaimLimitCount) || 0
  const familyClaimLimitPeriod =
    rewardPayload.familyClaimLimitPeriod === 'day' || rewardPayload.familyClaimLimitPeriod === 'week'
      ? rewardPayload.familyClaimLimitPeriod
      : null
  const repeatMode = rewardPayload.repeatMode === 'once' ? 'once' : 'recur'

  await updateDoc(doc(db, 'families', activeFamilyId, 'rewards', rewardId), {
    title,
    cost,
    baseCost: cost,
    childId: rewardPayload.childId || null,
    repeatMode,
    claimLimitCount,
    claimLimitPeriod: claimLimitCount > 0 ? claimLimitPeriod || 'day' : null,
    familyClaimLimitCount,
    familyClaimLimitPeriod:
      familyClaimLimitCount > 0 ? familyClaimLimitPeriod || 'day' : null,
    requiresApproval:
      rewardPayload.requiresApproval === true ? true
      : rewardPayload.requiresApproval === false ? false
      : null,
    updatedAt: serverTimestamp(),
  })

  trackAnalyticsEvent(
    'reward_updated',
    {
      itemId: rewardId,
      itemType: 'reward',
      title,
      cost,
      source: 'updateReward',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId: null, userRole },
  )
}

export async function createGoal(goalPayload, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(
    context,
  )

  if (userRole !== 'parent' && userRole !== 'kid') {
    throw new Error('Only parents and kids can create savings goals.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }
  const name = (goalPayload.name || '').trim()
  if (!name) {
    throw new Error('Goal name is required.')
  }

  const target = Number(goalPayload.target)
  if (!Number.isFinite(target) || target <= 0) {
    throw new Error('Goal target must be greater than zero.')
  }

  const childId = goalPayload.childId || null

  if (userRole === 'kid' && !childId) {
    throw new Error('Child savings goal requests must be tied to a child profile.')
  }

  if (userRole === 'kid' && childId !== userId) {
    throw new Error('Kids can only request savings goals for themselves.')
  }

  if (childId) {
    const existingChildGoalQuery = query(
      collection(db, 'families', activeFamilyId, 'goals'),
      where('childId', '==', childId),
    )
    const existingChildGoalSnap = await getDocs(existingChildGoalQuery)
    const hasActiveGoal = existingChildGoalSnap.docs
      .map((item) => normalizeGoal({ id: item.id, ...item.data() }, item.id))
      .some((goal) => goal.status !== 'completed' && goal.status !== 'denied')

    if (hasActiveGoal) {
      throw new Error('Only one savings goal can be active at a time for this child.')
    }
  }

  const familySnap = await getDoc(doc(db, 'families', activeFamilyId))
  const savingsSettings = normalizeFamilySavingsSettings(familySnap.data() || {})
  const requiresCreateApproval =
    userRole === 'kid' && savingsSettings.savingsGoalApprovalMode === 'create_and_claim'

  const saved = Number(goalPayload.saved) || 0
  const status = requiresCreateApproval
    ? 'pending_parent_approval'
    : (saved >= target ? 'ready_to_claim' : 'active')

  await addDoc(collection(db, 'families', activeFamilyId, 'goals'), {
    name,
    childId,
    target,
    saved,
    status,
    requestedBy: requiresCreateApproval ? userId : null,
    requestedAt: requiresCreateApproval ? serverTimestamp() : null,
    parentReviewedBy: null,
    parentReviewedAt: null,
    readyToClaimAt: status === 'ready_to_claim' ? serverTimestamp() : null,
    negotiationHistory:
      requiresCreateApproval
        ? [
          {
            type: 'requested',
            target,
            by: userId,
            note: '',
            at: serverTimestamp(),
          },
        ]
        : [],
      contributionHistory: [],
    createdBy: userId,
    createdAt: serverTimestamp(),
  })

  trackAnalyticsEvent(
    'goal_created',
    {
      itemType: 'goal',
      name,
      target,
      childId,
      source: 'createGoal',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId, userRole },
  )

  await maybeTrackOnboardingCompleted({ familyId: activeFamilyId, userId, userRole })
}

export async function dismissRewardNotification(requestId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can dismiss reward notifications.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const requestRef = doc(db, 'families', activeFamilyId, 'rewardRequests', requestId)
  const requestSnap = await getDoc(requestRef)

  if (!requestSnap.exists()) {
    throw new Error('Reward request not found.')
  }

  const requestData = normalizeRewardRequest({ id: requestSnap.id, ...requestSnap.data() }, requestSnap.id)

  if (!requestData.autoApproved || requestData.requestKind !== 'purchase' || requestData.status !== 'approved') {
    throw new Error('Only auto-approved reward notifications can be dismissed.')
  }

  await updateDoc(requestRef, {
    notificationDismissedAt: serverTimestamp(),
    notificationDismissedBy: userId,
    updatedAt: serverTimestamp(),
  })
}

export async function dismissAllRewardNotifications(context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can dismiss reward notifications.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const snapshot = await getDocs(collection(db, 'families', activeFamilyId, 'rewardRequests'))
  const activeNotifications = snapshot.docs
    .map((item) => normalizeRewardRequest({ id: item.id, ...item.data() }, item.id))
    .filter((request) =>
      request.autoApproved
      && request.requestKind === 'purchase'
      && request.status === 'approved'
      && !request.notificationDismissedAt,
    )

  await Promise.all(
    activeNotifications.map((request) =>
      updateDoc(doc(db, 'families', activeFamilyId, 'rewardRequests', request.id), {
        notificationDismissedAt: serverTimestamp(),
        notificationDismissedBy: userId,
        updatedAt: serverTimestamp(),
      })),
  )
}

export async function updateGoal(goalId, goalPayload, context = {}) {
  const { familyId: activeFamilyId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can update savings goals.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const name = (goalPayload.name || '').trim()
  if (!name) {
    throw new Error('Goal name is required.')
  }

  const target = Number(goalPayload.target)
  if (!Number.isFinite(target) || target <= 0) {
    throw new Error('Goal target must be greater than zero.')
  }

  const childId = goalPayload.childId || null

  const goalRef = doc(db, 'families', activeFamilyId, 'goals', goalId)
  const familyRef = doc(db, 'families', activeFamilyId)
  const goalSnap = await getDoc(goalRef)

  if (!goalSnap.exists()) {
    throw new Error('Savings goal not found.')
  }

  const familySnap = await getDoc(familyRef)
  const familyFundBalance = Math.max(0, Number(familySnap.data()?.familyFundBalance) || 0)
  const currentGoal = normalizeGoal(
    { id: goalSnap.id, ...goalSnap.data() },
    goalSnap.id,
    { familyFundBalance },
  )

  if (currentGoal.status === 'completed') {
    throw new Error('Completed savings goals cannot be edited.')
  }

  if (childId) {
    const existingChildGoalQuery = query(
      collection(db, 'families', activeFamilyId, 'goals'),
      where('childId', '==', childId),
    )
    const existingChildGoalSnap = await getDocs(existingChildGoalQuery)
    const conflict = existingChildGoalSnap.docs
      .map((item) => normalizeGoal({ id: item.id, ...item.data() }, item.id))
      .some((goal) => goal.id !== goalId && goal.status !== 'completed' && goal.status !== 'denied')

    if (conflict) {
      throw new Error('Only one savings goal can be active at a time for this child.')
    }
  }

  const nextStatus = Number(currentGoal.saved) >= target ? 'ready_to_claim' : 'active'

  await updateDoc(goalRef, {
    name,
    target,
    childId,
    status: nextStatus,
    readyToClaimAt:
      nextStatus === 'ready_to_claim'
        ? (currentGoal.readyToClaimAt || serverTimestamp())
        : null,
    approvedAt: null,
    approvedBy: null,
    updatedAt: serverTimestamp(),
  })

  trackAnalyticsEvent(
    'goal_updated',
    {
      itemId: goalId,
      itemType: 'goal',
      name,
      target,
      childId,
      source: 'updateGoal',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userRole },
  )
}

export async function contributeToSavingsGoal(goalId, amountValue, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent' && userRole !== 'kid') {
    throw new Error('Only family members can contribute to savings goals.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const amount = Number(amountValue)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Contribution amount must be greater than zero.')
  }

  const goalRef = doc(db, 'families', activeFamilyId, 'goals', goalId)
  const familyRef = doc(db, 'families', activeFamilyId)

  const result = await runTransaction(db, async (transaction) => {
    const goalSnap = await transaction.get(goalRef)

    if (!goalSnap.exists()) {
      throw new Error('Savings goal not found.')
    }

    const familySnap = await transaction.get(familyRef)
    if (!familySnap.exists()) {
      throw new Error('Family settings not found.')
    }

    const familyData = familySnap.data() || {}
    const familyFundEnabled = familyData.familyFundEnabled !== false
    const familyFundName = normalizeFamilyFundName(familyData.familyFundName)
    const familyFundBalance = Math.max(0, Number(familyData.familyFundBalance) || 0)
    const familyFundContributionHistory = normalizeFamilyFundContributionHistory(
      familyData.familyFundContributionHistory,
    )
    const goalData = normalizeGoal(
      { id: goalSnap.id, ...goalSnap.data() },
      goalSnap.id,
      { familyFundBalance, familyFundContributionHistory },
    )
    const isFamilyGoal = !goalData.childId

    const contributorChildId = goalData.childId || context.selectedChildId || (userRole === 'kid' ? userId : null)

    if (!contributorChildId) {
      throw new Error('This savings goal is not tied to a child profile.')
    }

    if (goalData.status === 'completed') {
      throw new Error('This savings goal is already completed.')
    }

    if (goalData.status === 'pending_parent_approval' || goalData.status === 'countered') {
      throw new Error('This savings goal is waiting on parent review.')
    }

    if (goalData.status === 'denied') {
      throw new Error('This savings goal request was denied. Create a new goal request first.')
    }

    if (userRole === 'kid' && goalData.childId && goalData.childId !== contributorChildId) {
      throw new Error('You can only contribute to your own savings goal.')
    }

    const childRef = doc(db, 'families', activeFamilyId, 'children', contributorChildId)
    const childSnap = await transaction.get(childRef)

    if (!childSnap.exists()) {
      throw new Error('Child profile not found.')
    }

    const currentCredits = Number(childSnap.data()?.credits) || 0
    if (currentCredits < amount) {
      throw new Error('Not enough credits to make that contribution.')
    }

    if (isFamilyGoal && !familyFundEnabled) {
      throw new Error(`${familyFundName} is turned off. Ask a parent to enable it first.`)
    }

    const currentSaved = Number(goalData.saved) || 0
    const target = Number(goalData.target) || 0

    if (target > 0 && currentSaved >= target) {
      throw new Error('This goal already reached its target and is waiting on parent approval.')
    }

    const remaining = Math.max(0, target - currentSaved)
    if (target > 0 && amount > remaining) {
      throw new Error(`You can only contribute up to ${remaining} credits right now.`)
    }

    const completesGoal = target > 0 && currentSaved < target && (currentSaved + amount) >= target
    const nextCredits = currentCredits - amount
    const nextSaved = currentSaved + amount
    const nextStatus = completesGoal ? 'ready_to_claim' : 'active'
    const contributionHistory = Array.isArray(goalSnap.data().contributionHistory)
      ? goalSnap.data().contributionHistory
      : []
    const contributorEntry = {
      id: `${contributorChildId}:${Date.now()}`,
      childId: contributorChildId,
      amount,
      source: isFamilyGoal ? 'family_goal' : 'savings_goal',
      createdAt: Date.now(),
    }

    transaction.update(childRef, {
      credits: nextCredits,
      updatedAt: serverTimestamp(),
    })

    if (isFamilyGoal) {
      transaction.update(familyRef, {
        familyFundBalance: nextSaved,
        familyFundContributionHistory: [
          ...familyFundContributionHistory,
          contributorEntry,
        ].slice(-250),
        updatedAt: serverTimestamp(),
      })
    }

    transaction.update(goalRef, {
      saved: nextSaved,
      status: nextStatus,
      readyToClaimAt:
        completesGoal ? (goalSnap.data().readyToClaimAt || serverTimestamp()) : null,
      completedAt: null,
      approvedAt: null,
      approvedBy: null,
      ...(isFamilyGoal
        ? {}
        : { contributionHistory: [...contributionHistory, contributorEntry] }),
      updatedAt: serverTimestamp(),
    })

    return {
      childId: contributorChildId,
      credits: nextCredits,
      saved: nextSaved,
      completesGoal,
      status: nextStatus,
    }
  })

  trackAnalyticsEvent(
    'savings_contributed',
    {
      itemId: goalId,
      itemType: 'goal',
      amount,
      childId: result.childId,
      source: 'contributeToSavingsGoal',
      screen: 'kid',
    },
    { familyId: activeFamilyId, userId, userRole },
  )

  return result
}

export async function contributeToFamilyFund(amountValue, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent' && userRole !== 'kid') {
    throw new Error('Only family members can contribute to the family fund.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const amount = Number(amountValue)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Contribution amount must be greater than zero.')
  }

  const familyRef = doc(db, 'families', activeFamilyId)

  const result = await runTransaction(db, async (transaction) => {
    const familySnap = await transaction.get(familyRef)
    if (!familySnap.exists()) {
      throw new Error('Family settings not found.')
    }

    const familySettings = normalizeFamilySavingsSettings(familySnap.data() || {})
    if (!familySettings.familyFundEnabled) {
      throw new Error(`${familySettings.familyFundName} is turned off. Ask a parent to enable it first.`)
    }

    const contributorChildId = context.selectedChildId || (userRole === 'kid' ? userId : null)
    if (!contributorChildId) {
      throw new Error('Select a child profile before contributing to the family fund.')
    }

    const childRef = doc(db, 'families', activeFamilyId, 'children', contributorChildId)
    const childSnap = await transaction.get(childRef)
    if (!childSnap.exists()) {
      throw new Error('Child profile not found.')
    }

    const currentCredits = Number(childSnap.data()?.credits) || 0
    if (currentCredits < amount) {
      throw new Error('Not enough credits to make that contribution.')
    }

    const nextCredits = currentCredits - amount
    const nextFundBalance = Math.max(0, Number(familySettings.familyFundBalance) || 0) + amount
    const contributorEntry = {
      id: `${contributorChildId}:${Date.now()}`,
      childId: contributorChildId,
      amount,
      source: 'family_fund',
      createdAt: Date.now(),
    }

    transaction.update(childRef, {
      credits: nextCredits,
      updatedAt: serverTimestamp(),
    })

    transaction.update(familyRef, {
      familyFundBalance: nextFundBalance,
      familyFundContributionHistory: [
        ...familySettings.familyFundContributionHistory,
        contributorEntry,
      ].slice(-250),
      updatedAt: serverTimestamp(),
    })

    return {
      contributorChildId,
      nextCredits,
      nextFundBalance,
    }
  })

  trackAnalyticsEvent(
    'family_fund_contributed',
    {
      amount,
      childId: result.contributorChildId,
      source: 'contributeToFamilyFund',
      screen: userRole === 'kid' ? 'kid' : 'parent',
    },
    { familyId: activeFamilyId, userId, userRole },
  )

  return result
}

function resolveSavingsAccountChildId(context, userRole) {
  const childId = context.selectedChildId || (userRole === 'kid' ? context.userId : null)
  if (!childId) {
    throw new Error('Select a child profile before using a savings account.')
  }
  return childId
}

function assertChildSavingsAccountsEnabled(familyData) {
  const savingsSettings = normalizeFamilySavingsSettings(familyData || {})
  if (!savingsSettings.childSavingsAccountsEnabled) {
    throw new Error('Savings accounts are turned off right now. Ask a parent to enable them first.')
  }
  return savingsSettings
}

export async function moveWalletCreditsToSavingsAccount(amountValue, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent' && userRole !== 'kid') {
    throw new Error('Only family members can use savings accounts.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const amount = Number(amountValue)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Savings transfer amount must be greater than zero.')
  }

  const childId = resolveSavingsAccountChildId({ ...context, userId }, userRole)
  const familyRef = doc(db, 'families', activeFamilyId)
  const childRef = doc(db, 'families', activeFamilyId, 'children', childId)

  const result = await runTransaction(db, async (transaction) => {
    const familySnap = await transaction.get(familyRef)
    if (!familySnap.exists()) {
      throw new Error('Family settings not found.')
    }
    assertChildSavingsAccountsEnabled(familySnap.data())

    const childSnap = await transaction.get(childRef)
    if (!childSnap.exists()) {
      throw new Error('Child profile not found.')
    }

    const currentCredits = Number(childSnap.data()?.credits) || 0
    const currentSavings = Math.max(0, Number(childSnap.data()?.savingsBalance) || 0)
    if (currentCredits < amount) {
      throw new Error('Not enough wallet credits to move into savings.')
    }

    const nextCredits = currentCredits - amount
    const nextSavings = currentSavings + amount

    transaction.update(childRef, {
      credits: nextCredits,
      savingsBalance: nextSavings,
      updatedAt: serverTimestamp(),
    })

    return { childId, credits: nextCredits, savingsBalance: nextSavings }
  })

  trackAnalyticsEvent(
    'savings_account_deposit',
    {
      amount,
      childId,
      source: 'moveWalletCreditsToSavingsAccount',
      screen: userRole === 'kid' ? 'kid' : 'parent',
    },
    { familyId: activeFamilyId, userId, userRole, childId },
  )

  return result
}

export async function moveSavingsAccountToWallet(amountValue, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent' && userRole !== 'kid') {
    throw new Error('Only family members can use savings accounts.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const amount = Number(amountValue)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Withdrawal amount must be greater than zero.')
  }

  const childId = resolveSavingsAccountChildId({ ...context, userId }, userRole)
  const familyRef = doc(db, 'families', activeFamilyId)
  const childRef = doc(db, 'families', activeFamilyId, 'children', childId)

  const result = await runTransaction(db, async (transaction) => {
    const familySnap = await transaction.get(familyRef)
    if (!familySnap.exists()) {
      throw new Error('Family settings not found.')
    }
    const savingsSettings = assertChildSavingsAccountsEnabled(familySnap.data())
    if (!savingsSettings.childSavingsWithdrawalsEnabled) {
      throw new Error('Moving savings back to wallet is turned off right now.')
    }

    const childSnap = await transaction.get(childRef)
    if (!childSnap.exists()) {
      throw new Error('Child profile not found.')
    }

    const currentCredits = Number(childSnap.data()?.credits) || 0
    const currentSavings = Math.max(0, Number(childSnap.data()?.savingsBalance) || 0)
    if (currentSavings < amount) {
      throw new Error('Not enough savings to move back to wallet.')
    }

    const nextCredits = currentCredits + amount
    const nextSavings = currentSavings - amount

    transaction.update(childRef, {
      credits: nextCredits,
      savingsBalance: nextSavings,
      updatedAt: serverTimestamp(),
    })

    return { childId, credits: nextCredits, savingsBalance: nextSavings }
  })

  trackAnalyticsEvent(
    'savings_account_withdrawal',
    {
      amount,
      childId,
      source: 'moveSavingsAccountToWallet',
      screen: userRole === 'kid' ? 'kid' : 'parent',
    },
    { familyId: activeFamilyId, userId, userRole, childId },
  )

  return result
}

export async function contributeSavingsAccountToSavingsGoal(goalId, amountValue, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent' && userRole !== 'kid') {
    throw new Error('Only family members can contribute savings.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const amount = Number(amountValue)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Contribution amount must be greater than zero.')
  }

  const goalRef = doc(db, 'families', activeFamilyId, 'goals', goalId)
  const familyRef = doc(db, 'families', activeFamilyId)

  const result = await runTransaction(db, async (transaction) => {
    const goalSnap = await transaction.get(goalRef)
    if (!goalSnap.exists()) {
      throw new Error('Savings goal not found.')
    }

    const familySnap = await transaction.get(familyRef)
    if (!familySnap.exists()) {
      throw new Error('Family settings not found.')
    }

    const familyData = familySnap.data() || {}
    const savingsSettings = assertChildSavingsAccountsEnabled(familyData)
    const familyFundBalance = Math.max(0, Number(savingsSettings.familyFundBalance) || 0)
    const familyFundContributionHistory = normalizeFamilyFundContributionHistory(
      familyData.familyFundContributionHistory,
    )
    const goalData = normalizeGoal(
      { id: goalSnap.id, ...goalSnap.data() },
      goalSnap.id,
      { familyFundBalance, familyFundContributionHistory },
    )
    const isFamilyGoal = !goalData.childId
    const contributorChildId = goalData.childId || context.selectedChildId || (userRole === 'kid' ? userId : null)

    if (!contributorChildId) {
      throw new Error('Select a child profile before contributing savings.')
    }

    if (userRole === 'kid' && goalData.childId && goalData.childId !== contributorChildId) {
      throw new Error('You can only contribute to your own savings goal.')
    }

    if (isFamilyGoal && !savingsSettings.familyFundEnabled) {
      throw new Error(`${savingsSettings.familyFundName} is turned off. Ask a parent to enable it first.`)
    }

    if (goalData.status === 'completed') {
      throw new Error('This savings goal is already completed.')
    }

    if (goalData.status === 'pending_parent_approval' || goalData.status === 'countered') {
      throw new Error('This savings goal is waiting on parent review.')
    }

    if (goalData.status === 'denied') {
      throw new Error('This savings goal request was denied. Create a new goal request first.')
    }

    const childRef = doc(db, 'families', activeFamilyId, 'children', contributorChildId)
    const childSnap = await transaction.get(childRef)
    if (!childSnap.exists()) {
      throw new Error('Child profile not found.')
    }

    const currentSavings = Math.max(0, Number(childSnap.data()?.savingsBalance) || 0)
    if (currentSavings < amount) {
      throw new Error('Not enough savings to make that contribution.')
    }

    const currentSaved = Number(goalData.saved) || 0
    const target = Number(goalData.target) || 0
    if (target > 0 && currentSaved >= target) {
      throw new Error('This goal already reached its target and is waiting on parent approval.')
    }

    const remaining = Math.max(0, target - currentSaved)
    if (target > 0 && amount > remaining) {
      throw new Error(`You can only contribute up to ${remaining} credits right now.`)
    }

    const completesGoal = target > 0 && currentSaved < target && (currentSaved + amount) >= target
    const nextSavings = currentSavings - amount
    const nextSaved = currentSaved + amount
    const nextStatus = completesGoal ? 'ready_to_claim' : 'active'
    const contributionHistory = Array.isArray(goalSnap.data().contributionHistory)
      ? goalSnap.data().contributionHistory
      : []
    const contributorEntry = {
      id: `${contributorChildId}:${Date.now()}`,
      childId: contributorChildId,
      amount,
      source: isFamilyGoal ? 'savings_account_family_goal' : 'savings_account_goal',
      createdAt: Date.now(),
    }

    transaction.update(childRef, {
      savingsBalance: nextSavings,
      updatedAt: serverTimestamp(),
    })

    if (isFamilyGoal) {
      transaction.update(familyRef, {
        familyFundBalance: nextSaved,
        familyFundContributionHistory: [
          ...familyFundContributionHistory,
          contributorEntry,
        ].slice(-250),
        updatedAt: serverTimestamp(),
      })
    }

    transaction.update(goalRef, {
      saved: nextSaved,
      status: nextStatus,
      readyToClaimAt:
        completesGoal ? (goalSnap.data().readyToClaimAt || serverTimestamp()) : null,
      completedAt: null,
      approvedAt: null,
      approvedBy: null,
      ...(isFamilyGoal
        ? {}
        : { contributionHistory: [...contributionHistory, contributorEntry] }),
      updatedAt: serverTimestamp(),
    })

    return {
      childId: contributorChildId,
      savingsBalance: nextSavings,
      saved: nextSaved,
      completesGoal,
      status: nextStatus,
    }
  })

  trackAnalyticsEvent(
    'savings_account_goal_contributed',
    {
      itemId: goalId,
      itemType: 'goal',
      amount,
      childId: result.childId,
      source: 'contributeSavingsAccountToSavingsGoal',
      screen: userRole === 'kid' ? 'kid' : 'parent',
    },
    { familyId: activeFamilyId, userId, userRole, childId: result.childId },
  )

  return result
}

export async function contributeSavingsAccountToFamilyFund(amountValue, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent' && userRole !== 'kid') {
    throw new Error('Only family members can contribute savings.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const amount = Number(amountValue)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Contribution amount must be greater than zero.')
  }

  const childId = resolveSavingsAccountChildId({ ...context, userId }, userRole)
  const familyRef = doc(db, 'families', activeFamilyId)
  const childRef = doc(db, 'families', activeFamilyId, 'children', childId)

  const result = await runTransaction(db, async (transaction) => {
    const familySnap = await transaction.get(familyRef)
    if (!familySnap.exists()) {
      throw new Error('Family settings not found.')
    }
    const savingsSettings = assertChildSavingsAccountsEnabled(familySnap.data())
    if (!savingsSettings.familyFundEnabled) {
      throw new Error(`${savingsSettings.familyFundName} is turned off. Ask a parent to enable it first.`)
    }

    const childSnap = await transaction.get(childRef)
    if (!childSnap.exists()) {
      throw new Error('Child profile not found.')
    }

    const currentSavings = Math.max(0, Number(childSnap.data()?.savingsBalance) || 0)
    if (currentSavings < amount) {
      throw new Error('Not enough savings to contribute to the family fund.')
    }

    const nextSavings = currentSavings - amount
    const nextFundBalance = Math.max(0, Number(savingsSettings.familyFundBalance) || 0) + amount
    const contributorEntry = {
      id: `${childId}:${Date.now()}`,
      childId,
      amount,
      source: 'savings_account_family_fund',
      createdAt: Date.now(),
    }

    transaction.update(childRef, {
      savingsBalance: nextSavings,
      updatedAt: serverTimestamp(),
    })

    transaction.update(familyRef, {
      familyFundBalance: nextFundBalance,
      familyFundContributionHistory: [
        ...savingsSettings.familyFundContributionHistory,
        contributorEntry,
      ].slice(-250),
      updatedAt: serverTimestamp(),
    })

    return { childId, savingsBalance: nextSavings, nextFundBalance }
  })

  trackAnalyticsEvent(
    'savings_account_family_fund_contributed',
    {
      amount,
      childId,
      source: 'contributeSavingsAccountToFamilyFund',
      screen: userRole === 'kid' ? 'kid' : 'parent',
    },
    { familyId: activeFamilyId, userId, userRole, childId },
  )

  return result
}

export async function approveSavingsGoalCompletion(goalId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can approve completed savings goals.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const goalRef = doc(db, 'families', activeFamilyId, 'goals', goalId)
  const familyRef = doc(db, 'families', activeFamilyId)

  const result = await runTransaction(db, async (transaction) => {
    const goalSnap = await transaction.get(goalRef)

    if (!goalSnap.exists()) {
      throw new Error('Savings goal not found.')
    }

    const familySnap = await transaction.get(familyRef)
    if (!familySnap.exists()) {
      throw new Error('Family settings not found.')
    }

    const familyData = familySnap.data() || {}
    const familyFundBalance = Math.max(0, Number(familyData.familyFundBalance) || 0)
    const goalData = normalizeGoal(
      { id: goalSnap.id, ...goalSnap.data() },
      goalSnap.id,
      { familyFundBalance },
    )
    const isFamilyGoal = !goalData.childId

    if (goalData.status === 'completed') {
      throw new Error('This savings goal is already approved.')
    }

      if (goalData.status === 'pending_parent_approval') {
        throw new Error('This savings goal is still waiting for initial parent approval.')
      }

    if (goalData.status !== 'ready_to_claim') {
      throw new Error('This savings goal is not ready for parent approval yet.')
    }

    if (Number(goalData.saved) < Number(goalData.target)) {
      throw new Error('This savings goal has not reached its target yet.')
    }

    if (isFamilyGoal) {
      const nextFamilyFundBalance = Math.max(0, familyFundBalance - Number(goalData.target || 0))

      transaction.update(familyRef, {
        familyFundBalance: nextFamilyFundBalance,
        updatedAt: serverTimestamp(),
      })
    }

    transaction.update(goalRef, {
      status: 'completed',
      saved: Number(goalData.target) || 0,
      completedAt: serverTimestamp(),
      approvedAt: serverTimestamp(),
      approvedBy: userId,
      updatedAt: serverTimestamp(),
    })

    return {
      id: goalData.id,
      childId: goalData.childId,
      name: goalData.name,
      target: goalData.target,
      saved: goalData.saved,
    }
  })

  await awardFamilyXp(activeFamilyId, SAVINGS_GOAL_COMPLETION_XP)

  trackAnalyticsEvent(
    'savings_goal_approved',
    {
      itemId: result.id,
      itemType: 'goal',
      childId: result.childId,
      name: result.name,
      target: result.target,
      saved: result.saved,
      source: 'approveSavingsGoalCompletion',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId, userRole },
  )

  return result
}

export async function cancelSavingsGoal(goalId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent' && userRole !== 'kid') {
    throw new Error('Only family members can cancel a savings goal.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const goalRef = doc(db, 'families', activeFamilyId, 'goals', goalId)

  const refundedAmount = await runTransaction(db, async (transaction) => {
    const goalSnap = await transaction.get(goalRef)

    if (!goalSnap.exists()) {
      throw new Error('Savings goal not found.')
    }

    const goalData = normalizeGoal({ id: goalSnap.id, ...goalSnap.data() }, goalSnap.id)

    if (goalData.status === 'completed') {
      throw new Error('A completed savings goal cannot be cancelled.')
    }

    if (userRole === 'kid' && goalData.childId !== userId) {
      throw new Error('You can only cancel your own savings goal.')
    }

    const savedCredits = Number(goalData.saved) || 0

    if (savedCredits > 0 && goalData.childId) {
      const childRef = doc(db, 'families', activeFamilyId, 'children', goalData.childId)
      const childSnap = await transaction.get(childRef)

      if (!childSnap.exists()) {
        throw new Error('Child profile not found.')
      }

      const currentCredits = Number(childSnap.data()?.credits) || 0

      transaction.update(childRef, {
        credits: currentCredits + savedCredits,
        updatedAt: serverTimestamp(),
      })
    }

    transaction.delete(goalRef)

    return savedCredits
  })

  trackAnalyticsEvent(
    'savings_goal_cancelled',
    {
      itemId: goalId,
      itemType: 'goal',
      refundedCredits: refundedAmount,
      source: 'cancelSavingsGoal',
      screen: userRole === 'parent' ? 'parent' : 'kid',
    },
    { familyId: activeFamilyId, userId, userRole },
  )

  return { refundedCredits: refundedAmount }
}

export async function reviewSavingsGoalRequest(goalId, decision, context = {}, options = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can review savings goal requests.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  if (decision !== 'approved' && decision !== 'denied' && decision !== 'countered') {
    throw new Error('Decision must be approved, denied, or countered.')
  }

  const counterTargetRaw = Number(options.counterTarget)
  const counterTarget = Number.isFinite(counterTargetRaw) ? counterTargetRaw : 0
  const counterNote = (options.counterNote || '').trim()

  const goalRef = doc(db, 'families', activeFamilyId, 'goals', goalId)

  const result = await runTransaction(db, async (transaction) => {
    const goalSnap = await transaction.get(goalRef)

    if (!goalSnap.exists()) {
      throw new Error('Savings goal request not found.')
    }

    const goalData = normalizeGoal({ id: goalSnap.id, ...goalSnap.data() }, goalSnap.id)

    if (goalData.status !== 'pending_parent_approval') {
      throw new Error('This savings goal request has already been reviewed.')
    }

    if (!goalData.childId) {
      throw new Error('Savings goal request must be tied to a child profile.')
    }

    if (decision === 'approved') {
      const siblingQuery = query(
        collection(db, 'families', activeFamilyId, 'goals'),
        where('childId', '==', goalData.childId),
      )
      const siblingSnap = await getDocs(siblingQuery)
      const hasActiveGoal = siblingSnap.docs
        .filter((item) => item.id !== goalId)
        .map((item) => normalizeGoal({ id: item.id, ...item.data() }, item.id))
        .some((goal) => goal.status !== 'completed' && goal.status !== 'denied')

      if (hasActiveGoal) {
        throw new Error('This child already has an active savings goal.')
      }
    }

    if (decision === 'countered') {
      if (!Number.isFinite(counterTarget) || counterTarget <= 0) {
        throw new Error('Counter target must be greater than zero.')
      }

      if (counterTarget === Number(goalData.target)) {
        throw new Error('Counter target should be different from the requested target.')
      }
    }

    const nextStatus =
      decision === 'approved'
        ? 'active'
        : decision === 'countered'
          ? 'countered'
          : 'denied'

    const historyEvent =
      decision === 'approved'
        ? {
          type: 'request_approved',
          target: Number(goalData.target) || 0,
          by: userId,
          note: '',
          at: serverTimestamp(),
        }
        : decision === 'countered'
          ? {
            type: 'countered',
            target: counterTarget,
            by: userId,
            note: counterNote,
            at: serverTimestamp(),
          }
          : {
            type: 'request_denied',
            target: Number(goalData.target) || 0,
            by: userId,
            note: '',
            at: serverTimestamp(),
          }

    transaction.update(goalRef, {
      status: nextStatus,
      parentReviewedBy: userId,
      parentReviewedAt: serverTimestamp(),
      counterTarget: decision === 'countered' ? counterTarget : null,
      counterNote: decision === 'countered' ? counterNote : '',
      counteredAt: decision === 'countered' ? serverTimestamp() : null,
      counteredBy: decision === 'countered' ? userId : null,
      readyToClaimAt: null,
      approvedAt: null,
      approvedBy: null,
      negotiationHistory: [...(goalData.negotiationHistory || []), historyEvent],
      updatedAt: serverTimestamp(),
    })

    return {
      id: goalData.id,
      childId: goalData.childId,
      name: goalData.name,
      target: goalData.target,
      decision,
      counterTarget: decision === 'countered' ? counterTarget : null,
    }
  })

  trackAnalyticsEvent(
    'savings_goal_request_reviewed',
    {
      itemId: result.id,
      itemType: 'goal',
      childId: result.childId,
      name: result.name,
      target: result.target,
      decision: result.decision,
      counterTarget: result.counterTarget,
      source: 'reviewSavingsGoalRequest',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId, userRole },
  )

  return result
}

export async function acceptSavingsGoalCounter(goalId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'kid') {
    throw new Error('Only kids can accept savings counter offers.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const goalRef = doc(db, 'families', activeFamilyId, 'goals', goalId)

  const result = await runTransaction(db, async (transaction) => {
    const goalSnap = await transaction.get(goalRef)

    if (!goalSnap.exists()) {
      throw new Error('Savings goal not found.')
    }

    const goalData = normalizeGoal({ id: goalSnap.id, ...goalSnap.data() }, goalSnap.id)

    if (goalData.childId !== userId) {
      throw new Error('You can only accept a counter offer for your own goal.')
    }

    if (goalData.status !== 'countered') {
      throw new Error('This savings goal does not have an active counter offer.')
    }

    const nextTarget = Number(goalData.counterTarget) || 0
    if (nextTarget <= 0) {
      throw new Error('Counter offer is missing a valid target.')
    }

    const nextStatus = Number(goalData.saved) >= nextTarget ? 'ready_to_claim' : 'active'

    transaction.update(goalRef, {
      target: nextTarget,
      status: nextStatus,
      counterTarget: null,
      counterNote: '',
      counteredAt: null,
      counteredBy: null,
      negotiationHistory: [
        ...(goalData.negotiationHistory || []),
        {
          type: 'counter_accepted',
          target: nextTarget,
          by: userId,
          note: '',
          at: serverTimestamp(),
        },
      ],
      readyToClaimAt: nextStatus === 'ready_to_claim' ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    })

    return {
      id: goalData.id,
      childId: goalData.childId,
      name: goalData.name,
      target: nextTarget,
      status: nextStatus,
    }
  })

  trackAnalyticsEvent(
    'savings_goal_counter_accepted',
    {
      itemId: result.id,
      itemType: 'goal',
      childId: result.childId,
      name: result.name,
      target: result.target,
      source: 'acceptSavingsGoalCounter',
      screen: 'kid',
    },
    { familyId: activeFamilyId, userId, userRole },
  )

  return result
}

export async function declineSavingsGoalCounter(goalId, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'kid') {
    throw new Error('Only kids can decline savings counter offers.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const goalRef = doc(db, 'families', activeFamilyId, 'goals', goalId)

  const result = await runTransaction(db, async (transaction) => {
    const goalSnap = await transaction.get(goalRef)

    if (!goalSnap.exists()) {
      throw new Error('Savings goal not found.')
    }

    const goalData = normalizeGoal({ id: goalSnap.id, ...goalSnap.data() }, goalSnap.id)

    if (goalData.childId !== userId) {
      throw new Error('You can only decline a counter offer for your own goal.')
    }

    if (goalData.status !== 'countered') {
      throw new Error('This savings goal does not have an active counter offer.')
    }

    transaction.update(goalRef, {
      status: 'denied',
      counterTarget: null,
      counterNote: '',
      counteredAt: null,
      counteredBy: null,
      negotiationHistory: [
        ...(goalData.negotiationHistory || []),
        {
          type: 'counter_declined',
          target: Number(goalData.counterTarget) || Number(goalData.target) || 0,
          by: userId,
          note: '',
          at: serverTimestamp(),
        },
      ],
      parentReviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return {
      id: goalData.id,
      childId: goalData.childId,
      name: goalData.name,
    }
  })

  trackAnalyticsEvent(
    'savings_goal_counter_declined',
    {
      itemId: result.id,
      itemType: 'goal',
      childId: result.childId,
      name: result.name,
      source: 'declineSavingsGoalCounter',
      screen: 'kid',
    },
    { familyId: activeFamilyId, userId, userRole },
  )

  return result
}
export async function createFeedbackEntry(feedbackPayload, context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (userRole !== 'parent') {
    throw new Error('Only parents can submit feedback.')
  }

  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase is not configured.')
  }

  const category = (feedbackPayload.category || '').trim() || 'general'
  const message = (feedbackPayload.message || '').trim()

  if (!message) {
    throw new Error('Feedback message is required.')
  }

  await addDoc(collection(db, 'families', activeFamilyId, 'feedbackEntries'), {
    category,
    message,
    status: 'open',
    createdBy: userId,
    createdAt: serverTimestamp(),
  })

  trackAnalyticsEvent(
    'feedback_submitted',
    {
      itemType: 'feedback',
      category,
      source: 'createFeedbackEntry',
      screen: 'parent',
    },
    { familyId: activeFamilyId, userId, userRole },
  )
}

export async function getFamilyFeedbackEntries(context = {}) {
  const { familyId: activeFamilyId, userId, userRole } = getActiveFamilyContext(context)

  if (!hasFirebaseConfig || !db) {
    return {
      source: 'empty',
      data: { entries: [] },
      context: { familyId: activeFamilyId, userId, userRole },
    }
  }

  let snapshot
  try {
    snapshot = await getDocs(collection(db, 'families', activeFamilyId, 'feedbackEntries'))
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return {
        source: 'empty',
        data: { entries: [] },
        context: { familyId: activeFamilyId, userId, userRole },
      }
    }
    throw error
  }

  const entries = snapshot.docs
    .map((item) => normalizeFeedbackEntry({ id: item.id, ...item.data() }, item.id))
    .sort((left, right) => {
      const leftTime = toDateValue(left.createdAt)?.getTime() || 0
      const rightTime = toDateValue(right.createdAt)?.getTime() || 0
      return rightTime - leftTime
    })

  return {
    source: 'firestore',
    data: { entries },
    context: { familyId: activeFamilyId, userId, userRole },
  }
}
