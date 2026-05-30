import { useEffect, useState } from 'react'

import MarkdownTextArea from '../../components/shared/MarkdownTextArea'
import { useAuth } from '../../context/AuthContext'
import {
  approveSavingsGoalCompletion,
  createChildProfile,
  createHousehold,
  createGoal,
  createJob,
  createFeedbackEntry,
  createReward,
  deleteChildProfile,
  clearChildSessionCode,
  getFamilyDashboard,
  getFamilyConsequenceEvents,
  getFamilyJobCheckRequests,
  getFamilyFeedbackEntries,
  getFamilyStoreData,
  getHouseholdOnboardingData,
  fulfillRewardRequest,
  markJobAsMissed,
  reviewJobCheckRequest,
  reviewRewardRequest,
  reviewSavingsGoalRequest,
  setFamilyAnnouncement,
  setChildAllowSessionCode,
  setChildSessionSecurity,
  updateChildProfile,
  updateJob,
  updateReward,
} from '../../services/familyEconomyService'
import {
  exportOnboardingCompletionSummary,
  getOnboardingCompletionSummary,
  getWeeklyActiveFamilySummary,
} from '../../services/analytics'

const emptyWeeklySummary = {
  windowDays: 7,
  activeFamilyCount: 0,
  totalEventCount: 0,
  families: [],
}

const emptyOnboardingSummary = {
  windowDays: 30,
  startedFamilyCount: 0,
  completedFamilyCount: 0,
  completionRate: 0,
  startedFamilies: [],
  completedFamilies: [],
}

const CREATOR_OWNER_EMAIL = 'austin.dober@gmail.com'
const CHILD_AVATAR_OPTIONS = ['🧒', '🧑', '🌟', '🚀', '🦄']

export default function ProfilePage() {
  const {
    displayName,
    userEmail,
    userRole,
    familyId,
    userId,
    isAuthenticated,
    login,
    hasParentPin,
    parentControlsUnlocked,
    setParentPin,
    unlockParentControls,
    unlockParentWithPassword,
    logout,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [childProfiles, setChildProfiles] = useState([])
  const [familySummary, setFamilySummary] = useState({
    profileName: '',
    familyRules: '',
    familyAnnouncement: '',
    creatorOwnerEmail: '',
    creatorMetricsEnabled: false,
    savingsGoalApprovalMode: 'claim_only',
    missedJobConsequenceEnabled: false,
    missedJobPenaltyCredits: 0,
    missedJobTimingEnabled: false,
    missedJobDefaultHours: 24,
    failedJobCheckConsequenceEnabled: false,
    failedJobCheckPenaltyCredits: 0,
    maxActivePoolClaimsPerChild: 1,
    allowClaimingWithPendingChecks: false,
    familyDashboardTopCardsEnabled: true,
    achievementsEnabled: true,
    familyRecognitionEnabled: true,
    customBadges: [],
    achievementFirstGoalTarget: 1,
    achievementContributorCreditsTarget: 100,
    achievementHelperJobsTarget: 3,
    achievementReadingJobsTarget: 5,
    recognitionStreakDaysTarget: 3,
    recognitionHelpingHandJobsTarget: 1,
    recognitionGoalGetterTarget: 1,
    dynamicPricingEnabled: false,
    dynamicPricingWindowPeriod: 'week',
    dynamicPricingDemandWeight: 10,
    dynamicPricingScarcityWeight: 20,
  })
  const [childSessionSecurityEnabled, setChildSessionSecurityEnabled] = useState(false)
  const [activeDialog, setActiveDialog] = useState('')
  const [requestsJumpTarget, setRequestsJumpTarget] = useState('')
  const [dialogBusy, setDialogBusy] = useState(false)
  const [jobs, setJobs] = useState([])
  const [jobCheckRequests, setJobCheckRequests] = useState([])
  const [rewards, setRewards] = useState([])
  const [rewardRequests, setRewardRequests] = useState([])
  const [goals, setGoals] = useState([])
  const [consequenceEvents, setConsequenceEvents] = useState([])
  
  const [auditReportRange, setAuditReportRange] = useState('30')
  const [auditReportChildId, setAuditReportChildId] = useState('all')
  const [auditReportType, setAuditReportType] = useState('all')
  const [jobTitle, setJobTitle] = useState('')
  const [jobRewardType, setJobRewardType] = useState('credits')
  const [jobPoints, setJobPoints] = useState('50')
  const [jobLimitCount, setJobLimitCount] = useState('')
  const [jobLimitPeriod, setJobLimitPeriod] = useState('week')
  const [jobFamilyLimitCount, setJobFamilyLimitCount] = useState('')
  const [jobFamilyLimitPeriod, setJobFamilyLimitPeriod] = useState('week')
  const [jobRecurrenceFrequency, setJobRecurrenceFrequency] = useState('none')
  const [jobMissedAfterHours, setJobMissedAfterHours] = useState('')
  const [jobBadgeContribution, setJobBadgeContribution] = useState('none')
  const [rewardTitle, setRewardTitle] = useState('')
  const [rewardCost, setRewardCost] = useState('150')
  const [rewardRecurrenceFrequency, setRewardRecurrenceFrequency] = useState('weekly')
  const [rewardLimitCount, setRewardLimitCount] = useState('')
  const [rewardLimitPeriod, setRewardLimitPeriod] = useState('day')
  const [rewardFamilyLimitCount, setRewardFamilyLimitCount] = useState('')
  const [rewardFamilyLimitPeriod, setRewardFamilyLimitPeriod] = useState('day')
  const [jobScopeChildId, setJobScopeChildId] = useState('')
  const [rewardScopeChildId, setRewardScopeChildId] = useState('')
  const [editingJobId, setEditingJobId] = useState('')
  const [editingRewardId, setEditingRewardId] = useState('')
  const [reviewingRequestId, setReviewingRequestId] = useState('')
  const [rewardReviewNotes, setRewardReviewNotes] = useState({})
  const [counterRewardRequestId, setCounterRewardRequestId] = useState('')
  const [counterRewardTitle, setCounterRewardTitle] = useState('')
  const [counterRewardCost, setCounterRewardCost] = useState('')
  const [counterGoalId, setCounterGoalId] = useState('')
  const [counterGoalTarget, setCounterGoalTarget] = useState('')
  const [counterGoalNote, setCounterGoalNote] = useState('')
  const [savingsGoalName, setSavingsGoalName] = useState('')
  const [savingsGoalTarget, setSavingsGoalTarget] = useState('500')
  const [savingsGoalScope, setSavingsGoalScope] = useState('family')
  const [householdName, setHouseholdName] = useState('')
  const [familyRules, setFamilyRules] = useState('')
  const [familyAnnouncementDraft, setFamilyAnnouncementDraft] = useState('')
  const [savingFamilyAnnouncement, setSavingFamilyAnnouncement] = useState(false)
  const [newChildName, setNewChildName] = useState('')
  const [newChildAvatar, setNewChildAvatar] = useState('🧒')
  const [editingChildId, setEditingChildId] = useState('')
  const [editingChildName, setEditingChildName] = useState('')
  const [editingChildAvatar, setEditingChildAvatar] = useState('🧒')
  const [removeChildConfirmId, setRemoveChildConfirmId] = useState('')
  const [dynamicPricingEnabled, setDynamicPricingEnabled] = useState(false)
  const [savingsGoalApprovalMode, setSavingsGoalApprovalMode] = useState('claim_only')
  const [missedJobConsequenceEnabled, setMissedJobConsequenceEnabled] = useState(false)
  const [missedJobPenaltyCredits, setMissedJobPenaltyCredits] = useState('0')
  const [missedJobTimingEnabled, setMissedJobTimingEnabled] = useState(false)
  const [missedJobDefaultHours, setMissedJobDefaultHours] = useState('24')
  const [failedJobCheckConsequenceEnabled, setFailedJobCheckConsequenceEnabled] = useState(false)
  const [failedJobCheckPenaltyCredits, setFailedJobCheckPenaltyCredits] = useState('0')
  const [maxActivePoolClaimsPerChild, setMaxActivePoolClaimsPerChild] = useState('1')
  const [allowClaimingWithPendingChecks, setAllowClaimingWithPendingChecks] = useState(false)
  const [familyDashboardTopCardsEnabled, setFamilyDashboardTopCardsEnabled] = useState(true)
  const [achievementsEnabled, setAchievementsEnabled] = useState(true)
  const [familyRecognitionEnabled, setFamilyRecognitionEnabled] = useState(true)
  const [achievementFirstGoalTarget, setAchievementFirstGoalTarget] = useState('1')
  const [achievementContributorCreditsTarget, setAchievementContributorCreditsTarget] = useState('100')
  const [achievementHelperJobsTarget, setAchievementHelperJobsTarget] = useState('3')
  const [achievementReadingJobsTarget, setAchievementReadingJobsTarget] = useState('5')
  const [recognitionStreakDaysTarget, setRecognitionStreakDaysTarget] = useState('3')
  const [recognitionHelpingHandJobsTarget, setRecognitionHelpingHandJobsTarget] = useState('1')
  const [recognitionGoalGetterTarget, setRecognitionGoalGetterTarget] = useState('1')
  const [customBadges, setCustomBadges] = useState([])
  const [customBadgeLabel, setCustomBadgeLabel] = useState('')
  const [customBadgeIcon, setCustomBadgeIcon] = useState('🏅')
  const [customBadgeCategory, setCustomBadgeCategory] = useState('achievement')
  const [customBadgeMetric, setCustomBadgeMetric] = useState('completed_goals')
  const [customBadgeTarget, setCustomBadgeTarget] = useState('1')
  const [dynamicPricingWindowPeriod, setDynamicPricingWindowPeriod] = useState('week')
  const [dynamicPricingDemandWeight, setDynamicPricingDemandWeight] = useState('10')
  const [dynamicPricingScarcityWeight, setDynamicPricingScarcityWeight] = useState('20')
  const [markingMissedJobId, setMarkingMissedJobId] = useState('')
  const [onboardingCompletionSummary, setOnboardingCompletionSummary] = useState(emptyOnboardingSummary)
  const [weeklyActiveSummary, setWeeklyActiveSummary] = useState(emptyWeeklySummary)
  const [feedbackEntries, setFeedbackEntries] = useState([])
  const [feedbackCategory, setFeedbackCategory] = useState('general')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackBusy, setFeedbackBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  function formatJobReward(job) {
    const amount = Number(job.points) || 0
    return job.rewardType === 'xp' ? `+ ${amount} XP` : `+ ${amount} credits`
  }

  function customBadgeMetricLabel(metric) {
    if (metric === 'contribution_credits') {
      return 'Contribution credits'
    }

    if (metric === 'helper_jobs') {
      return 'Helper jobs'
    }

    if (metric === 'reading_jobs') {
      return 'Reading jobs'
    }

    if (metric === 'streak_days') {
      return 'Streak days'
    }

    return 'Completed goals'
  }

  function getWeekStart(value = new Date()) {
    const start = new Date(value)
    const day = start.getDay()
    const daysSinceMonday = (day + 6) % 7
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - daysSinceMonday)
    return start
  }

  function inRange(value, start, end) {
    return Boolean(value && value >= start && value < end)
  }

  function formatDateTime(value) {
    const date = toDateValue(value)
    if (!date) {
      return 'Unknown time'
    }

    return date.toLocaleString()
  }

  function formatHours(value) {
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

  const missedPenaltyValue = Math.max(0, Number(missedJobPenaltyCredits) || 0)
  const failedCheckPenaltyValue = Math.max(0, Number(failedJobCheckPenaltyCredits) || 0)
  const missedHoursValue = Math.max(1, Number(missedJobDefaultHours) || 24)
  const maxPoolClaimsValue = Math.max(1, Number(maxActivePoolClaimsPerChild) || 1)
  const demandWeightValue = Math.max(0, Number(dynamicPricingDemandWeight) || 0)
  const scarcityWeightValue = Math.max(0, Number(dynamicPricingScarcityWeight) || 0)
  const firstGoalTargetValue = Math.max(1, Number(achievementFirstGoalTarget) || 1)
  const contributorCreditsTargetValue = Math.max(1, Number(achievementContributorCreditsTarget) || 100)
  const helperJobsTargetValue = Math.max(1, Number(achievementHelperJobsTarget) || 3)
  const readingJobsTargetValue = Math.max(1, Number(achievementReadingJobsTarget) || 5)
  const streakDaysTargetValue = Math.max(1, Number(recognitionStreakDaysTarget) || 3)
  const helpingHandTargetValue = Math.max(1, Number(recognitionHelpingHandJobsTarget) || 1)
  const goalGetterTargetValue = Math.max(1, Number(recognitionGoalGetterTarget) || 1)
  const childNameById = childProfiles.reduce((accumulator, child) => {
    accumulator[child.id] = `${child.avatar || '🧒'} ${child.displayName || 'Kid'}`
    return accumulator
  }, {})

  const consequenceEventsSorted = consequenceEvents
    .slice()
    .sort((left, right) => {
      const leftMs = toDateValue(left.createdAt)?.getTime() || 0
      const rightMs = toDateValue(right.createdAt)?.getTime() || 0
      return rightMs - leftMs
    })

  const thisWeekStart = getWeekStart()
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const now = new Date()
  const trailWindowStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))

  const thisWeekConsequenceEvents = consequenceEventsSorted.filter((entry) =>
    inRange(toDateValue(entry.createdAt), thisWeekStart, now),
  )
  const lastWeekConsequenceEvents = consequenceEventsSorted.filter((entry) =>
    inRange(toDateValue(entry.createdAt), lastWeekStart, thisWeekStart),
  )

  const thisWeekPenaltyTotal = thisWeekConsequenceEvents.reduce(
    (sum, entry) => sum + (Number(entry.penaltyCredits) || 0),
    0,
  )
  const lastWeekPenaltyTotal = lastWeekConsequenceEvents.reduce(
    (sum, entry) => sum + (Number(entry.penaltyCredits) || 0),
    0,
  )
  const thisWeekDeniedCount = thisWeekConsequenceEvents.filter(
    (entry) => entry.type === 'job_check_denied',
  ).length
  const lastWeekDeniedCount = lastWeekConsequenceEvents.filter(
    (entry) => entry.type === 'job_check_denied',
  ).length
  const thisWeekMissedCount = thisWeekConsequenceEvents.filter(
    (entry) => entry.type === 'job_marked_missed',
  ).length
  const lastWeekMissedCount = lastWeekConsequenceEvents.filter(
    (entry) => entry.type === 'job_marked_missed',
  ).length

  const visibleAuditTrailEvents = consequenceEventsSorted
    .filter((entry) => {
      const createdAt = toDateValue(entry.createdAt)
      return inRange(createdAt, trailWindowStart, now)
    })
    .slice(0, 20)

  const reportRangeDays = auditReportRange === 'all'
    ? null
    : Math.max(1, Number(auditReportRange) || 30)
  const reportStart = reportRangeDays
    ? new Date(now.getTime() - (reportRangeDays * 24 * 60 * 60 * 1000))
    : null

  const reportFilteredEvents = consequenceEventsSorted.filter((entry) => {
    const createdAt = toDateValue(entry.createdAt)
    if (!createdAt) {
      return false
    }

    if (reportStart && !inRange(createdAt, reportStart, now)) {
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

  const topConsequenceJobs = Object.entries(
    thisWeekConsequenceEvents.reduce((accumulator, entry) => {
      const key = entry.jobTitle || 'Unknown job'
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {}),
  )
    .map(([title, count]) => ({ title, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)

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
    .sort((left, right) => right.count - left.count)

  const mostMissedJobs = Object.entries(
    thisWeekConsequenceEvents
      .filter((entry) => entry.type === 'job_marked_missed' || entry.type === 'job_missed')
      .reduce((accumulator, entry) => {
        const key = entry.jobTitle || 'Unknown job'
        accumulator[key] = (accumulator[key] || 0) + 1
        return accumulator
      }, {}),
  )
    .map(([title, count]) => ({ title, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 3)

  const deniedChecksThisWeek = thisWeekConsequenceEvents.filter(
    (entry) => entry.type === 'job_check_denied',
  )
  const deniedChecksLastWeek = lastWeekConsequenceEvents.filter(
    (entry) => entry.type === 'job_check_denied',
  )
  const deniedPenaltyThisWeek = deniedChecksThisWeek.reduce(
    (sum, entry) => sum + Number(entry.penaltyCredits || 0),
    0,
  )
  const deniedPenaltyLastWeek = deniedChecksLastWeek.reduce(
    (sum, entry) => sum + Number(entry.penaltyCredits || 0),
    0,
  )

  const dynamicPressureRewards = (rewards || [])
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

  const reviewedChecks = jobCheckRequests.filter((request) => {
    const reviewedAt = toDateValue(request.reviewedAt)
    return (request.status === 'approved' || request.status === 'denied')
      && inRange(reviewedAt, thisWeekStart, now)
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

      return diffMs / (1000 * 60 * 60)
    })
    .filter((value) => Number.isFinite(value))

  const avgReviewHours = reviewDurationsHours.length > 0
    ? reviewDurationsHours.reduce((sum, value) => sum + value, 0) / reviewDurationsHours.length
    : null

  const pendingChecks = jobCheckRequests.filter((request) => request.status === 'pending')
  const stalePendingChecks = pendingChecks.filter((request) => {
    const createdAt = toDateValue(request.createdAt)
    if (!createdAt) {
      return false
    }

    const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    return ageHours >= 24
  })
  const pendingRewardRequestsAnalytics = rewardRequests.filter((request) => request.status === 'pending')

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

  const recentCelebrationEvents = celebrationTimelineEvents.slice(0, 12)
  const thisWeekCelebrationEvents = celebrationTimelineEvents.filter((entry) =>
    inRange(entry.at, thisWeekStart, now),
  )
  const celebrationCounts = thisWeekCelebrationEvents.reduce((accumulator, entry) => {
    accumulator[entry.type] = (accumulator[entry.type] || 0) + 1
    return accumulator
  }, {})

  useEffect(() => {
    if (activeDialog !== 'requests' || !requestsJumpTarget) {
      return
    }

    const idByTarget = {
      jobs: 'requests-section-jobs',
      rewards: 'requests-section-rewards',
      goals: 'requests-section-goals',
    }

    const sectionId = idByTarget[requestsJumpTarget]
    if (!sectionId) {
      return
    }

    const timerId = window.setTimeout(() => {
      const section = document.getElementById(sectionId)
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 80)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [activeDialog, requestsJumpTarget, dialogBusy])

  const isParent = isAuthenticated && userRole === 'parent'
  const userEmailLower = String(userEmail || '').trim().toLowerCase()
  const familyCreatorOwnerEmail = String(familySummary.creatorOwnerEmail || '').trim().toLowerCase()
  const isCreatorMode = isParent
    && parentControlsUnlocked
    && (
      userEmailLower === CREATOR_OWNER_EMAIL
      || (Boolean(familySummary.creatorMetricsEnabled) && userEmailLower === familyCreatorOwnerEmail)
    )

  useEffect(() => {
    let cancelled = false

    async function loadChildren() {
      if (!isParent || !familyId) {
        if (!cancelled) {
          setChildProfiles([])
        }
        return
      }

      try {
        const result = await getHouseholdOnboardingData({ familyId, userId, userRole })
        if (!cancelled) {
          const profiles = result.data.childProfiles || []
          setChildProfiles(profiles)
          setFamilySummary({
            profileName: result.data.family?.profileName || '',
            familyRules: result.data.family?.familyRules || '',
            familyAnnouncement: result.data.family?.familyAnnouncement || '',
            creatorOwnerEmail: result.data.family?.creatorOwnerEmail || '',
            creatorMetricsEnabled: Boolean(result.data.family?.creatorMetricsEnabled),
            savingsGoalApprovalMode: result.data.family?.savingsGoalApprovalMode || 'claim_only',
            missedJobConsequenceEnabled: Boolean(result.data.family?.missedJobConsequenceEnabled),
            missedJobPenaltyCredits: Number(result.data.family?.missedJobPenaltyCredits) || 0,
            missedJobTimingEnabled: Boolean(result.data.family?.missedJobTimingEnabled),
            missedJobDefaultHours: Number(result.data.family?.missedJobDefaultHours) || 24,
            failedJobCheckConsequenceEnabled: Boolean(result.data.family?.failedJobCheckConsequenceEnabled),
            failedJobCheckPenaltyCredits: Number(result.data.family?.failedJobCheckPenaltyCredits) || 0,
            maxActivePoolClaimsPerChild: Number(result.data.family?.maxActivePoolClaimsPerChild) || 1,
            allowClaimingWithPendingChecks: Boolean(result.data.family?.allowClaimingWithPendingChecks),
            familyDashboardTopCardsEnabled: result.data.family?.familyDashboardTopCardsEnabled !== false,
            achievementsEnabled: result.data.family?.achievementsEnabled !== false,
            familyRecognitionEnabled: result.data.family?.familyRecognitionEnabled !== false,
            customBadges: Array.isArray(result.data.family?.customBadges) ? result.data.family.customBadges : [],
            achievementFirstGoalTarget: Number(result.data.family?.achievementFirstGoalTarget) || 1,
            achievementContributorCreditsTarget: Number(result.data.family?.achievementContributorCreditsTarget) || 100,
            achievementHelperJobsTarget: Number(result.data.family?.achievementHelperJobsTarget) || 3,
            achievementReadingJobsTarget: Number(result.data.family?.achievementReadingJobsTarget) || 5,
            recognitionStreakDaysTarget: Number(result.data.family?.recognitionStreakDaysTarget) || 3,
            recognitionHelpingHandJobsTarget: Number(result.data.family?.recognitionHelpingHandJobsTarget) || 1,
            recognitionGoalGetterTarget: Number(result.data.family?.recognitionGoalGetterTarget) || 1,
            dynamicPricingEnabled: Boolean(result.data.family?.dynamicPricingEnabled),
            dynamicPricingWindowPeriod: result.data.family?.dynamicPricingWindowPeriod || 'week',
            dynamicPricingDemandWeight: Number(result.data.family?.dynamicPricingDemandWeight) || 10,
            dynamicPricingScarcityWeight: Number(result.data.family?.dynamicPricingScarcityWeight) || 20,
          })
          setChildSessionSecurityEnabled(
            Boolean(result.data.family?.childSessionSecurityEnabled),
          )
          setFamilyAnnouncementDraft(result.data.family?.familyAnnouncement || '')
        }
      } catch {
        if (!cancelled) {
          setChildProfiles([])
        }
      }
    }

    loadChildren()

    return () => {
      cancelled = true
    }
  }, [isParent, familyId, userId, userRole])

  useEffect(() => {
    let cancelled = false
    const shouldRefreshCreatorAnalytics = isCreatorMode && activeDialog === 'analytics'

    async function refreshValidationSummaries() {
      if (!shouldRefreshCreatorAnalytics) {
        if (!cancelled) {
          setWeeklyActiveSummary(emptyWeeklySummary)
          setOnboardingCompletionSummary(emptyOnboardingSummary)
        }
        return
      }

      try {
        const [weeklySummary, onboardingSummary] = await Promise.all([
          getWeeklyActiveFamilySummary(),
          getOnboardingCompletionSummary(),
        ])

        if (cancelled) {
          return
        }

        setWeeklyActiveSummary(weeklySummary)
        setOnboardingCompletionSummary(onboardingSummary)
      } catch {
        if (!cancelled) {
          setWeeklyActiveSummary(emptyWeeklySummary)
          setOnboardingCompletionSummary(emptyOnboardingSummary)
        }
      }
    }

    if (shouldRefreshCreatorAnalytics) {
      refreshValidationSummaries()
    }

    function handleAnalyticsEvent() {
      refreshValidationSummaries()
    }

    if (shouldRefreshCreatorAnalytics) {
      window.addEventListener('family-economy-analytics', handleAnalyticsEvent)
    }

    return () => {
      cancelled = true
      if (shouldRefreshCreatorAnalytics) {
        window.removeEventListener('family-economy-analytics', handleAnalyticsEvent)
      }
    }
  }, [isCreatorMode, activeDialog])

  useEffect(() => {
    let cancelled = false

    async function loadFeedbackEntries() {
      if (!isParent || !parentControlsUnlocked || !familyId) {
        return
      }

      try {
        const result = await getFamilyFeedbackEntries({ familyId, userId, userRole })

        if (!cancelled) {
          setFeedbackEntries(result.data.entries || [])
        }
      } catch {
        if (!cancelled) {
          setFeedbackEntries([])
        }
      }
    }

    loadFeedbackEntries()

    return () => {
      cancelled = true
    }
  }, [isParent, parentControlsUnlocked, familyId, userId, userRole])

  useEffect(() => {
    let cancelled = false

    async function refreshPendingCounts() {
      if (!isParent || !parentControlsUnlocked || !familyId) {
        return
      }

      try {
        const [storeResult, checkResult, dashboardResult, consequenceResult] = await Promise.all([
          getFamilyStoreData({ familyId, userId, userRole, selectedChildId: null }),
          getFamilyJobCheckRequests({ familyId, userId, userRole, selectedChildId: null }),
          getFamilyDashboard({ familyId, userId, userRole, selectedChildId: null }),
          getFamilyConsequenceEvents({ familyId, userId, userRole }),
        ])

        if (cancelled) {
          return
        }

        setRewardRequests(storeResult.data.requests || [])
        setRewards(storeResult.data.rewards || [])
        setJobCheckRequests(checkResult.data.requests || [])
        setGoals(dashboardResult.data.goals || [])
        setConsequenceEvents(consequenceResult.data.events || [])
      } catch {
        if (!cancelled) {
          setRewards([])
          setRewardRequests([])
          setJobCheckRequests([])
          setGoals([])
          setConsequenceEvents([])
        }
      }
    }

    refreshPendingCounts()

    return () => {
      cancelled = true
    }
  }, [isParent, parentControlsUnlocked, familyId, userId, userRole])

  async function handleParentLogin(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await login(email, password)
      setEmail('')
      setPassword('')
    } catch (caughtError) {
      setError(caughtError.message || 'Parent login failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnlockWithPassword(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await unlockParentWithPassword(password)
      setPassword('')
    } catch (caughtError) {
      setError(caughtError.message || 'Password unlock failed.')
    } finally {
      setSaving(false)
    }
  }

  function handleUnlockWithPin(event) {
    event.preventDefault()
    setError('')

    try {
      unlockParentControls(pin)
      setPin('')
    } catch (caughtError) {
      setError(caughtError.message || 'PIN unlock failed.')
    }
  }

  function handleSavePin(event) {
    event.preventDefault()
    setError('')

    try {
      setParentPin(newPin)
      setNewPin('')
    } catch (caughtError) {
      setError(caughtError.message || 'Could not save Parent PIN.')
    }
  }

  async function handleToggleChildSessionSecurity() {
    setSaving(true)
    setError('')

    try {
      const nextValue = !childSessionSecurityEnabled
      await setChildSessionSecurity(nextValue, { familyId, userId, userRole })
      setChildSessionSecurityEnabled(nextValue)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not update child session security setting.')
    } finally {
      setSaving(false)
    }
  }

  async function refreshChildProfiles() {
    const result = await getHouseholdOnboardingData({ familyId, userId, userRole })
    setChildProfiles(result.data.childProfiles || [])
  }

  async function handleAddChildProfile(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await createChildProfile(
        {
          displayName: newChildName,
          avatar: newChildAvatar,
        },
        { familyId, userId, userRole },
      )
      setNewChildName('')
      setNewChildAvatar('🧒')
      await refreshChildProfiles()
      closeDialog()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not add child profile.')
    } finally {
      setSaving(false)
    }
  }

  function handleStartEditChild(child) {
    setEditingChildId(child.id)
    setEditingChildName(child.displayName || '')
    setEditingChildAvatar(child.avatar || '🧒')
    setRemoveChildConfirmId('')
  }

  function handleCancelEditChild() {
    setEditingChildId('')
    setEditingChildName('')
    setEditingChildAvatar('🧒')
  }

  async function handleSaveChildProfile(childId) {
    setSaving(true)
    setError('')

    try {
      await updateChildProfile(
        childId,
        {
          displayName: editingChildName,
          avatar: editingChildAvatar,
        },
        { familyId, userId, userRole },
      )
      handleCancelEditChild()
      await refreshChildProfiles()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not update child profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveChildProfile(childId) {
    setSaving(true)
    setError('')

    try {
      await deleteChildProfile(childId, { familyId, userId, userRole })
      setRemoveChildConfirmId('')
      if (editingChildId === childId) {
        handleCancelEditChild()
      }
      await refreshChildProfiles()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not remove child profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleChildAllowSessionCode(childId, allowed) {
    setSaving(true)
    setError('')

    try {
      await setChildAllowSessionCode(childId, allowed, { familyId, userId, userRole })

      await refreshChildProfiles()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not update child PIN permission.')
    } finally {
      setSaving(false)
    }
  }

  async function handleClearChildPin(childId) {
    setSaving(true)
    setError('')

    try {
      await clearChildSessionCode(childId, { familyId, userId, userRole })

      await refreshChildProfiles()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not clear child PIN.')
    } finally {
      setSaving(false)
    }
  }

  async function loadDialogData() {
    const [dashboardResult, storeResult, checkResult, consequenceResult] = await Promise.all([
      getFamilyDashboard({ familyId, userId, userRole, selectedChildId: null }),
      getFamilyStoreData({ familyId, userId, userRole, selectedChildId: null }),
      getFamilyJobCheckRequests({ familyId, userId, userRole, selectedChildId: null }),
      getFamilyConsequenceEvents({ familyId, userId, userRole }),
    ])

    setJobs(dashboardResult.data.jobs)
    setGoals(dashboardResult.data.goals)
    setRewards(storeResult.data.rewards)
    setRewardRequests(storeResult.data.requests)
    setJobCheckRequests(checkResult.data.requests)
    setConsequenceEvents(consequenceResult.data.events || [])
  }

  async function openDialog(dialog, options = {}) {
    setActiveDialog(dialog)
    setError('')
    setRequestsJumpTarget(dialog === 'requests' ? (options.requestsJumpTarget || '') : '')

    if (
      dialog === 'jobs'
      || dialog === 'rewards'
      || dialog === 'requests'
    ) {
      if (dialog === 'jobs') {
        setJobScopeChildId('')
        setJobBadgeContribution('none')
      }
      if (dialog === 'rewards') {
        setRewardScopeChildId('')
      }
      setDialogBusy(true)
      try {
        await loadDialogData()
      } catch (caughtError) {
        setError(caughtError.message || 'Could not load manager data.')
      } finally {
        setDialogBusy(false)
      }
    }

    if (dialog === 'setup') {
      setHouseholdName(familySummary.profileName || '')
      setFamilyRules(familySummary.familyRules || '')
      setSavingsGoalApprovalMode(familySummary.savingsGoalApprovalMode || 'claim_only')
      setMissedJobConsequenceEnabled(Boolean(familySummary.missedJobConsequenceEnabled))
      setMissedJobPenaltyCredits(String(familySummary.missedJobPenaltyCredits || 0))
      setMissedJobTimingEnabled(Boolean(familySummary.missedJobTimingEnabled))
      setMissedJobDefaultHours(String(familySummary.missedJobDefaultHours || 24))
      setFailedJobCheckConsequenceEnabled(Boolean(familySummary.failedJobCheckConsequenceEnabled))
      setFailedJobCheckPenaltyCredits(String(familySummary.failedJobCheckPenaltyCredits || 0))
      setMaxActivePoolClaimsPerChild(String(familySummary.maxActivePoolClaimsPerChild || 1))
      setAllowClaimingWithPendingChecks(Boolean(familySummary.allowClaimingWithPendingChecks))
      setFamilyDashboardTopCardsEnabled(familySummary.familyDashboardTopCardsEnabled !== false)
      setDynamicPricingEnabled(Boolean(familySummary.dynamicPricingEnabled))
      setDynamicPricingWindowPeriod(familySummary.dynamicPricingWindowPeriod || 'week')
      setDynamicPricingDemandWeight(String(familySummary.dynamicPricingDemandWeight || 10))
      setDynamicPricingScarcityWeight(String(familySummary.dynamicPricingScarcityWeight || 20))
    }

    if (dialog === 'badges') {
      setAchievementsEnabled(familySummary.achievementsEnabled !== false)
      setFamilyRecognitionEnabled(familySummary.familyRecognitionEnabled !== false)
      setAchievementFirstGoalTarget(String(familySummary.achievementFirstGoalTarget || 1))
      setAchievementContributorCreditsTarget(String(familySummary.achievementContributorCreditsTarget || 100))
      setAchievementHelperJobsTarget(String(familySummary.achievementHelperJobsTarget || 3))
      setAchievementReadingJobsTarget(String(familySummary.achievementReadingJobsTarget || 5))
      setRecognitionStreakDaysTarget(String(familySummary.recognitionStreakDaysTarget || 3))
      setRecognitionHelpingHandJobsTarget(String(familySummary.recognitionHelpingHandJobsTarget || 1))
      setRecognitionGoalGetterTarget(String(familySummary.recognitionGoalGetterTarget || 1))
      setCustomBadges(Array.isArray(familySummary.customBadges) ? familySummary.customBadges : [])
      setCustomBadgeLabel('')
      setCustomBadgeIcon('🏅')
      setCustomBadgeCategory('achievement')
      setCustomBadgeMetric('completed_goals')
      setCustomBadgeTarget('1')
    }

    if (dialog === 'savings') {
      setSavingsGoalName('')
      setSavingsGoalTarget('500')
      setSavingsGoalScope('family')
    }

    if (dialog === 'add-child') {
      setNewChildName('')
      setNewChildAvatar('🧒')
    }
  }

  async function handleCelebrationAction(entry) {
    if (entry.type === 'job_done') {
      await openDialog('jobs')
      return
    }

    if (entry.type === 'reward_approved' || entry.type === 'reward_fulfilled') {
      await openDialog('requests', { requestsJumpTarget: 'rewards' })
      return
    }

    await openDialog('requests', { requestsJumpTarget: 'goals' })
  }

  function closeDialog() {
    setActiveDialog('')
  }

  async function handleCreateSavingsGoal(event) {
    event.preventDefault()
    setDialogBusy(true)
    setError('')

    try {
      const childId = savingsGoalScope === 'family' ? null : savingsGoalScope

      await createGoal(
        {
          name: savingsGoalName,
          childId,
          target: Number(savingsGoalTarget) || 0,
          saved: 0,
        },
        { familyId, userId, userRole },
      )

      setSavingsGoalName('')
      setSavingsGoalTarget('500')
      setSavingsGoalScope('family')
      await loadDialogData()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not create savings goal.')
    } finally {
      setDialogBusy(false)
    }
  }

  function getConsequencePreset() {
    if (
      missedJobConsequenceEnabled
      && missedPenaltyValue === 5
      && missedJobTimingEnabled
      && missedHoursValue === 48
      && !failedJobCheckConsequenceEnabled
      && failedCheckPenaltyValue === 0
    ) {
      return 'gentle'
    }

    if (
      missedJobConsequenceEnabled
      && missedPenaltyValue === 15
      && missedJobTimingEnabled
      && missedHoursValue === 24
      && failedJobCheckConsequenceEnabled
      && failedCheckPenaltyValue === 5
    ) {
      return 'balanced'
    }

    if (
      missedJobConsequenceEnabled
      && missedPenaltyValue === 30
      && missedJobTimingEnabled
      && missedHoursValue === 12
      && failedJobCheckConsequenceEnabled
      && failedCheckPenaltyValue === 15
    ) {
      return 'strict'
    }

    return 'custom'
  }

  function applyConsequencePreset(preset) {
    if (preset === 'gentle') {
      setMissedJobConsequenceEnabled(true)
      setMissedJobPenaltyCredits('5')
      setMissedJobTimingEnabled(true)
      setMissedJobDefaultHours('48')
      setFailedJobCheckConsequenceEnabled(false)
      setFailedJobCheckPenaltyCredits('0')
      return
    }

    if (preset === 'balanced') {
      setMissedJobConsequenceEnabled(true)
      setMissedJobPenaltyCredits('15')
      setMissedJobTimingEnabled(true)
      setMissedJobDefaultHours('24')
      setFailedJobCheckConsequenceEnabled(true)
      setFailedJobCheckPenaltyCredits('5')
      return
    }

    if (preset === 'strict') {
      setMissedJobConsequenceEnabled(true)
      setMissedJobPenaltyCredits('30')
      setMissedJobTimingEnabled(true)
      setMissedJobDefaultHours('12')
      setFailedJobCheckConsequenceEnabled(true)
      setFailedJobCheckPenaltyCredits('15')
    }
  }

  function handleAddCustomBadge() {
    const label = String(customBadgeLabel || '').trim()
    if (!label) {
      return
    }

    setCustomBadges((current) => ([
      ...current,
      {
        id: `custom-${Date.now()}-${Math.round(Math.random() * 10000)}`,
        label,
        icon: String(customBadgeIcon || '').trim() || '🏅',
        category: customBadgeCategory === 'recognition' ? 'recognition' : 'achievement',
        metric: customBadgeMetric,
        target: Math.max(1, Number(customBadgeTarget) || 1),
      },
    ]))

    setCustomBadgeLabel('')
    setCustomBadgeIcon(customBadgeCategory === 'recognition' ? '🌟' : '🏅')
    setCustomBadgeMetric('completed_goals')
    setCustomBadgeTarget('1')
  }

  function handleRemoveCustomBadge(badgeId) {
    setCustomBadges((current) => current.filter((badge) => badge.id !== badgeId))
  }

  async function handleCreateJob(event) {
    event.preventDefault()
    setDialogBusy(true)
    setError('')

    try {
      const payload = {
        title: jobTitle,
        rewardType: jobRewardType,
        points: Number(jobPoints) || 0,
        childId: jobScopeChildId || null,
        claimLimitCount: Number(jobLimitCount) || 0,
        claimLimitPeriod: jobLimitPeriod,
        familyClaimLimitCount: Number(jobFamilyLimitCount) || 0,
        familyClaimLimitPeriod: jobFamilyLimitPeriod,
        autoRecreate: jobRecurrenceFrequency !== 'none',
        missedAfterHours: Number(jobMissedAfterHours) || 0,
        badgeContribution: jobBadgeContribution,
      }

      if (editingJobId) {
        await updateJob(editingJobId, payload, { familyId, userId, userRole })
      } else {
        await createJob(payload, { familyId, userId, userRole })
      }

      setEditingJobId('')
      setJobTitle('')
      setJobRewardType('credits')
      setJobPoints('50')
      setJobLimitCount('')
      setJobLimitPeriod('week')
      setJobFamilyLimitCount('')
      setJobFamilyLimitPeriod('week')
      setJobRecurrenceFrequency('none')
      setJobMissedAfterHours('')
      setJobBadgeContribution('none')
      await loadDialogData()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not create job.')
    } finally {
      setDialogBusy(false)
    }
  }

  async function handleCreateReward(event) {
    event.preventDefault()
    setDialogBusy(true)
    setError('')

    try {
      const normalizedFrequency =
        rewardRecurrenceFrequency === 'once'
        || rewardRecurrenceFrequency === 'daily'
        || rewardRecurrenceFrequency === 'weekly'
        || rewardRecurrenceFrequency === 'custom'
          ? rewardRecurrenceFrequency
          : 'weekly'

      const repeatMode = normalizedFrequency === 'once' ? 'once' : 'recur'
      const claimLimitCount =
        normalizedFrequency === 'daily' || normalizedFrequency === 'weekly'
          ? 1
          : normalizedFrequency === 'custom'
            ? Number(rewardLimitCount) || 0
            : 0
      const claimLimitPeriod =
        normalizedFrequency === 'daily'
          ? 'day'
          : normalizedFrequency === 'weekly'
            ? 'week'
            : normalizedFrequency === 'custom'
              ? rewardLimitPeriod
              : null

      const payload = {
        title: rewardTitle,
        cost: Number(rewardCost) || 0,
        childId: rewardScopeChildId || null,
        repeatMode,
        claimLimitCount,
        claimLimitPeriod,
        familyClaimLimitCount: Number(rewardFamilyLimitCount) || 0,
        familyClaimLimitPeriod: rewardFamilyLimitPeriod,
      }

      if (editingRewardId) {
        await updateReward(editingRewardId, payload, { familyId, userId, userRole })
      } else {
        await createReward(payload, { familyId, userId, userRole })
      }

      setEditingRewardId('')
      setRewardTitle('')
      setRewardCost('150')
      setRewardRecurrenceFrequency('weekly')
      setRewardLimitCount('')
      setRewardLimitPeriod('day')
      setRewardFamilyLimitCount('')
      setRewardFamilyLimitPeriod('day')
      await loadDialogData()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not create reward.')
    } finally {
      setDialogBusy(false)
    }
  }

  async function handleSaveHousehold(event) {
    event.preventDefault()
    setDialogBusy(true)
    setError('')

    try {
      await createHousehold(
        {
          profileName: householdName,
          familyRules,
          familyAnnouncement: familySummary.familyAnnouncement || '',
          childSessionSecurityEnabled,
          savingsGoalApprovalMode,
          missedJobConsequenceEnabled,
          missedJobPenaltyCredits: Number(missedJobPenaltyCredits) || 0,
          missedJobTimingEnabled,
          missedJobDefaultHours: Number(missedJobDefaultHours) || 24,
          failedJobCheckConsequenceEnabled,
          failedJobCheckPenaltyCredits: Number(failedJobCheckPenaltyCredits) || 0,
          maxActivePoolClaimsPerChild: Number(maxActivePoolClaimsPerChild) || 1,
          allowClaimingWithPendingChecks,
          familyDashboardTopCardsEnabled,
          dynamicPricingEnabled,
          dynamicPricingWindowPeriod,
          dynamicPricingDemandWeight: Number(dynamicPricingDemandWeight) || 0,
          dynamicPricingScarcityWeight: Number(dynamicPricingScarcityWeight) || 0,
        },
        { familyId, userId, userRole, userEmail },
      )
      setFamilySummary({
        profileName: householdName,
        familyRules,
        familyAnnouncement: familySummary.familyAnnouncement || '',
        creatorOwnerEmail: familySummary.creatorOwnerEmail || (userEmailLower === CREATOR_OWNER_EMAIL ? CREATOR_OWNER_EMAIL : ''),
        creatorMetricsEnabled: Boolean(familySummary.creatorMetricsEnabled) || userEmailLower === CREATOR_OWNER_EMAIL,
        savingsGoalApprovalMode,
        missedJobConsequenceEnabled,
        missedJobPenaltyCredits: Number(missedJobPenaltyCredits) || 0,
        missedJobTimingEnabled,
        missedJobDefaultHours: Number(missedJobDefaultHours) || 24,
        failedJobCheckConsequenceEnabled,
        failedJobCheckPenaltyCredits: Number(failedJobCheckPenaltyCredits) || 0,
        maxActivePoolClaimsPerChild: Number(maxActivePoolClaimsPerChild) || 1,
        allowClaimingWithPendingChecks,
        familyDashboardTopCardsEnabled,
        achievementsEnabled: familySummary.achievementsEnabled !== false,
        familyRecognitionEnabled: familySummary.familyRecognitionEnabled !== false,
        customBadges: Array.isArray(familySummary.customBadges) ? familySummary.customBadges : [],
        achievementFirstGoalTarget: Number(familySummary.achievementFirstGoalTarget) || 1,
        achievementContributorCreditsTarget: Number(familySummary.achievementContributorCreditsTarget) || 100,
        achievementHelperJobsTarget: Number(familySummary.achievementHelperJobsTarget) || 3,
        achievementReadingJobsTarget: Number(familySummary.achievementReadingJobsTarget) || 5,
        recognitionStreakDaysTarget: Number(familySummary.recognitionStreakDaysTarget) || 3,
        recognitionHelpingHandJobsTarget: Number(familySummary.recognitionHelpingHandJobsTarget) || 1,
        recognitionGoalGetterTarget: Number(familySummary.recognitionGoalGetterTarget) || 1,
        dynamicPricingEnabled,
        dynamicPricingWindowPeriod,
        dynamicPricingDemandWeight: Number(dynamicPricingDemandWeight) || 0,
        dynamicPricingScarcityWeight: Number(dynamicPricingScarcityWeight) || 0,
      })
      closeDialog()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not save household settings.')
    } finally {
      setDialogBusy(false)
    }
  }

  async function handleSaveBadgeSettings(event) {
    event.preventDefault()
    setDialogBusy(true)
    setError('')

    try {
      await createHousehold(
        {
          profileName: familySummary.profileName || householdName || 'My Family',
          achievementsEnabled,
          familyRecognitionEnabled,
          customBadges,
          achievementFirstGoalTarget: firstGoalTargetValue,
          achievementContributorCreditsTarget: contributorCreditsTargetValue,
          achievementHelperJobsTarget: helperJobsTargetValue,
          achievementReadingJobsTarget: readingJobsTargetValue,
          recognitionStreakDaysTarget: streakDaysTargetValue,
          recognitionHelpingHandJobsTarget: helpingHandTargetValue,
          recognitionGoalGetterTarget: goalGetterTargetValue,
        },
        { familyId, userId, userRole, userEmail },
      )

      setFamilySummary((current) => ({
        ...current,
        achievementsEnabled,
        familyRecognitionEnabled,
        customBadges,
        achievementFirstGoalTarget: firstGoalTargetValue,
        achievementContributorCreditsTarget: contributorCreditsTargetValue,
        achievementHelperJobsTarget: helperJobsTargetValue,
        achievementReadingJobsTarget: readingJobsTargetValue,
        recognitionStreakDaysTarget: streakDaysTargetValue,
        recognitionHelpingHandJobsTarget: helpingHandTargetValue,
        recognitionGoalGetterTarget: goalGetterTargetValue,
      }))
      closeDialog()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not save badge settings.')
    } finally {
      setDialogBusy(false)
    }
  }

  async function handleSaveFamilyAnnouncement(event) {
    event.preventDefault()
    setError('')
    setSavingFamilyAnnouncement(true)

    try {
      const nextAnnouncement = String(familyAnnouncementDraft || '').trim()
      await setFamilyAnnouncement(nextAnnouncement, { familyId, userId, userRole })
      setFamilyAnnouncementDraft(nextAnnouncement)
      setFamilySummary((current) => ({
        ...current,
        familyAnnouncement: nextAnnouncement,
      }))
    } catch (caughtError) {
      setError(caughtError.message || 'Could not save family announcement.')
    } finally {
      setSavingFamilyAnnouncement(false)
    }
  }

  async function handleReviewJobCheckRequest(requestId, decision) {
    setDialogBusy(true)
    setReviewingRequestId(`job:${requestId}`)
    setError('')

    try {
      await reviewJobCheckRequest(requestId, decision, { familyId, userId, userRole })
      await loadDialogData()

      const childrenResult = await getHouseholdOnboardingData({ familyId, userId, userRole })
      setChildProfiles(childrenResult.data.childProfiles || [])
    } catch (caughtError) {
      setError(caughtError.message || 'Could not review job check request.')
    } finally {
      setReviewingRequestId('')
      setDialogBusy(false)
    }
  }

  async function handleReviewRewardRequest(requestId, decision, options = {}) {
    setDialogBusy(true)
    setReviewingRequestId(`reward:${requestId}`)
    setError('')

    try {
      await reviewRewardRequest(requestId, decision, { familyId, userId, userRole }, options)
      setCounterRewardRequestId('')
      setCounterRewardTitle('')
      setCounterRewardCost('')
      await loadDialogData()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not review reward request.')
    } finally {
      setReviewingRequestId('')
      setDialogBusy(false)
    }
  }

  async function handleCounterRewardRequest(request) {
    const nextTitle = (counterRewardTitle || request.rewardTitle || '').trim()
    const nextCost = Number(counterRewardCost)

    if (!nextTitle) {
      setError('Counter reward title is required.')
      return
    }

    if (!Number.isFinite(nextCost) || nextCost <= 0) {
      setError('Counter reward cost must be greater than zero.')
      return
    }

    await handleReviewRewardRequest(request.id, 'countered', {
      parentNote: rewardReviewNotes[request.id] || '',
      counterRewardTitle: nextTitle,
      counterCost: nextCost,
    })
  }

  async function handleFulfillRewardRequest(requestId) {
    setDialogBusy(true)
    setReviewingRequestId(`reward-fulfill:${requestId}`)
    setError('')

    try {
      await fulfillRewardRequest(requestId, { familyId, userId, userRole })
      await loadDialogData()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not mark reward as fulfilled.')
    } finally {
      setReviewingRequestId('')
      setDialogBusy(false)
    }
  }

  async function handleApproveGoalCompletion(goalId) {
    setDialogBusy(true)
    setReviewingRequestId(`goal:${goalId}`)
    setError('')

    try {
      await approveSavingsGoalCompletion(goalId, { familyId, userId, userRole })
      await loadDialogData()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not approve this savings goal yet.')
    } finally {
      setReviewingRequestId('')
      setDialogBusy(false)
    }
  }

  async function handleReviewGoalRequest(goalId, decision) {
    setDialogBusy(true)
    setReviewingRequestId(`goal-request:${goalId}`)
    setError('')

    try {
      await reviewSavingsGoalRequest(goalId, decision, { familyId, userId, userRole })
      setCounterGoalId('')
      setCounterGoalTarget('')
      setCounterGoalNote('')
      await loadDialogData()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not review this goal request.')
    } finally {
      setReviewingRequestId('')
      setDialogBusy(false)
    }
  }

  async function handleCounterGoalRequest(goal) {
    const counterTarget = Number(counterGoalTarget)

    if (!Number.isFinite(counterTarget) || counterTarget <= 0) {
      setError('Counter target must be greater than zero.')
      return
    }

    setDialogBusy(true)
    setReviewingRequestId(`goal-request-counter:${goal.id}`)
    setError('')

    try {
      await reviewSavingsGoalRequest(
        goal.id,
        'countered',
        { familyId, userId, userRole },
        { counterTarget, counterNote: counterGoalNote },
      )
      setCounterGoalId('')
      setCounterGoalTarget('')
      setCounterGoalNote('')
      await loadDialogData()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not send counter offer.')
    } finally {
      setReviewingRequestId('')
      setDialogBusy(false)
    }
  }

  async function handleMarkJobMissed(jobId) {
    setDialogBusy(true)
    setMarkingMissedJobId(jobId)
    setError('')

    try {
      await markJobAsMissed(jobId, { familyId, userId, userRole })
      await loadDialogData()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not mark this job as missed.')
    } finally {
      setMarkingMissedJobId('')
      setDialogBusy(false)
    }
  }

  async function handleExportWeeklyActiveSummary() {
    const summary = JSON.stringify(
      {
        onboarding: await getOnboardingCompletionSummary(),
        weeklyActive: await getWeeklyActiveFamilySummary(),
      },
      null,
      2,
    )

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(summary)
        return
      } catch (caughtError) {
        setError(caughtError.message || 'Could not copy analytics snapshot.')
        return
      }
    }

    setError('Clipboard access is not available in this browser.')
  }

  async function handleExportOnboardingSummary() {
    const summary = await exportOnboardingCompletionSummary()

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(summary)
        return
      } catch (caughtError) {
        setError(caughtError.message || 'Could not copy onboarding snapshot.')
        return
      }
    }

    setError('Clipboard access is not available in this browser.')
  }

  async function handleExportConsequenceAuditCsv() {
    const csvEscape = (value) => {
      const text = String(value ?? '')
      return `"${text.replaceAll('"', '""')}"`
    }

    const headers = [
      'eventId',
      'type',
      'childId',
      'childLabel',
      'jobId',
      'jobTitle',
      'decision',
      'penaltyCredits',
      'source',
      'createdBy',
      'createdAtIso',
    ]

    const rows = reportFilteredEvents.slice(0, 1000).map((entry) => ([
      entry.id || '',
      entry.type || '',
      entry.childId || '',
      childNameById[entry.childId] || 'Unknown child',
      entry.jobId || '',
      entry.jobTitle || '',
      entry.decision || '',
      Number(entry.penaltyCredits) || 0,
      entry.source || '',
      entry.createdBy || '',
      toDateValue(entry.createdAt)?.toISOString() || '',
    ]))

    const csv = [
      headers.map(csvEscape).join(','),
      ...rows.map((row) => row.map(csvEscape).join(',')),
    ].join('\n')

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(csv)
        return
      } catch (caughtError) {
        setError(caughtError.message || 'Could not copy filtered consequence audit CSV.')
        return
      }
    }

    setError('Clipboard access is not available in this browser.')
  }

  async function handleSubmitFeedback(event) {
    event.preventDefault()

    setFeedbackBusy(true)
    setError('')

    try {
      await createFeedbackEntry(
        {
          category: feedbackCategory,
          message: feedbackMessage,
        },
        { familyId, userId, userRole },
      )

      setFeedbackMessage('')
      const result = await getFamilyFeedbackEntries({ familyId, userId, userRole })
      setFeedbackEntries(result.data.entries || [])
    } catch (caughtError) {
      setError(caughtError.message || 'Could not submit feedback.')
    } finally {
      setFeedbackBusy(false)
    }
  }

  function startEditJob(job) {
    setEditingJobId(job.id)
    setJobTitle(job.title || '')
    setJobRewardType(job.rewardType === 'xp' ? 'xp' : 'credits')
    setJobPoints(String(job.points || 0))
    setJobScopeChildId(job.childId || '')
    setJobLimitCount(job.claimLimitCount > 0 ? String(job.claimLimitCount) : '')
    setJobLimitPeriod(job.claimLimitPeriod || 'week')
    setJobFamilyLimitCount(job.familyClaimLimitCount > 0 ? String(job.familyClaimLimitCount) : '')
    setJobFamilyLimitPeriod(job.familyClaimLimitPeriod || 'week')
    if (!job.autoRecreate) {
      setJobRecurrenceFrequency('none')
    } else if (Number(job.claimLimitCount) === 1 && job.claimLimitPeriod === 'day') {
      setJobRecurrenceFrequency('daily')
    } else if (Number(job.claimLimitCount) === 1 && job.claimLimitPeriod === 'week') {
      setJobRecurrenceFrequency('weekly')
    } else {
      setJobRecurrenceFrequency('weekly')
    }
    setJobMissedAfterHours(job.missedAfterHours > 0 ? String(job.missedAfterHours) : '')
    setJobBadgeContribution(job.badgeContribution || 'none')
  }

  function startEditReward(reward) {
    setEditingRewardId(reward.id)
    setRewardTitle(reward.title || '')
    setRewardCost(String(reward.cost || 0))
    setRewardScopeChildId(reward.childId || '')
    if (reward.repeatMode === 'once') {
      setRewardRecurrenceFrequency('once')
    } else if (Number(reward.claimLimitCount) === 1 && reward.claimLimitPeriod === 'day') {
      setRewardRecurrenceFrequency('daily')
    } else if (Number(reward.claimLimitCount) === 1 && reward.claimLimitPeriod === 'week') {
      setRewardRecurrenceFrequency('weekly')
    } else {
      setRewardRecurrenceFrequency('custom')
    }
    setRewardLimitCount(reward.claimLimitCount > 0 ? String(reward.claimLimitCount) : '')
    setRewardLimitPeriod(reward.claimLimitPeriod || 'day')
    setRewardFamilyLimitCount(
      reward.familyClaimLimitCount > 0 ? String(reward.familyClaimLimitCount) : '',
    )
    setRewardFamilyLimitPeriod(reward.familyClaimLimitPeriod || 'day')
  }

  function cancelEditJob() {
    setEditingJobId('')
    setJobTitle('')
    setJobRewardType('credits')
    setJobPoints('50')
    setJobScopeChildId('')
    setJobLimitCount('')
    setJobLimitPeriod('week')
    setJobFamilyLimitCount('')
    setJobFamilyLimitPeriod('week')
    setJobRecurrenceFrequency('none')
    setJobMissedAfterHours('')
    setJobBadgeContribution('none')
  }

  function cancelEditReward() {
    setEditingRewardId('')
    setRewardTitle('')
    setRewardCost('150')
    setRewardScopeChildId('')
    setRewardRecurrenceFrequency('weekly')
    setRewardLimitCount('')
    setRewardLimitPeriod('day')
    setRewardFamilyLimitCount('')
    setRewardFamilyLimitPeriod('day')
  }

  const pendingJobCheckRequests = jobCheckRequests.filter((request) => request.status === 'pending')
  const pendingRewardRequests = rewardRequests.filter((request) => request.status === 'pending')
  const counteredRewardRequests = rewardRequests.filter((request) => request.status === 'countered')
  const approvedRewardRequests = rewardRequests.filter(
    (request) => request.status === 'approved' && request.requestKind === 'purchase',
  )
  const rewardDemandRows = Object.entries(
    approvedRewardRequests.reduce((accumulator, request) => {
      const title = request.rewardTitle || 'Unknown reward'
      const claimantId = request.requestedBy || request.childId || 'unknown'

      if (!accumulator[title]) {
        accumulator[title] = {
          count: 0,
          claimantCounts: {},
        }
      }

      accumulator[title].count += 1
      accumulator[title].claimantCounts[claimantId] = (accumulator[title].claimantCounts[claimantId] || 0) + 1
      return accumulator
    }, {}),
  )
    .map(([title, aggregate]) => {
      const topClaimant = Object.entries(aggregate.claimantCounts)
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0] || []

      return {
        title,
        count: aggregate.count,
        claimantId: topClaimant[0] || '',
        claimantCount: topClaimant[1] || 0,
        claimantLabel: childNameById[topClaimant[0]] || 'Family',
        claimantTotal: Object.keys(aggregate.claimantCounts).length,
      }
    })
    .sort((left, right) => right.count - left.count || left.title.localeCompare(right.title))
    .slice(0, 5)
  const pendingGoalRequests = goals.filter((goal) => goal.status === 'pending_parent_approval')
  const pendingGoalApprovals = goals.filter((goal) => goal.status === 'ready_to_claim')
  const pendingRequestsCount =
    pendingJobCheckRequests.length
    + pendingRewardRequests.length
    + counteredRewardRequests.length
    + approvedRewardRequests.length
    + pendingGoalRequests.length
    + pendingGoalApprovals.length

  return (
    <>
      <main className="phone-content">
        {!isParent ? (
          <section className="panel">
            <p className="panel-label">Parent Access</p>
            <p className="panel-muted">
              Sign in to open Parent Command Center.
            </p>
            <form className="auth-form" onSubmit={handleParentLogin}>
              <input
                className="job-input"
                type="email"
                placeholder="Parent email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <input
                className="job-input"
                type="password"
                placeholder="Parent password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {error ? <p className="status-note status-error">{error}</p> : null}
              <button type="submit" className="claim-button" disabled={saving}>
                {saving ? 'Unlocking...' : 'Unlock Parent'}
              </button>
            </form>
          </section>
        ) : null}

        {isParent && !parentControlsUnlocked ? (
          <section className="panel lock-access-card">
            <p className="lock-access-chip">Secure Mode</p>
            <p className="panel-label">Parent Access Locked</p>
            <p className="panel-muted">Enter PIN or password to open command center.</p>

            {hasParentPin ? (
              <form className="auth-form" onSubmit={handleUnlockWithPin}>
                <input
                  className="job-input"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  placeholder="Parent PIN"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  required
                />
                <button type="submit" className="claim-button">
                  Unlock with PIN
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleUnlockWithPassword}>
                <input
                  className="job-input"
                  type="password"
                  placeholder="Parent password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button type="submit" className="claim-button" disabled={saving}>
                  {saving ? 'Verifying...' : 'Unlock with Password'}
                </button>
              </form>
            )}

            {error ? <p className="status-note status-error">{error}</p> : null}
          </section>
        ) : null}

        {isParent && parentControlsUnlocked ? (
          <>
            <section className="panel">
              <p className="panel-label">Parent Command Center</p>
              <p className="panel-muted">Customize jobs, rewards, savings, and child safety settings.</p>
              <p className="panel-muted">Children configured: {childProfiles.length}</p>
            </section>

            <section className="panel">
              <p className="panel-label">Family Announcement</p>
              <p className="panel-muted">Quick action: post a headline update kids will see first in Family News.</p>
              <form className="auth-form" onSubmit={handleSaveFamilyAnnouncement}>
                <MarkdownTextArea
                  placeholder="Example: Grandparents will be in town on Saturday."
                  value={familyAnnouncementDraft}
                  onChange={setFamilyAnnouncementDraft}
                  rows={5}
                  disabled={savingFamilyAnnouncement}
                />
                <div className="button-row announcement-actions">
                  <button type="submit" className="claim-button" disabled={savingFamilyAnnouncement}>
                    {savingFamilyAnnouncement ? 'Saving...' : 'Post Announcement'}
                  </button>
                </div>
              </form>
            </section>

            <section className="panel">
              <p className="panel-label">Command Center Dialogs</p>
              <div className="button-row">
                <button type="button" className="text-button" onClick={() => openDialog('overview')}>
                  Family overview
                </button>
                <button type="button" className="text-button" onClick={() => openDialog('setup')}>
                  Household setup
                </button>
                <button type="button" className="text-button" onClick={() => openDialog('badges')}>
                  Badges and achievements
                </button>
                <button type="button" className="text-button" onClick={() => openDialog('jobs')}>
                  Jobs manager
                </button>
                <button type="button" className="text-button command-button" onClick={() => openDialog('requests')}>
                  <span>Pending requests</span>
                  {pendingRequestsCount > 0 ? (
                    <span className="command-badge">{pendingRequestsCount}</span>
                  ) : null}
                </button>
                <button type="button" className="text-button" onClick={() => openDialog('rewards')}>
                  Rewards manager
                </button>
                <button type="button" className="text-button" onClick={() => openDialog('savings')}>
                  Savings goals
                </button>
                <button type="button" className="text-button" onClick={() => openDialog('settings')}>
                  Parent settings
                </button>
                <button type="button" className="text-button" onClick={() => openDialog('analytics')}>
                  Analytics
                </button>
              </div>
            </section>

            <section className="panel">
              <p className="panel-label">Kids & Security Rules</p>
              <p className="panel-muted">
                Add, edit, and remove kids here. Manage each child profile's session PIN controls below.
              </p>
              <p className="panel-muted">
                Session lock status: {childSessionSecurityEnabled ? 'Enabled' : 'Disabled'}
              </p>
              <button
                type="button"
                className="claim-button"
                onClick={handleToggleChildSessionSecurity}
                disabled={saving}
              >
                {childSessionSecurityEnabled ? 'Disable Child Session Lock' : 'Enable Child Session Lock'}
              </button>

              <div className="button-row child-manage-actions">
                <button
                  type="button"
                  className="claim-button"
                  disabled={saving}
                  onClick={() => openDialog('add-child')}
                >
                  Add Child
                </button>
              </div>

              {childProfiles.length > 0 ? (
                <ul className="profile-list child-security-list">
                  {childProfiles.map((child) => (
                    <li key={child.id} className="profile-list-item child-security-item">
                      {editingChildId === child.id ? (
                        <div className="child-security-edit-grid">
                          <input
                            className="job-input"
                            value={editingChildName}
                            onChange={(event) => setEditingChildName(event.target.value)}
                            disabled={saving}
                            required
                          />
                          <select
                            className="job-input"
                            value={editingChildAvatar}
                            onChange={(event) => setEditingChildAvatar(event.target.value)}
                            disabled={saving}
                          >
                            {CHILD_AVATAR_OPTIONS.map((avatar) => (
                              <option key={`edit-avatar:${child.id}:${avatar}`} value={avatar}>
                                {avatar}
                              </option>
                            ))}
                          </select>
                          <div className="button-row child-manage-actions">
                            <button
                              type="button"
                              className="claim-button"
                              disabled={saving}
                              onClick={() => handleSaveChildProfile(child.id)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="text-button"
                              disabled={saving}
                              onClick={handleCancelEditChild}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="mission-main">
                            {child.avatar} {child.displayName}
                          </span>
                          <div className="button-row">
                            <span className="job-status-label">
                              {child.allowChildSetSessionCode
                                ? 'Child can set PIN'
                                : 'Child cannot set PIN'}
                            </span>
                            <span className="job-status-label">
                              {child.sessionCodeEnabled ? `PIN ${child.sessionCode}` : 'PIN not set'}
                            </span>
                            <button
                              type="button"
                              className="text-button"
                              disabled={saving}
                              onClick={() => handleStartEditChild(child)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={removeChildConfirmId === child.id ? 'claim-button claim-button-deny' : 'text-button'}
                              disabled={saving}
                              onClick={() => {
                                if (removeChildConfirmId === child.id) {
                                  handleRemoveChildProfile(child.id)
                                  return
                                }

                                setRemoveChildConfirmId(child.id)
                              }}
                            >
                              {removeChildConfirmId === child.id ? 'Confirm Remove' : 'Remove'}
                            </button>
                            <button
                              type="button"
                              className="claim-button"
                              disabled={saving}
                              onClick={() =>
                                handleToggleChildAllowSessionCode(
                                  child.id,
                                  !child.allowChildSetSessionCode,
                                )
                              }
                            >
                              {child.allowChildSetSessionCode
                                ? 'Block Child PIN Setup'
                                : 'Allow Child PIN Setup'}
                            </button>
                            <button
                              type="button"
                              className="claim-button"
                              disabled={saving || !child.sessionCodeEnabled}
                              onClick={() => handleClearChildPin(child.id)}
                            >
                              Clear PIN
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {!hasParentPin ? (
              <section className="panel">
                <p className="panel-label">Set Parent PIN</p>
                <p className="panel-muted">Add a 4-digit PIN for faster future unlocks.</p>
                <form className="auth-form" onSubmit={handleSavePin}>
                  <input
                    className="job-input"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    placeholder="New 4-digit PIN"
                    value={newPin}
                    onChange={(event) => setNewPin(event.target.value)}
                    required
                  />
                  <button type="submit" className="claim-button">
                    Save Parent PIN
                  </button>
                </form>
              </section>
            ) : null}

            {error ? <p className="status-note status-error">{error}</p> : null}

            <section className="panel">
              <p className="panel-label">Parent Account</p>
              <p className="panel-muted">Manage account access and credentials.</p>
              <div className="button-row">
                <button type="button" className="text-button" onClick={() => openDialog('settings')}>
                  Change Password
                </button>
                <button type="button" className="text-button" onClick={() => openDialog('settings')}>
                  Change Account Email
                </button>
                <button type="button" className="claim-button claim-button-deny" onClick={logout}>
                  Sign Out Parent
                </button>
              </div>
            </section>
          </>
        ) : null}

        {activeDialog ? (
          <section className="dialog-overlay" role="dialog" aria-modal="true">
            <div className="dialog-card panel">
              <div className="panel-head">
                <p className="panel-label">
                  {activeDialog === 'overview' ? 'Family Overview' : null}
                  {activeDialog === 'add-child' ? 'Add Child' : null}
                  {activeDialog === 'setup' ? 'Household Setup' : null}
                  {activeDialog === 'badges' ? 'Badges and Achievements' : null}
                  {activeDialog === 'requests' ? 'Pending Requests' : null}
                  {activeDialog === 'jobs' ? 'Jobs Manager' : null}
                  {activeDialog === 'rewards' ? 'Rewards Manager' : null}
                  {activeDialog === 'savings' ? 'Savings Goals' : null}
                  {activeDialog === 'settings' ? 'Parent Settings' : null}
                  {activeDialog === 'analytics' ? 'Analytics' : null}
                </p>
                <button type="button" className="text-button" onClick={closeDialog}>
                  Close
                </button>
              </div>

              {activeDialog === 'overview' ? (
                <div className="dialog-content">
                  <p className="panel-muted">Family: {familySummary.profileName || 'Not set'}</p>
                  <p className="panel-muted">Announcement: {familySummary.familyAnnouncement || 'No announcement posted'}</p>
                  <p className="panel-muted">Rules: {familySummary.familyRules || 'No rules yet'}</p>
                  <p className="panel-muted">
                    Dynamic pricing: {familySummary.dynamicPricingEnabled ? 'On' : 'Off'}
                  </p>
                  <p className="panel-muted">
                    Savings approvals: {
                      familySummary.savingsGoalApprovalMode === 'create_and_claim'
                        ? 'Parent approves create + claim'
                        : familySummary.savingsGoalApprovalMode === 'no_approval'
                          ? 'No parent approval'
                          : 'Parent approves claim only'
                    }
                  </p>
                  <p className="panel-muted">
                    Missed job consequence: {
                      familySummary.missedJobConsequenceEnabled
                        ? `On (${familySummary.missedJobPenaltyCredits} credit penalty)`
                        : 'Off'
                    }
                  </p>
                  {familySummary.missedJobConsequenceEnabled ? (
                    <p className="panel-muted">
                      Missed timing: {
                        familySummary.missedJobTimingEnabled
                          ? `Time-based (${familySummary.missedJobDefaultHours}h default)`
                          : 'Manual'
                      }
                    </p>
                  ) : null}
                  <p className="panel-muted">
                    Failed parent check consequence: {
                      familySummary.failedJobCheckConsequenceEnabled
                        ? `On (-${familySummary.failedJobCheckPenaltyCredits} credits)`
                        : 'Off'
                    }
                  </p>
                  <p className="panel-muted">
                    Pool job slots per child: {familySummary.maxActivePoolClaimsPerChild || 1}
                  </p>
                  <p className="panel-muted">
                    Pending checks count toward slots: {familySummary.allowClaimingWithPendingChecks ? 'No' : 'Yes'}
                  </p>
                  <p className="panel-muted">
                    Achievements: {familySummary.achievementsEnabled ? 'On' : 'Off'}
                  </p>
                  <p className="panel-muted">
                    Family recognition cards: {familySummary.familyRecognitionEnabled ? 'On' : 'Off'}
                  </p>
                  <p className="panel-muted">Children: {childProfiles.length}</p>
                </div>
              ) : null}

              {activeDialog === 'add-child' ? (
                <div className="dialog-content">
                  <form className="auth-form" onSubmit={handleAddChildProfile}>
                    <label className="form-field">
                      <span className="form-label">Child name</span>
                      <input
                        className="job-input"
                        placeholder="Child name"
                        value={newChildName}
                        onChange={(event) => setNewChildName(event.target.value)}
                        disabled={saving}
                        required
                      />
                    </label>
                    <label className="form-field">
                      <span className="form-label">Avatar</span>
                      <select
                        className="job-input"
                        value={newChildAvatar}
                        onChange={(event) => setNewChildAvatar(event.target.value)}
                        disabled={saving}
                      >
                        {CHILD_AVATAR_OPTIONS.map((avatar) => (
                          <option key={`add-dialog-avatar:${avatar}`} value={avatar}>
                            {avatar}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="button-row child-manage-actions">
                      <button type="submit" className="claim-button" disabled={saving}>
                        {saving ? 'Adding...' : 'Add Child'}
                      </button>
                      <button type="button" className="text-button" onClick={closeDialog} disabled={saving}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {activeDialog === 'setup' ? (
                <form className="auth-form dialog-content" onSubmit={handleSaveHousehold}>
                  <section className="dialog-section">
                    <p className="dialog-section-title">Household Identity</p>
                    <p className="dialog-section-subtitle">Name and Family News message shown across the app.</p>
                    <input
                      className="job-input"
                      placeholder="Family name"
                      value={householdName}
                      onChange={(event) => setHouseholdName(event.target.value)}
                      required
                    />
                    <MarkdownTextArea
                      placeholder="Family News message"
                      value={familyRules}
                      onChange={setFamilyRules}
                      rows={4}
                    />
                  </section>

                  <section className="dialog-section">
                    <p className="dialog-section-title">Savings Approvals</p>
                    <p className="dialog-section-subtitle">Control when a parent review is required for savings goals.</p>
                    <label className="form-field">
                      <span className="form-label">Savings goal parent approvals</span>
                      <select
                        className="job-input"
                        value={savingsGoalApprovalMode}
                        onChange={(event) => setSavingsGoalApprovalMode(event.target.value)}
                      >
                        <option value="claim_only">Approve claim only (recommended)</option>
                        <option value="create_and_claim">Approve create and claim</option>
                        <option value="no_approval">No parent approval</option>
                      </select>
                    </label>
                  </section>

                  <section className="dialog-section">
                    <p className="dialog-section-title">Consequences</p>
                    <p className="dialog-section-subtitle">Set what happens for missed jobs and denied parent checks.</p>

                    <label className="form-field">
                      <span className="form-label">Consequence preset</span>
                      <select
                        className="job-input"
                        value={getConsequencePreset()}
                        onChange={(event) => applyConsequencePreset(event.target.value)}
                      >
                        <option value="custom">Custom</option>
                        <option value="gentle">Gentle</option>
                        <option value="balanced">Balanced</option>
                        <option value="strict">Strict</option>
                      </select>
                      <p className="form-help">Presets apply starter values you can still edit.</p>
                    </label>

                    <details className="dialog-subsection" open>
                      <summary className="dialog-subsection-summary">Missed or timed-out job</summary>
                      <div className="dialog-subsection-body">
                        <label className="form-field">
                          <span className="form-label">Consequence for missed claimed jobs</span>
                          <select
                            className="job-input"
                            value={missedJobConsequenceEnabled ? 'on' : 'off'}
                            onChange={(event) => setMissedJobConsequenceEnabled(event.target.value === 'on')}
                          >
                            <option value="off">Off</option>
                            <option value="on">On</option>
                          </select>
                        </label>
                        {missedJobConsequenceEnabled ? (
                          <div className="dialog-nested-fields">
                            <label className="form-field">
                              <span className="form-label">Penalty credits when parent marks missed</span>
                              <input
                                className="job-input"
                                type="number"
                                min="0"
                                value={missedJobPenaltyCredits}
                                onChange={(event) => setMissedJobPenaltyCredits(event.target.value)}
                              />
                            </label>
                            {missedPenaltyValue >= 40 ? (
                              <p className="status-note">High penalty warning: this can feel harsh for younger kids.</p>
                            ) : null}
                            <label className="form-field">
                              <span className="form-label">Apply missed rule only after time window</span>
                              <select
                                className="job-input"
                                value={missedJobTimingEnabled ? 'on' : 'off'}
                                onChange={(event) => setMissedJobTimingEnabled(event.target.value === 'on')}
                              >
                                <option value="off">Off (parent decides anytime)</option>
                                <option value="on">On (time-based)</option>
                              </select>
                            </label>
                            {missedJobTimingEnabled ? (
                              <label className="form-field">
                                <span className="form-label">Default hours before a claimed job can be marked missed</span>
                                <input
                                  className="job-input"
                                  type="number"
                                  min="1"
                                  value={missedJobDefaultHours}
                                  onChange={(event) => setMissedJobDefaultHours(event.target.value)}
                                />
                              </label>
                            ) : null}
                            {missedJobTimingEnabled && missedHoursValue < 6 ? (
                              <p className="status-note">Short timer warning: less than 6 hours may cause frequent misses.</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </details>

                    <details className="dialog-subsection">
                      <summary className="dialog-subsection-summary">Parent denied job check</summary>
                      <div className="dialog-subsection-body">
                        <label className="form-field">
                          <span className="form-label">Consequence when parent denies a job check</span>
                          <select
                            className="job-input"
                            value={failedJobCheckConsequenceEnabled ? 'on' : 'off'}
                            onChange={(event) => setFailedJobCheckConsequenceEnabled(event.target.value === 'on')}
                          >
                            <option value="off">Off</option>
                            <option value="on">On</option>
                          </select>
                        </label>
                        {failedJobCheckConsequenceEnabled ? (
                          <label className="form-field">
                            <span className="form-label">Penalty credits when a job check is denied</span>
                            <input
                              className="job-input"
                              type="number"
                              min="0"
                              value={failedJobCheckPenaltyCredits}
                              onChange={(event) => setFailedJobCheckPenaltyCredits(event.target.value)}
                            />
                          </label>
                        ) : null}
                        {failedJobCheckConsequenceEnabled && failedCheckPenaltyValue >= 25 ? (
                          <p className="status-note">High penalty warning: consider a lower value before enabling this rule.</p>
                        ) : null}
                      </div>
                    </details>
                  </section>

                  <section className="dialog-section">
                    <p className="dialog-section-title">Job Flow Limits</p>
                    <p className="dialog-section-subtitle">Control how many pool jobs a child can work on at once.</p>
                    <details className="dialog-subsection" open>
                      <summary className="dialog-subsection-summary">Pool job claiming</summary>
                      <div className="dialog-subsection-body">
                        <label className="form-field">
                          <span className="form-label">Max active pool jobs per child</span>
                          <input
                            className="job-input"
                            type="number"
                            min="1"
                            value={maxActivePoolClaimsPerChild}
                            onChange={(event) => setMaxActivePoolClaimsPerChild(event.target.value)}
                          />
                          <p className="form-help">Example: 2 lets a child keep two pool jobs active at the same time.</p>
                        </label>
                        {maxPoolClaimsValue > 4 ? (
                          <p className="status-note">Large slot warning: high values reduce pacing and parent visibility.</p>
                        ) : null}
                        <label className="form-field">
                          <span className="form-label">When waiting for parent check, free up that slot</span>
                          <select
                            className="job-input"
                            value={allowClaimingWithPendingChecks ? 'yes' : 'no'}
                            onChange={(event) => setAllowClaimingWithPendingChecks(event.target.value === 'yes')}
                          >
                            <option value="no">No (still counts toward slot limit)</option>
                            <option value="yes">Yes (allow claiming another pool job)</option>
                          </select>
                        </label>
                      </div>
                    </details>
                  </section>

                  <section className="dialog-section">
                    <p className="dialog-section-title">Family Dashboard</p>
                    <p className="dialog-section-subtitle">Choose whether kids see competitive Top cards.</p>
                    <label className="form-field">
                      <span className="form-label">Show Top Earner/Spender cards</span>
                      <select
                        className="job-input"
                        value={familyDashboardTopCardsEnabled ? 'on' : 'off'}
                        onChange={(event) => setFamilyDashboardTopCardsEnabled(event.target.value === 'on')}
                      >
                        <option value="on">On (competitive mode)</option>
                        <option value="off">Off (simplified mode)</option>
                      </select>
                      <p className="form-help">Helpful for multi-child competition; often unnecessary for single-child homes.</p>
                    </label>
                  </section>

                  <section className="dialog-section">
                    <p className="dialog-section-title">Recognition and Achievements</p>
                    <p className="dialog-section-subtitle">Thresholds and custom badge builder moved to the dedicated Badges and Achievements dialog.</p>
                    <div className="button-row">
                      <button type="button" className="text-button" onClick={() => openDialog('badges')}>
                        Open Badges and Achievements
                      </button>
                    </div>
                  </section>

                  <section className="dialog-section">
                    <p className="dialog-section-title">Dynamic Pricing</p>
                    <p className="dialog-section-subtitle">Tune demand and scarcity for reward costs.</p>
                    <details className="dialog-subsection" open>
                      <summary className="dialog-subsection-summary">Pricing mode</summary>
                      <div className="dialog-subsection-body">
                        <label className="form-field">
                          <span className="form-label">Dynamic reward pricing</span>
                          <select
                            className="job-input"
                            value={dynamicPricingEnabled ? 'on' : 'off'}
                            onChange={(event) => setDynamicPricingEnabled(event.target.value === 'on')}
                          >
                            <option value="off">Off (fixed prices)</option>
                            <option value="on">On (supply and demand)</option>
                          </select>
                        </label>
                        {dynamicPricingEnabled ? (
                          <label className="form-field">
                            <span className="form-label">Pricing window</span>
                            <select
                              className="job-input"
                              value={dynamicPricingWindowPeriod}
                              onChange={(event) => setDynamicPricingWindowPeriod(event.target.value)}
                            >
                              <option value="day">Per day</option>
                              <option value="week">Per week</option>
                            </select>
                          </label>
                        ) : null}
                      </div>
                    </details>

                    <details className="dialog-subsection">
                      <summary className="dialog-subsection-summary">Advanced weights</summary>
                      <div className="dialog-subsection-body">
                        <p className="form-help">Used only when dynamic pricing is turned on.</p>
                        <label className="form-field">
                          <span className="form-label">Demand impact % per claim</span>
                          <input
                            className="job-input"
                            type="number"
                            min="0"
                            disabled={!dynamicPricingEnabled}
                            value={dynamicPricingDemandWeight}
                            onChange={(event) => setDynamicPricingDemandWeight(event.target.value)}
                          />
                        </label>
                        <label className="form-field">
                          <span className="form-label">Scarcity impact % near limit</span>
                          <input
                            className="job-input"
                            type="number"
                            min="0"
                            disabled={!dynamicPricingEnabled}
                            value={dynamicPricingScarcityWeight}
                            onChange={(event) => setDynamicPricingScarcityWeight(event.target.value)}
                          />
                        </label>
                        {dynamicPricingEnabled && (demandWeightValue > 120 || scarcityWeightValue > 150) ? (
                          <p className="status-note">Extreme pricing warning: large values can make rewards feel unpredictable.</p>
                        ) : null}
                      </div>
                    </details>
                  </section>

                  <button type="submit" className="claim-button" disabled={dialogBusy}>
                    Save household settings
                  </button>
                </form>
              ) : null}

              {activeDialog === 'requests' ? (
                <div className="dialog-content">
                  <section
                    id="requests-section-jobs"
                    className={
                      requestsJumpTarget === 'jobs'
                        ? 'dialog-section dialog-section-focus'
                        : 'dialog-section'
                    }
                  >
                    <p className="dialog-section-title">Job Check Requests</p>
                    {pendingJobCheckRequests.length === 0 ? (
                      <p className="panel-muted">No pending job check requests.</p>
                    ) : (
                      <ul className="mission-list">
                      {pendingJobCheckRequests.map((request) => {
                        const requestChild = childProfiles.find(
                          (profile) => profile.id === request.childId,
                        )
                        const childName = requestChild
                          ? `${requestChild.avatar} ${requestChild.displayName}`
                          : 'Child'

                        return (
                          <li key={`job:${request.id}`}>
                            <span className="mission-main">{request.jobTitle} ({childName})</span>
                            <span className="mission-reward">+ {request.points}</span>
                            <button
                              type="button"
                              className="claim-button"
                              disabled={dialogBusy || reviewingRequestId === `job:${request.id}`}
                              onClick={() => handleReviewJobCheckRequest(request.id, 'approved')}
                            >
                              {reviewingRequestId === `job:${request.id}` ? 'Working...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className="text-button"
                              disabled={dialogBusy || reviewingRequestId === `job:${request.id}`}
                              onClick={() => handleReviewJobCheckRequest(request.id, 'denied')}
                            >
                              Deny
                            </button>
                          </li>
                        )
                      })}
                      </ul>
                    )}
                  </section>

                  <section
                    id="requests-section-rewards"
                    className={
                      requestsJumpTarget === 'rewards'
                        ? 'dialog-section dialog-section-focus'
                        : 'dialog-section'
                    }
                  >
                    <p className="dialog-section-title">Reward Requests</p>
                    {pendingRewardRequests.length === 0 && counteredRewardRequests.length === 0 ? (
                      <p className="panel-muted">No pending reward requests.</p>
                    ) : (
                      <>
                        {pendingRewardRequests.length > 0 ? (
                          <ul className="mission-list">
                          {pendingRewardRequests.map((request) => {
                            const requestChild = childProfiles.find(
                              (profile) => profile.id === request.requestedBy,
                            )
                            const childName = requestChild
                              ? `${requestChild.avatar} ${requestChild.displayName}`
                              : 'Child'

                            return (
                              <li key={`reward:${request.id}`}>
                                <span className="mission-main">
                                  {request.rewardTitle} ({childName})
                                </span>
                                <span className="mission-reward">{request.cost}</span>
                                {request.childNote ? (
                                  <span className="job-status-label">Child note: {request.childNote}</span>
                                ) : null}
                                <input
                                  className="job-input"
                                  placeholder="Parent note (optional)"
                                  value={rewardReviewNotes[request.id] || ''}
                                  onChange={(event) => setRewardReviewNotes((current) => ({
                                    ...current,
                                    [request.id]: event.target.value,
                                  }))}
                                />
                                <button
                                  type="button"
                                  className="claim-button"
                                  disabled={dialogBusy || reviewingRequestId === `reward:${request.id}`}
                                  onClick={() => handleReviewRewardRequest(request.id, 'approved', {
                                    parentNote: rewardReviewNotes[request.id] || '',
                                  })}
                                >
                                  {reviewingRequestId === `reward:${request.id}` ? 'Working...' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  className="text-button"
                                  disabled={dialogBusy}
                                  onClick={() => {
                                    setCounterRewardRequestId(request.id)
                                    setCounterRewardTitle(request.rewardTitle || '')
                                    setCounterRewardCost(String(request.cost || ''))
                                  }}
                                >
                                  Counter
                                </button>
                                <button
                                  type="button"
                                  className="text-button"
                                  disabled={dialogBusy || reviewingRequestId === `reward:${request.id}`}
                                  onClick={() => handleReviewRewardRequest(request.id, 'denied', {
                                    parentNote: rewardReviewNotes[request.id] || '',
                                  })}
                                >
                                  Deny
                                </button>
                                {counterRewardRequestId === request.id ? (
                                  <div className="button-row" style={{ gridColumn: '1 / -1' }}>
                                    <input
                                      className="job-input"
                                      placeholder="Counter reward title"
                                      value={counterRewardTitle}
                                      onChange={(event) => setCounterRewardTitle(event.target.value)}
                                    />
                                    <input
                                      className="job-input"
                                      type="number"
                                      min="1"
                                      placeholder="Counter cost"
                                      value={counterRewardCost}
                                      onChange={(event) => setCounterRewardCost(event.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="claim-button"
                                      disabled={dialogBusy || reviewingRequestId === `reward:${request.id}`}
                                      onClick={() => handleCounterRewardRequest(request)}
                                    >
                                      {reviewingRequestId === `reward:${request.id}` ? 'Sending...' : 'Send Counter'}
                                    </button>
                                    <button
                                      type="button"
                                      className="text-button"
                                      disabled={dialogBusy}
                                      onClick={() => {
                                        setCounterRewardRequestId('')
                                        setCounterRewardTitle('')
                                        setCounterRewardCost('')
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : null}
                              </li>
                            )
                          })}
                          </ul>
                        ) : null}
                        {counteredRewardRequests.length > 0 ? (
                          <>
                            <p className="panel-muted">Waiting on child response</p>
                            <ul className="mission-list">
                              {counteredRewardRequests.map((request) => {
                                const requestChild = childProfiles.find(
                                  (profile) => profile.id === request.requestedBy,
                                )
                                const childName = requestChild
                                  ? `${requestChild.avatar} ${requestChild.displayName}`
                                  : 'Child'
                                return (
                                  <li key={`reward-countered:${request.id}`}>
                                    <span className="mission-main">
                                      {request.counterRewardTitle || request.rewardTitle} ({childName})
                                    </span>
                                    <span className="mission-reward">{request.counterCost || request.cost}</span>
                                    <span className="job-status-label">Waiting for child to accept or decline.</span>
                                  </li>
                                )
                              })}
                            </ul>
                          </>
                        ) : null}
                      </>
                    )}
                  </section>

                  <section className="dialog-section">
                    <p className="dialog-section-title">Approved Rewards Awaiting Fulfillment</p>
                    {approvedRewardRequests.length === 0 ? (
                      <p className="panel-muted">No approved rewards waiting for fulfillment.</p>
                    ) : (
                      <ul className="mission-list">
                        {approvedRewardRequests.map((request) => {
                          const requestChild = childProfiles.find(
                            (profile) => profile.id === request.requestedBy,
                          )
                          const childName = requestChild
                            ? `${requestChild.avatar} ${requestChild.displayName}`
                            : 'Child'

                          return (
                            <li key={`reward-approved:${request.id}`}>
                              <span className="mission-main">{request.rewardTitle} ({childName})</span>
                              <span className="mission-reward">{request.cost}</span>
                              {request.parentNote ? (
                                <span className="job-status-label">Parent note: {request.parentNote}</span>
                              ) : null}
                              <button
                                type="button"
                                className="claim-button"
                                disabled={dialogBusy || reviewingRequestId === `reward-fulfill:${request.id}`}
                                onClick={() => handleFulfillRewardRequest(request.id)}
                              >
                                {reviewingRequestId === `reward-fulfill:${request.id}` ? 'Saving...' : 'Mark Fulfilled'}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>

                  <section
                    id="requests-section-goals"
                    className={
                      requestsJumpTarget === 'goals'
                        ? 'dialog-section dialog-section-focus'
                        : 'dialog-section'
                    }
                  >
                    <p className="dialog-section-title">Child Requested Reward Goals</p>
                    <p className="dialog-section-subtitle">Includes new reward-goal requests and goals ready to claim.</p>
                    {pendingGoalRequests.length + pendingGoalApprovals.length === 0 ? (
                      <p className="panel-muted">No child reward-goal requests are waiting for review.</p>
                    ) : (
                      <ul className="mission-list">
                      {[...pendingGoalRequests, ...pendingGoalApprovals].map((goal) => {
                        const requestChild = childProfiles.find(
                          (profile) => profile.id === goal.childId,
                        )
                        const childName = requestChild
                          ? `${requestChild.avatar} ${requestChild.displayName}`
                          : 'Child'
                        const isReadyToClaim = goal.status === 'ready_to_claim'

                        return (
                          <li key={`goal-request:${goal.id}`}>
                            <span className="mission-main">
                              {goal.rewardTitle ? `🎁 ${goal.rewardTitle}` : goal.name} — {childName}
                            </span>
                            <span className="job-status-label">
                              {isReadyToClaim ? 'Ready to claim' : 'Needs setup approval'}
                            </span>
                            {isReadyToClaim ? (
                              <span className="mission-reward">
                                {goal.saved}/{goal.target}
                              </span>
                            ) : null}
                            {isReadyToClaim ? (
                              <button
                                type="button"
                                className="claim-button"
                                disabled={dialogBusy || reviewingRequestId === `goal:${goal.id}`}
                                onClick={() => handleApproveGoalCompletion(goal.id)}
                              >
                                {reviewingRequestId === `goal:${goal.id}` ? 'Working...' : 'Approve Goal'}
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="claim-button"
                                  disabled={dialogBusy || reviewingRequestId === `goal-request:${goal.id}`}
                                  onClick={() => handleReviewGoalRequest(goal.id, 'approved')}
                                >
                                  {reviewingRequestId === `goal-request:${goal.id}` ? 'Working...' : 'Approve Goal'}
                                </button>
                                <button
                                  type="button"
                                  className="text-button"
                                  disabled={dialogBusy}
                                  onClick={() => {
                                    setCounterGoalId(goal.id)
                                    setCounterGoalTarget(String(goal.target || ''))
                                    setCounterGoalNote(goal.counterNote || '')
                                  }}
                                >
                                  Counter
                                </button>
                                <button
                                  type="button"
                                  className="text-button"
                                  disabled={dialogBusy || reviewingRequestId === `goal-request:${goal.id}`}
                                  onClick={() => handleReviewGoalRequest(goal.id, 'denied')}
                                >
                                  Deny
                                </button>
                                {counterGoalId === goal.id ? (
                                  <div className="button-row" style={{ gridColumn: '1 / -1' }}>
                                    <input
                                      className="job-input"
                                      type="number"
                                      min="1"
                                      placeholder="Counter target"
                                      value={counterGoalTarget}
                                      onChange={(event) => setCounterGoalTarget(event.target.value)}
                                    />
                                    <input
                                      className="job-input"
                                      placeholder="Optional note for kid"
                                      value={counterGoalNote}
                                      onChange={(event) => setCounterGoalNote(event.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="claim-button"
                                      disabled={dialogBusy || reviewingRequestId === `goal-request-counter:${goal.id}`}
                                      onClick={() => handleCounterGoalRequest(goal)}
                                    >
                                      {reviewingRequestId === `goal-request-counter:${goal.id}` ? 'Sending...' : 'Send Counter Offer'}
                                    </button>
                                    <button
                                      type="button"
                                      className="text-button"
                                      disabled={dialogBusy}
                                      onClick={() => {
                                        setCounterGoalId('')
                                        setCounterGoalTarget('')
                                        setCounterGoalNote('')
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : null}
                              </>
                            )}
                          </li>
                        )
                      })}
                      </ul>
                    )}
                  </section>
                </div>
              ) : null}

              {activeDialog === 'badges' ? (
                <div className="dialog-content">
                  <form className="auth-form" onSubmit={handleSaveBadgeSettings}>
                    <section className="dialog-section">
                      <p className="dialog-section-title">Display Controls</p>
                      <p className="dialog-section-subtitle">Choose where badges show up.</p>
                      <label className="form-field">
                        <span className="form-label">Show kid achievements</span>
                        <select
                          className="job-input"
                          value={achievementsEnabled ? 'on' : 'off'}
                          onChange={(event) => setAchievementsEnabled(event.target.value === 'on')}
                        >
                          <option value="on">On</option>
                          <option value="off">Off</option>
                        </select>
                      </label>
                      <label className="form-field">
                        <span className="form-label">Show family recognition cards</span>
                        <select
                          className="job-input"
                          value={familyRecognitionEnabled ? 'on' : 'off'}
                          onChange={(event) => setFamilyRecognitionEnabled(event.target.value === 'on')}
                        >
                          <option value="on">On</option>
                          <option value="off">Off</option>
                        </select>
                      </label>
                    </section>

                    <section className="dialog-section">
                      <p className="dialog-section-title">Built-in Badge Thresholds</p>
                      <p className="dialog-section-subtitle">Adjust defaults for built-in badges.</p>
                      <label className="form-field">
                        <span className="form-label">First Goal target</span>
                        <input
                          className="job-input"
                          type="number"
                          min="1"
                          value={achievementFirstGoalTarget}
                          onChange={(event) => setAchievementFirstGoalTarget(event.target.value)}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">Contributor target (credits earned)</span>
                        <input
                          className="job-input"
                          type="number"
                          min="1"
                          value={achievementContributorCreditsTarget}
                          onChange={(event) => setAchievementContributorCreditsTarget(event.target.value)}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">Helper target (helper-tagged jobs)</span>
                        <input
                          className="job-input"
                          type="number"
                          min="1"
                          value={achievementHelperJobsTarget}
                          onChange={(event) => setAchievementHelperJobsTarget(event.target.value)}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">Reading target (reading-tagged jobs)</span>
                        <input
                          className="job-input"
                          type="number"
                          min="1"
                          value={achievementReadingJobsTarget}
                          onChange={(event) => setAchievementReadingJobsTarget(event.target.value)}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">Streak target (days)</span>
                        <input
                          className="job-input"
                          type="number"
                          min="1"
                          value={recognitionStreakDaysTarget}
                          onChange={(event) => setRecognitionStreakDaysTarget(event.target.value)}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">Helping Hand target</span>
                        <input
                          className="job-input"
                          type="number"
                          min="1"
                          value={recognitionHelpingHandJobsTarget}
                          onChange={(event) => setRecognitionHelpingHandJobsTarget(event.target.value)}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">Goal Getter target</span>
                        <input
                          className="job-input"
                          type="number"
                          min="1"
                          value={recognitionGoalGetterTarget}
                          onChange={(event) => setRecognitionGoalGetterTarget(event.target.value)}
                        />
                      </label>
                    </section>

                    <section className="dialog-section">
                      <p className="dialog-section-title">Custom Badge Builder</p>
                      <p className="dialog-section-subtitle">Create your own achievement or recognition badges.</p>
                      <label className="form-field">
                        <span className="form-label">Badge label</span>
                        <input
                          className="job-input"
                          placeholder="Ex: Weekend Warrior"
                          value={customBadgeLabel}
                          onChange={(event) => setCustomBadgeLabel(event.target.value)}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">Icon</span>
                        <input
                          className="job-input"
                          placeholder="🏅"
                          value={customBadgeIcon}
                          onChange={(event) => setCustomBadgeIcon(event.target.value)}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">Category</span>
                        <select
                          className="job-input"
                          value={customBadgeCategory}
                          onChange={(event) => setCustomBadgeCategory(event.target.value)}
                        >
                          <option value="achievement">Achievement</option>
                          <option value="recognition">Recognition</option>
                        </select>
                      </label>
                      <label className="form-field">
                        <span className="form-label">Track metric</span>
                        <select
                          className="job-input"
                          value={customBadgeMetric}
                          onChange={(event) => setCustomBadgeMetric(event.target.value)}
                        >
                          <option value="completed_goals">Completed goals</option>
                          <option value="contribution_credits">Contribution credits</option>
                          <option value="helper_jobs">Helper jobs</option>
                          <option value="reading_jobs">Reading jobs</option>
                          <option value="streak_days">Streak days</option>
                        </select>
                      </label>
                      <label className="form-field">
                        <span className="form-label">Target</span>
                        <input
                          className="job-input"
                          type="number"
                          min="1"
                          value={customBadgeTarget}
                          onChange={(event) => setCustomBadgeTarget(event.target.value)}
                        />
                      </label>
                      <div className="button-row">
                        <button type="button" className="text-button" onClick={handleAddCustomBadge}>
                          Add custom badge
                        </button>
                      </div>

                      {customBadges.length > 0 ? (
                        <ul className="profile-list">
                          {customBadges.map((badge) => (
                            <li key={badge.id} className="profile-list-item">
                              <span>{badge.icon} {badge.label}</span>
                              <span className="job-status-label">{badge.category}</span>
                              <span className="job-status-label">{customBadgeMetricLabel(badge.metric)}: {badge.target}</span>
                              <button
                                type="button"
                                className="text-button"
                                onClick={() => handleRemoveCustomBadge(badge.id)}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="panel-muted">No custom badges yet.</p>
                      )}
                    </section>

                    <div className="button-row">
                      <button type="submit" className="claim-button" disabled={dialogBusy}>
                        {dialogBusy ? 'Saving...' : 'Save Badge Settings'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {activeDialog === 'jobs' ? (
                <div className="dialog-content">
                  <form className="auth-form dialog-section" onSubmit={handleCreateJob}>
                    <p className="dialog-section-title">Create or Edit Job</p>
                    <p className="dialog-section-subtitle">Set assignment, cadence, and optional limits in one place.</p>
                    <label className="form-field">
                      <span className="form-label">Apply to</span>
                      <select
                        className="job-input"
                        value={jobScopeChildId}
                        onChange={(event) => setJobScopeChildId(event.target.value)}
                      >
                        <option value="">Global pool (all kids)</option>
                        {childProfiles.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.avatar} {child.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <input
                      className="job-input"
                      placeholder="Job title"
                      value={jobTitle}
                      onChange={(event) => setJobTitle(event.target.value)}
                      required
                    />
                    <label className="form-field">
                      <span className="form-label">Reward type</span>
                      <select
                        className="job-input"
                        value={jobRewardType}
                        onChange={(event) => setJobRewardType(event.target.value)}
                      >
                        <option value="credits">Credits</option>
                        <option value="xp">XP</option>
                      </select>
                    </label>
                    <input
                      className="job-input"
                      type="number"
                      min="1"
                      placeholder={jobRewardType === 'xp' ? 'XP amount' : 'Credits amount'}
                      value={jobPoints}
                      onChange={(event) => setJobPoints(event.target.value)}
                      required
                    />
                    <label className="form-field">
                      <span className="form-label">Recurrence frequency</span>
                      <select
                        className="job-input"
                        value={jobRecurrenceFrequency}
                        onChange={(event) => setJobRecurrenceFrequency(event.target.value)}
                      >
                        <option value="none">One-time only</option>
                        <option value="daily">Every day</option>
                        <option value="weekly">Every week</option>
                      </select>
                    </label>
                    {jobRecurrenceFrequency === 'daily' ? (
                      <p className="panel-muted">This job can be completed once each day.</p>
                    ) : null}
                    {jobRecurrenceFrequency === 'weekly' ? (
                      <p className="panel-muted">This job can be completed once each week.</p>
                    ) : null}
                    <label className="form-field">
                      <span className="form-label">Per-child claim limit (optional)</span>
                      <p className="form-help">How often one child can claim this same job.</p>
                      <p className="form-help">Example: 2 per week means each child can complete it twice weekly.</p>
                      <div className="job-form">
                        <input
                          className="job-input"
                          type="number"
                          min="0"
                          placeholder="Count"
                          value={jobLimitCount}
                          onChange={(event) => setJobLimitCount(event.target.value)}
                        />
                        <select
                          className="job-input"
                          value={jobLimitPeriod}
                          onChange={(event) => setJobLimitPeriod(event.target.value)}
                          disabled={!jobLimitCount || Number(jobLimitCount) <= 0}
                        >
                          <option value="day">per day</option>
                          <option value="week">per week</option>
                        </select>
                      </div>
                    </label>
                    <label className="form-field">
                      <span className="form-label">Family-wide total limit (optional)</span>
                      <p className="form-help">How often all children combined can claim this job.</p>
                      <p className="form-help">Example: 3 per week means the whole household can complete it three times total.</p>
                      <div className="job-form">
                        <input
                          className="job-input"
                          type="number"
                          min="0"
                          placeholder="Count"
                          value={jobFamilyLimitCount}
                          onChange={(event) => setJobFamilyLimitCount(event.target.value)}
                        />
                        <select
                          className="job-input"
                          value={jobFamilyLimitPeriod}
                          onChange={(event) => setJobFamilyLimitPeriod(event.target.value)}
                          disabled={!jobFamilyLimitCount || Number(jobFamilyLimitCount) <= 0}
                        >
                          <option value="day">per day</option>
                          <option value="week">per week</option>
                        </select>
                      </div>
                    </label>
                    <label className="form-field">
                      <span className="form-label">Missed timeout override (hours, optional)</span>
                      <input
                        className="job-input"
                        type="number"
                        min="1"
                        placeholder={
                          missedJobTimingEnabled
                            ? `Family default ${Number(missedJobDefaultHours) || 24}h`
                            : 'Uses family setting when enabled'
                        }
                        value={jobMissedAfterHours}
                        onChange={(event) => setJobMissedAfterHours(event.target.value)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="form-label">Badge contribution tag</span>
                      <select
                        className="job-input"
                        value={jobBadgeContribution}
                        onChange={(event) => setJobBadgeContribution(event.target.value)}
                      >
                        <option value="none">None</option>
                        <option value="helper">Helper</option>
                        <option value="reading">Reading</option>
                      </select>
                      <p className="form-help">Tagged jobs feed achievement and recognition counts for kids.</p>
                    </label>
                    <div className="button-row">
                      <button type="submit" className="claim-button" disabled={dialogBusy}>
                        {editingJobId ? 'Save job' : 'Add job'}
                      </button>
                      {editingJobId ? (
                        <button type="button" className="text-button" onClick={cancelEditJob}>
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </form>

                  <section className="dialog-section">
                    <p className="dialog-section-title">Current Jobs</p>
                    <ul className="mission-list">
                    {jobs
                      .filter((job) =>
                        jobScopeChildId ? job.childId === jobScopeChildId : !job.childId,
                      )
                      .map((job) => (
                      <li key={job.id || job.title}>
                        <span className="mission-main">{job.title}</span>
                        <span className="mission-reward">{formatJobReward(job)}</span>
                        <span className="job-status-label">{job.status || 'open'}</span>
                        <span className="job-status-label">
                          {job.autoRecreate ? 'Recurring' : 'One-time'}
                        </span>
                        <span className="job-status-label">
                          {job.claimLimitCount > 0 && job.claimLimitPeriod
                            ? `Per-child ${job.claimLimitCount}/${job.claimLimitPeriod}`
                            : 'Per-child uncapped'}
                        </span>
                        <span className="job-status-label">
                          {job.familyClaimLimitCount > 0 && job.familyClaimLimitPeriod
                            ? `Family total ${job.familyClaimLimitCount}/${job.familyClaimLimitPeriod}`
                            : 'Family uncapped'}
                        </span>
                        <span className="job-status-label">
                          {job.missedAfterHours > 0
                            ? `Missed after ${job.missedAfterHours}h`
                            : 'Missed timeout: family default'}
                        </span>
                        <span className="job-status-label">
                          Badge tag: {job.badgeContribution === 'helper'
                            ? 'Helper'
                            : job.badgeContribution === 'reading'
                              ? 'Reading'
                              : 'None'}
                        </span>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => startEditJob(job)}
                        >
                          Edit
                        </button>
                        {job.status === 'claimed' ? (
                          <button
                            type="button"
                            className="text-button"
                            disabled={dialogBusy || markingMissedJobId === job.id}
                            onClick={() => handleMarkJobMissed(job.id)}
                          >
                            {markingMissedJobId === job.id
                              ? 'Marking...'
                              : familySummary.missedJobConsequenceEnabled
                                ? familySummary.missedJobTimingEnabled
                                  ? `Mark missed if due (-${familySummary.missedJobPenaltyCredits})`
                                  : `Mark missed (-${familySummary.missedJobPenaltyCredits})`
                                : 'Mark missed'}
                          </button>
                        ) : null}
                      </li>
                      ))}
                    </ul>
                  </section>
                </div>
              ) : null}

              {activeDialog === 'rewards' ? (
                <div className="dialog-content">
                  <form className="auth-form" onSubmit={handleCreateReward}>
                    <label className="form-field">
                      <span className="form-label">Apply to</span>
                      <select
                        className="job-input"
                        value={rewardScopeChildId}
                        onChange={(event) => setRewardScopeChildId(event.target.value)}
                      >
                        <option value="">Global pool (all kids)</option>
                        {childProfiles.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.avatar} {child.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <input
                      className="job-input"
                      placeholder="Reward title"
                      value={rewardTitle}
                      onChange={(event) => setRewardTitle(event.target.value)}
                      required
                    />
                    <input
                      className="job-input"
                      type="number"
                      min="1"
                      placeholder="Cost"
                      value={rewardCost}
                      onChange={(event) => setRewardCost(event.target.value)}
                      required
                    />
                    <label className="form-field">
                      <span className="form-label">Recurrence frequency</span>
                      <select
                        className="job-input"
                        value={rewardRecurrenceFrequency}
                        onChange={(event) => setRewardRecurrenceFrequency(event.target.value)}
                      >
                        <option value="once">One-time only</option>
                        <option value="daily">Every day</option>
                        <option value="weekly">Every week</option>
                        <option value="custom">Custom claim limit</option>
                      </select>
                    </label>
                    {rewardRecurrenceFrequency === 'daily' ? (
                      <p className="panel-muted">This reward can be requested once each day.</p>
                    ) : null}
                    {rewardRecurrenceFrequency === 'weekly' ? (
                      <p className="panel-muted">This reward can be requested once each week.</p>
                    ) : null}
                    {rewardRecurrenceFrequency === 'custom' ? (
                      <label className="form-field">
                        <span className="form-label">Per-child request limit (custom)</span>
                        <p className="form-help">How often one child can request this reward.</p>
                        <p className="form-help">Example: 1 per day means each child can request it once daily.</p>
                        <div className="job-form">
                          <input
                            className="job-input"
                            type="number"
                            min="0"
                            placeholder="Count"
                            value={rewardLimitCount}
                            onChange={(event) => setRewardLimitCount(event.target.value)}
                          />
                          <select
                            className="job-input"
                            value={rewardLimitPeriod}
                            onChange={(event) => setRewardLimitPeriod(event.target.value)}
                            disabled={!rewardLimitCount || Number(rewardLimitCount) <= 0}
                          >
                            <option value="day">per day</option>
                            <option value="week">per week</option>
                          </select>
                        </div>
                      </label>
                    ) : null}
                    <label className="form-field">
                      <span className="form-label">Family-wide total limit (optional)</span>
                      <p className="form-help">How often all children combined can request this reward.</p>
                      <p className="form-help">Example: 2 per week means all children together can request it twice.</p>
                      <div className="job-form">
                        <input
                          className="job-input"
                          type="number"
                          min="0"
                          placeholder="Count"
                          value={rewardFamilyLimitCount}
                          onChange={(event) => setRewardFamilyLimitCount(event.target.value)}
                        />
                        <select
                          className="job-input"
                          value={rewardFamilyLimitPeriod}
                          onChange={(event) => setRewardFamilyLimitPeriod(event.target.value)}
                          disabled={!rewardFamilyLimitCount || Number(rewardFamilyLimitCount) <= 0}
                        >
                          <option value="day">per day</option>
                          <option value="week">per week</option>
                        </select>
                      </div>
                    </label>
                    <div className="button-row">
                      <button type="submit" className="claim-button" disabled={dialogBusy}>
                        {editingRewardId ? 'Save reward' : 'Add reward'}
                      </button>
                      {editingRewardId ? (
                        <button
                          type="button"
                          className="text-button"
                          onClick={cancelEditReward}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </form>
                  <ul className="mission-list">
                    {rewards
                      .filter((reward) =>
                        rewardScopeChildId
                          ? reward.childId === rewardScopeChildId
                          : !reward.childId,
                      )
                      .map((reward) => (
                      <li key={reward.id}>
                        <span className="mission-main">{reward.title}</span>
                        <span className="mission-reward">{reward.cost}</span>
                        <span className="job-status-label">
                          {reward.repeatMode === 'once' ? 'One-time' : 'Recurring'}
                        </span>
                        <span className="job-status-label">
                          {reward.claimLimitCount > 0 && reward.claimLimitPeriod
                            ? `Per-child ${reward.claimLimitCount}/${reward.claimLimitPeriod}`
                            : 'Per-child uncapped'}
                        </span>
                        <span className="job-status-label">
                          {reward.familyClaimLimitCount > 0 && reward.familyClaimLimitPeriod
                            ? `Family total ${reward.familyClaimLimitCount}/${reward.familyClaimLimitPeriod}`
                            : 'Family uncapped'}
                        </span>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => startEditReward(reward)}
                        >
                          Edit
                        </button>
                      </li>
                      ))}
                  </ul>
                </div>
              ) : null}

              {activeDialog === 'savings' ? (
                <div className="dialog-content">
                  <form className="auth-form" onSubmit={handleCreateSavingsGoal}>
                    <section className="dialog-section">
                      <p className="dialog-section-title">Create Savings Goal</p>
                      <p className="dialog-section-subtitle">
                        Set a shared family goal or assign the goal to a child.
                      </p>
                      <input
                        className="job-input"
                        placeholder="Goal name"
                        value={savingsGoalName}
                        onChange={(event) => setSavingsGoalName(event.target.value)}
                        required
                      />
                      <input
                        className="job-input"
                        type="number"
                        min="1"
                        placeholder="Target credits"
                        value={savingsGoalTarget}
                        onChange={(event) => setSavingsGoalTarget(event.target.value)}
                        required
                      />
                      <label className="form-field">
                        <span className="form-label">Goal scope</span>
                        <select
                          className="job-input"
                          value={savingsGoalScope}
                          onChange={(event) => setSavingsGoalScope(event.target.value)}
                        >
                          <option value="family">Whole family</option>
                          {childProfiles.map((child) => (
                            <option key={child.id} value={child.id}>
                              {child.avatar} {child.displayName}
                            </option>
                          ))}
                        </select>
                        <p className="form-help">
                          Family goals appear on Home for everyone to contribute toward.
                        </p>
                      </label>
                    </section>

                    {goals.length > 0 ? (
                      <section className="dialog-section">
                        <p className="dialog-section-title">Current Savings Goals</p>
                        <ul className="mission-list">
                          {goals
                            .slice()
                            .sort((left, right) => {
                              const leftUpdatedAt = toDateValue(left.updatedAt)?.getTime() || 0
                              const rightUpdatedAt = toDateValue(right.updatedAt)?.getTime() || 0
                              return rightUpdatedAt - leftUpdatedAt
                            })
                            .slice(0, 6)
                            .map((goal) => {
                              const goalChild = childProfiles.find((child) => child.id === goal.childId)

                              return (
                                <li key={goal.id}>
                                  <span className="mission-main">
                                    {goal.rewardId ? '🎁' : '🎯'} {goal.rewardTitle || goal.name}
                                  </span>
                                  <span className="job-status-label">
                                    {goal.childId
                                      ? `${goalChild?.avatar || '🧒'} ${goalChild?.displayName || 'Child'}`
                                      : 'Family goal'}
                                  </span>
                                  <span className="mission-reward">
                                    {goal.saved}/{goal.target}
                                  </span>
                                </li>
                              )
                            })}
                        </ul>
                      </section>
                    ) : null}

                    {error ? <p className="status-note status-error">{error}</p> : null}

                    <button type="submit" className="claim-button" disabled={dialogBusy}>
                      {dialogBusy ? 'Saving...' : 'Create Goal'}
                    </button>
                  </form>
                </div>
              ) : null}

              {activeDialog === 'settings' ? (
                <div className="dialog-content">
                  <p className="panel-label">Account</p>
                  <p className="panel-muted">{displayName || 'Parent account'}</p>
                  <p className="panel-muted">{userEmail}</p>
                  <p className="panel-muted">Family: {familyId}</p>

                  <p className="panel-label">Feedback</p>
                  <p className="panel-muted">Share notes, issues, or ideas for improving the app.</p>
                  <form className="auth-form" onSubmit={handleSubmitFeedback}>
                    <label className="form-field">
                      <span className="form-label">Category</span>
                      <select
                        className="job-input"
                        value={feedbackCategory}
                        onChange={(event) => setFeedbackCategory(event.target.value)}
                      >
                        <option value="general">General</option>
                        <option value="bug">Bug</option>
                        <option value="idea">Idea</option>
                        <option value="confusing">Confusing</option>
                      </select>
                    </label>
                    <textarea
                      className="job-input form-textarea"
                      placeholder="What should we improve?"
                      value={feedbackMessage}
                      onChange={(event) => setFeedbackMessage(event.target.value)}
                      rows="4"
                      required
                    />
                    <button type="submit" className="claim-button" disabled={feedbackBusy}>
                      {feedbackBusy ? 'Sending...' : 'Send feedback'}
                    </button>
                  </form>
                  {feedbackEntries.length === 0 ? (
                    <p className="panel-muted">No feedback captured yet.</p>
                  ) : (
                    <ul className="profile-list">
                      {feedbackEntries.slice(0, 5).map((entry) => (
                        <li key={entry.id} className="profile-list-item">
                          <span className="mission-main">{entry.category || 'general'}</span>
                          <span className="job-status-label">{entry.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {activeDialog === 'analytics' ? (
                <div className="dialog-content">
                  <section className="dialog-section">
                    <p className="dialog-section-title">Family Analytics</p>
                    <p className="dialog-section-subtitle">
                      Family-specific audit tools are visible to every parent.
                    </p>

                    <details className="dialog-subsection" open>
                      <summary className="dialog-subsection-summary">Consequence Summary</summary>
                      <div className="dialog-subsection-body">
                        <p className="panel-muted">
                          This week: {thisWeekConsequenceEvents.length} events ({thisWeekConsequenceEvents.length - lastWeekConsequenceEvents.length >= 0 ? '+' : ''}
                          {thisWeekConsequenceEvents.length - lastWeekConsequenceEvents.length} vs last week)
                        </p>
                        <p className="panel-muted">
                          Penalty credits: {thisWeekPenaltyTotal} ({thisWeekPenaltyTotal - lastWeekPenaltyTotal >= 0 ? '+' : ''}
                          {thisWeekPenaltyTotal - lastWeekPenaltyTotal} vs last week)
                        </p>
                        <p className="panel-muted">
                          Missed jobs: {thisWeekMissedCount} ({thisWeekMissedCount - lastWeekMissedCount >= 0 ? '+' : ''}
                          {thisWeekMissedCount - lastWeekMissedCount} vs last week)
                        </p>
                        <p className="panel-muted">
                          Denied checks: {thisWeekDeniedCount} ({thisWeekDeniedCount - lastWeekDeniedCount >= 0 ? '+' : ''}
                          {thisWeekDeniedCount - lastWeekDeniedCount} vs last week)
                        </p>
                      </div>
                    </details>

                    <details className="dialog-subsection" open>
                      <summary className="dialog-subsection-summary">Deeper Family Insights</summary>
                      <div className="dialog-subsection-body">
                        <div className="family-insight-grid">
                          <article className="family-insight-card">
                            <small>Most Missed Jobs (7d)</small>
                            {mostMissedJobs.length === 0 ? (
                              <p className="panel-muted">No missed-job events this week.</p>
                            ) : (
                              <ul className="family-insight-list">
                                {mostMissedJobs.map((job) => (
                                  <li key={job.title}>
                                    <span>{job.title}</span>
                                    <strong>{job.count}</strong>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </article>

                          <article className="family-insight-card">
                            <small>Denied Check Trend (7d)</small>
                            <strong>{deniedChecksThisWeek.length} denied</strong>
                            <span className="family-insight-note">
                              {deniedChecksThisWeek.length - deniedChecksLastWeek.length >= 0 ? '+' : ''}
                              {deniedChecksThisWeek.length - deniedChecksLastWeek.length} vs last week
                            </span>
                            <span className="family-insight-note">
                              {deniedPenaltyThisWeek} credits penalized ({deniedPenaltyThisWeek - deniedPenaltyLastWeek >= 0 ? '+' : ''}
                              {deniedPenaltyThisWeek - deniedPenaltyLastWeek} vs last week)
                            </span>
                          </article>

                          <article className="family-insight-card">
                            <small>Reward Demand Pressure</small>
                            {dynamicPressureRewards.length === 0 ? (
                              <p className="panel-muted">No dynamic-pricing uplifts active.</p>
                            ) : (
                              <ul className="family-insight-list">
                                {dynamicPressureRewards.map((reward) => (
                                  <li key={reward.id}>
                                    <span>{reward.title}</span>
                                    <strong>+{reward.upliftPct}%</strong>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </article>

                          <article className="family-insight-card">
                            <small>Parent Review Throughput</small>
                            <strong>{avgReviewHours === null ? 'No reviews yet' : `${formatHours(avgReviewHours)} avg`}</strong>
                            <span className="family-insight-note">
                              {reviewedChecks.length} checks reviewed this week
                            </span>
                            <span className="family-insight-note">
                              {pendingChecks.length} pending checks ({stalePendingChecks.length} older than 24h)
                            </span>
                            <span className="family-insight-note">
                              {pendingRewardRequestsAnalytics.length} pending reward requests
                            </span>
                          </article>
                        </div>
                      </div>
                    </details>

                    <details className="dialog-subsection" open>
                      <summary className="dialog-subsection-summary">Reward Demand Patterns</summary>
                      <div className="dialog-subsection-body">
                        <p className="panel-muted">
                          Rewards that get claimed most often, plus the child who claims each one the most.
                        </p>
                        {rewardDemandRows.length === 0 ? (
                          <p className="panel-muted">No approved reward purchases yet.</p>
                        ) : (
                          <ul className="mission-list">
                            {rewardDemandRows.map((reward) => (
                              <li key={`reward-demand:${reward.title}`}>
                                <span className="mission-main">🎁 {reward.title}</span>
                                <span className="mission-reward">{reward.count} claims</span>
                                <span className="job-status-label">
                                  Top claimant: {reward.claimantLabel}
                                </span>
                                <span className="job-status-label">
                                  {reward.claimantCount}x | {reward.claimantTotal} kids
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </details>

                    <details className="dialog-subsection" open>
                      <summary className="dialog-subsection-summary">Celebration Timeline</summary>
                      <div className="dialog-subsection-body">
                        <p className="panel-muted">
                          This week: {thisWeekCelebrationEvents.length} celebration moments.
                        </p>
                        <div className="limit-chip-row">
                          <span className="limit-chip">Jobs done: {celebrationCounts.job_done || 0}</span>
                          <span className="limit-chip">Rewards approved: {celebrationCounts.reward_approved || 0}</span>
                          <span className="limit-chip">Rewards fulfilled: {celebrationCounts.reward_fulfilled || 0}</span>
                          <span className="limit-chip">Goals completed: {celebrationCounts.goal_completed || 0}</span>
                        </div>
                        {recentCelebrationEvents.length === 0 ? (
                          <p className="panel-muted">No celebration events yet.</p>
                        ) : (
                          <ul className="profile-list">
                            {recentCelebrationEvents.map((entry) => (
                              <li key={entry.id} className="profile-list-item">
                                <span className="mission-main">{entry.icon} {entry.title}</span>
                                <span className="job-status-label">
                                  {childNameById[entry.childId] || 'Family'} | {entry.credits > 0 ? `${entry.type.includes('reward') ? '-' : '+'}${entry.credits}` : 'No credit change'} | {formatDateTime(entry.at)}
                                </span>
                                <button
                                  type="button"
                                  className="text-button"
                                  onClick={() => handleCelebrationAction(entry)}
                                >
                                  {entry.type === 'job_done'
                                    ? 'Open Jobs'
                                    : entry.type === 'reward_approved' || entry.type === 'reward_fulfilled'
                                      ? 'Open Rewards Queue'
                                      : 'Open Savings Queue'}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </details>

                    <details className="dialog-subsection" open>
                      <summary className="dialog-subsection-summary">Top Jobs This Week</summary>
                      <div className="dialog-subsection-body">
                        {topConsequenceJobs.length === 0 ? (
                          <p className="panel-muted">No consequence events recorded this week.</p>
                        ) : (
                          <ul className="profile-list">
                            {topConsequenceJobs.map((job) => (
                              <li key={`creator-job:${job.title}`} className="profile-list-item">
                                <span className="mission-main">{job.title}</span>
                                <span className="job-status-label">{job.count} events</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </details>

                    <details className="dialog-subsection">
                      <summary className="dialog-subsection-summary">By Child This Week</summary>
                      <div className="dialog-subsection-body">
                        {consequenceByChild.length === 0 ? (
                          <p className="panel-muted">No child consequence entries in the current week window.</p>
                        ) : (
                          <ul className="profile-list">
                            {consequenceByChild.map((entry) => (
                              <li key={`creator-child:${entry.childId}`} className="profile-list-item">
                                <span className="mission-main">{entry.childLabel}</span>
                                <span className="job-status-label">{entry.count} events, -{entry.penaltyCredits} credits</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </details>

                    <details className="dialog-subsection">
                      <summary className="dialog-subsection-summary">Recent Audit Trail</summary>
                      <div className="dialog-subsection-body">
                        <p className="panel-muted">
                          Showing last 30 days. Use Run Report for older data.
                        </p>
                        {visibleAuditTrailEvents.length === 0 ? (
                          <p className="panel-muted">No consequence events in the last 30 days.</p>
                        ) : (
                          <ul className="profile-list">
                            {visibleAuditTrailEvents.map((entry) => (
                              <li key={`creator-audit:${entry.id}`} className="profile-list-item">
                                <span className="mission-main">
                                  {entry.type === 'job_marked_missed' ? 'Missed job' : 'Denied check'}: {entry.jobTitle || 'Job'}
                                </span>
                                <span className="job-status-label">
                                  {(childNameById[entry.childId] || 'Unknown child')} | -{Number(entry.penaltyCredits) || 0} | {formatDateTime(entry.createdAt)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <p className="panel-label" style={{ marginTop: '0.6rem' }}>Run Report (CSV)</p>
                        <div className="job-form">
                          <label className="form-field">
                            <span className="form-label">Timeframe</span>
                            <select
                              className="job-input"
                              value={auditReportRange}
                              onChange={(event) => setAuditReportRange(event.target.value)}
                            >
                              <option value="30">Last 30 days</option>
                              <option value="90">Last 90 days</option>
                              <option value="180">Last 180 days</option>
                              <option value="all">All time</option>
                            </select>
                          </label>
                          <label className="form-field">
                            <span className="form-label">Child</span>
                            <select
                              className="job-input"
                              value={auditReportChildId}
                              onChange={(event) => setAuditReportChildId(event.target.value)}
                            >
                              <option value="all">All children</option>
                              {childProfiles.map((child) => (
                                <option key={child.id} value={child.id}>
                                  {child.avatar} {child.displayName}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="form-field">
                            <span className="form-label">Event type</span>
                            <select
                              className="job-input"
                              value={auditReportType}
                              onChange={(event) => setAuditReportType(event.target.value)}
                            >
                              <option value="all">All events</option>
                              <option value="missed">Missed jobs</option>
                              <option value="denied">Denied checks</option>
                              <option value="penalty">With penalty only</option>
                            </select>
                          </label>
                        </div>
                        <p className="panel-muted">Matching events: {reportFilteredEvents.length}</p>
                        <div className="button-row">
                          <button type="button" className="claim-button" onClick={handleExportConsequenceAuditCsv}>
                            Run report (copy CSV)
                          </button>
                        </div>
                      </div>
                    </details>
                  </section>

                  {isCreatorMode ? (
                    <section className="dialog-section">
                      <p className="dialog-section-title">Creator Metrics</p>
                      <p className="dialog-section-subtitle">
                        Cross-family rollups are only visible in creator mode.
                      </p>

                      <details className="dialog-subsection" open>
                        <summary className="dialog-subsection-summary">Adoption Snapshot</summary>
                        <div className="dialog-subsection-body">
                          <p className="panel-muted">
                            Onboarding completion: {onboardingCompletionSummary.completedFamilyCount}
                            /{onboardingCompletionSummary.startedFamilyCount || 0} families
                            {onboardingCompletionSummary.startedFamilyCount > 0
                              ? ` (${onboardingCompletionSummary.completionRate}%)`
                              : ''}
                          </p>
                          <p className="panel-muted">
                            Weekly active families: {weeklyActiveSummary.activeFamilyCount}
                          </p>
                          <p className="panel-muted">
                            Tracked events in window: {weeklyActiveSummary.totalEventCount}
                          </p>
                          <p className="panel-muted">
                            Window: last {weeklyActiveSummary.windowDays} days
                          </p>
                        </div>
                      </details>

                      <details className="dialog-subsection">
                        <summary className="dialog-subsection-summary">Most Active Families</summary>
                        <div className="dialog-subsection-body">
                          {weeklyActiveSummary.families.length > 0 ? (
                            <ul className="profile-list">
                              {weeklyActiveSummary.families.slice(0, 5).map((family) => (
                                <li key={family.familyId} className="profile-list-item">
                                  <span className="mission-main">{family.familyId}</span>
                                  <span className="job-status-label">{family.eventCount} events</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="panel-muted">No weekly active families recorded yet.</p>
                          )}
                          <div className="button-row">
                            <button type="button" className="claim-button" onClick={handleExportWeeklyActiveSummary}>
                              Copy analytics snapshot
                            </button>
                            <button type="button" className="text-button" onClick={handleExportOnboardingSummary}>
                              Copy onboarding snapshot
                            </button>
                          </div>
                        </div>
                      </details>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {dialogBusy ? <p className="panel-muted">Working...</p> : null}
            </div>
          </section>
        ) : null}
      </main>
    </>
  )
}
