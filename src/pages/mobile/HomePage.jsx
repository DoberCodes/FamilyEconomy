import { useEffect, useState } from 'react'
import BalanceCard from '../../components/mobile/cards/BalanceCard'
import LevelCard from '../../components/mobile/cards/LevelCard'
import JobsCard from '../../components/mobile/cards/MissionsCard'
import StreakCard from '../../components/mobile/cards/StreakCard'
import FormattedRichText from '../../components/shared/FormattedRichText'
import ProgressTrack from '../../components/shared/ProgressTrack'
import StatusNote from '../../components/shared/StatusNote'
import {
  getActivityBadgeMeta,
  getGoalStatusLabel,
  getJobStatusLabel,
} from '../../domain/familyEconomyTypes'
import useFamilyHomeData from '../../hooks/useFamilyHomeData'
import { trackAnalyticsEvent } from '../../services/analytics'
import {
  formatRelativeActivityTime,
  startOfToday,
  startOfWeek,
  toDate,
} from '../../utils/dateUtils'

export default function HomePage() {
  const {
    familyId,
    userId,
    userRole,
    activeChildProfile,
    isParent,
    dashboard,
    store,
    childProfiles,
    familyAnnouncement,
    familyFundEnabled,
    familyFundName,
    familyFundBalance,
    achievementsEnabled,
    familyRecognitionEnabled,
    customBadges,
    achievementFirstGoalTarget,
    achievementContributorCreditsTarget,
    achievementHelperJobsTarget,
    achievementReadingJobsTarget,
    recognitionStreakDaysTarget,
    recognitionHelpingHandJobsTarget,
    recognitionGoalGetterTarget,
    loading,
    error,
  } = useFamilyHomeData()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [recognitionSlideIndex, setRecognitionSlideIndex] = useState(0)
  const [recognitionAutoAdvanceResetKey, setRecognitionAutoAdvanceResetKey] = useState(0)

  useEffect(() => {
    if (!isParent || loading || error || !familyId) {
      return
    }

    const dayKey = new Date().toISOString().slice(0, 10)
    trackAnalyticsEvent(
      'family_dashboard_viewed',
      {
        screen: 'home',
        source: 'HomePage',
        view: 'parent_dashboard',
      },
      { familyId, userId, userRole },
      {
        dedupe: true,
        dedupeKey: `family_dashboard_viewed:${familyId}:${userId}:${dayKey}`,
      },
    )
  }, [isParent, loading, error, familyId, userId, userRole])

  useEffect(() => {
    if (!isParent) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 60000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [isParent])

  const childProfilesById = childProfiles.reduce((accumulator, child) => {
    accumulator[child.id] = child
    return accumulator
  }, {})

  function resolveChildId(value) {
    if (!value) {
      return null
    }

    return childProfilesById[value] ? value : null
  }

  function resolveChildIdForJob(job) {
    const fromClaimed = resolveChildId(job.claimedBy)
    if (fromClaimed) {
      return fromClaimed
    }

    const fromAssigned = resolveChildId(job.childId)
    if (fromAssigned) {
      return fromAssigned
    }

    return null
  }

  function resolveChildIdForRewardRequest(request) {
    const fromChild = resolveChildId(request.childId)
    if (fromChild) {
      return fromChild
    }

    const fromRequester = resolveChildId(request.requestedBy)
    if (fromRequester) {
      return fromRequester
    }

    return null
  }

  function getJobCreditAmount(job) {
    if (job.rewardType === 'xp') {
      return 0
    }
    return Number(job.points || 0)
  }

  function formatJobReward(job) {
    const amount = Number(job.points || 0)
    return job.rewardType === 'xp' ? `+ ${amount} XP` : `+ ${amount} credits`
  }

  const todayStart = startOfToday()
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const thisWeekStart = startOfWeek()
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const familyWeeklyContributionsByChildId = dashboard.goals
    .filter((goal) => !resolveChildId(goal.childId))
    .reduce((accumulator, goal) => {
      ;(goal.contributionHistory || []).forEach((entry) => {
        const id = resolveChildId(entry.childId)
        const createdAt = toDate(entry.createdAt)
        if (!id || !createdAt || createdAt < thisWeekStart) {
          return
        }
        accumulator[id] = (accumulator[id] || 0) + (Number(entry.amount) || 0)
      })
      return accumulator
    }, {})

  const weeklySavingsByChildId = dashboard.goals
    .filter((goal) => resolveChildId(goal.childId))
    .reduce((accumulator, goal) => {
      const goalChildId = resolveChildId(goal.childId)
      ;(goal.contributionHistory || []).forEach((entry) => {
        const id = resolveChildId(entry.childId) || goalChildId
        const createdAt = toDate(entry.createdAt)
        if (!id || !createdAt || createdAt < thisWeekStart) {
          return
        }
        accumulator[id] = (accumulator[id] || 0) + (Number(entry.amount) || 0)
      })
      return accumulator
    }, {})

  const weeklyHelperJobsByChildId = dashboard.jobs
    .filter((job) => job.status === 'done')
    .reduce((accumulator, job) => {
      const childId = resolveChildIdForJob(job)
      const completedAt = toDate(job.completedAt)
      const countsAsHelper = (
        job.badgeContribution === 'helper'
        || (job.badgeContribution !== 'reading' && !job.childId)
      )
      if (!childId || !completedAt || completedAt < thisWeekStart || !countsAsHelper) {
        return accumulator
      }
      accumulator[childId] = (accumulator[childId] || 0) + 1
      return accumulator
    }, {})

  const weeklyCompletedJobsByChildId = dashboard.jobs
    .filter((job) => job.status === 'done')
    .reduce((accumulator, job) => {
      const childId = resolveChildIdForJob(job)
      const completedAt = toDate(job.completedAt)
      if (!childId || !completedAt || completedAt < thisWeekStart) {
        return accumulator
      }
      accumulator[childId] = (accumulator[childId] || 0) + 1
      return accumulator
    }, {})

  const previousWeeklyCompletedJobsByChildId = dashboard.jobs
    .filter((job) => job.status === 'done')
    .reduce((accumulator, job) => {
      const childId = resolveChildIdForJob(job)
      const completedAt = toDate(job.completedAt)
      if (!childId || !completedAt || completedAt < lastWeekStart || completedAt >= thisWeekStart) {
        return accumulator
      }
      accumulator[childId] = (accumulator[childId] || 0) + 1
      return accumulator
    }, {})

  const weeklyActiveDaysByChildId = childProfiles.reduce((accumulator, child) => {
    const completedJobDates = dashboard.jobs
      .filter((job) => job.status === 'done' && resolveChildIdForJob(job) === child.id)
      .map((job) => toDate(job.completedAt || job.claimedAt))
      .filter((dateValue) => dateValue && dateValue >= thisWeekStart)
    const completedGoalDates = dashboard.goals
      .filter((goal) => goal.status === 'completed' && resolveChildId(goal.childId) === child.id)
      .map((goal) => toDate(goal.completedAt))
      .filter((dateValue) => dateValue && dateValue >= thisWeekStart)

    accumulator[child.id] = getChildActiveDayDates([
      ...completedJobDates,
      ...completedGoalDates,
    ]).length
    return accumulator
  }, {})

  const weeklyCompletedGoalsByChildId = dashboard.goals
    .filter((goal) => goal.status === 'completed' && resolveChildId(goal.childId))
    .reduce((accumulator, goal) => {
      const completedAt = toDate(goal.completedAt)
      if (!completedAt || completedAt < thisWeekStart) {
        return accumulator
      }
      accumulator[goal.childId] = (accumulator[goal.childId] || 0) + 1
      return accumulator
    }, {})

  function findNthDate(values, minimumCount) {
    if (values.length < minimumCount) {
      return null
    }

    return values[minimumCount - 1] || null
  }

  function findRunningTotalDate(entries, targetAmount) {
    let runningTotal = 0

    for (const entry of entries) {
      runningTotal += Number(entry.amount) || 0
      if (runningTotal >= targetAmount) {
        return entry.at
      }
    }

    return null
  }

  function getChildActiveDayDates(jobDates) {
    return Object.values(
      jobDates.reduce((accumulator, dateValue) => {
        const key = dateValue.toISOString().slice(0, 10)
        if (!accumulator[key] || dateValue > accumulator[key]) {
          accumulator[key] = dateValue
        }
        return accumulator
      }, {}),
    ).sort((left, right) => left.getTime() - right.getTime())
  }

  const recentAchievements = childProfiles
    .flatMap((child) => {
      const completedJobDates = dashboard.jobs
        .filter((job) => job.status === 'done' && resolveChildIdForJob(job) === child.id)
        .map((job) => toDate(job.completedAt || job.claimedAt))
        .filter(Boolean)
        .sort((left, right) => left.getTime() - right.getTime())

      const completedGoalDates = dashboard.goals
        .filter((goal) => resolveChildId(goal.childId) === child.id && goal.status === 'completed')
        .map((goal) => toDate(goal.completedAt))
        .filter(Boolean)
        .sort((left, right) => left.getTime() - right.getTime())

      const familyContributionDates = dashboard.goals
        .filter((goal) => !resolveChildId(goal.childId))
        .flatMap((goal) => (goal.contributionHistory || []))
        .filter((entry) => resolveChildId(entry.childId) === child.id)
        .map((entry) => ({
          amount: Number(entry.amount) || 0,
          at: toDate(entry.createdAt),
        }))
        .filter((entry) => entry.at)
        .sort((left, right) => left.at.getTime() - right.at.getTime())

      let contributionTotal = 0
      let contributorBadgeDate = null
      familyContributionDates.forEach((entry) => {
        if (contributorBadgeDate) {
          return
        }
        contributionTotal += entry.amount
        if (contributionTotal >= achievementContributorCreditsTarget) {
          contributorBadgeDate = entry.at
        }
      })

      const helperJobDates = dashboard.jobs
        .filter((job) => (
          job.status === 'done'
          && resolveChildIdForJob(job) === child.id
          && (
            job.badgeContribution === 'helper'
            || (job.badgeContribution !== 'reading' && !job.childId)
          )
        ))
        .map((job) => toDate(job.completedAt || job.claimedAt))
        .filter(Boolean)
        .sort((left, right) => left.getTime() - right.getTime())

      const readingJobDates = dashboard.jobs
        .filter((job) => (
          job.status === 'done'
          && resolveChildIdForJob(job) === child.id
          && (
            job.badgeContribution === 'reading'
            || (job.badgeContribution !== 'helper' && /read|book|reading/i.test(job.title || ''))
          )
        ))
        .map((job) => toDate(job.completedAt || job.claimedAt))
        .filter(Boolean)
        .sort((left, right) => left.getTime() - right.getTime())

      const childActiveDayDates = getChildActiveDayDates(completedJobDates)

      const achievementHighlights = [
        {
          id: `achievement:first-goal:${child.id}`,
          icon: '🏁',
          label: 'First Goal',
          childName: child.displayName,
          detail: `${child.displayName} earned a badge`,
          at: findNthDate(completedGoalDates, achievementFirstGoalTarget),
        },
        {
          id: `achievement:consistent-contributor:${child.id}`,
          icon: '🤝',
          label: 'Consistent Contributor',
          childName: child.displayName,
          detail: `${child.displayName} earned a badge`,
          at: contributorBadgeDate,
        },
        {
          id: `achievement:family-helper:${child.id}`,
          icon: '🛟',
          label: 'Family Helper',
          childName: child.displayName,
          detail: `${child.displayName} earned a badge`,
          at: findNthDate(helperJobDates, achievementHelperJobsTarget),
        },
        {
          id: `achievement:reading-champion:${child.id}`,
          icon: '📚',
          label: 'Reading Champion',
          childName: child.displayName,
          detail: `${child.displayName} earned a badge`,
          at: findNthDate(readingJobDates, achievementReadingJobsTarget),
        },
      ].filter((achievement) => achievement.at)

      const milestoneHighlights = [5, 10, 25, 50, 100]
        .map((milestone) => ({
          id: `milestone:jobs:${milestone}:${child.id}`,
          icon: 'âœ…',
          label: `${milestone} Jobs Completed`,
          childName: child.displayName,
          detail: `${child.displayName} completed ${milestone} jobs`,
          at: findNthDate(completedJobDates, milestone),
        }))
        .filter((achievement) => achievement.at)

      const recognitionHighlights = [
        {
          id: `recognition:helping-hand:${child.id}`,
          icon: 'ðŸŒŸ',
          label: `Helping Hand (${helperJobDates.length} helps)`,
          childName: child.displayName,
          detail: `${child.displayName} earned recognition`,
          at: findNthDate(helperJobDates, recognitionHelpingHandJobsTarget),
        },
        {
          id: `recognition:goal-getter:${child.id}`,
          icon: 'ðŸŽ¯',
          label: `Goal Getter (${completedGoalDates.length} done)`,
          childName: child.displayName,
          detail: `${child.displayName} earned recognition`,
          at: findNthDate(completedGoalDates, recognitionGoalGetterTarget),
        },
        {
          id: `recognition:streak-star:${child.id}`,
          icon: 'ðŸ”¥',
          label: `Streak Star (${childActiveDayDates.length} days)`,
          childName: child.displayName,
          detail: `${child.displayName} kept showing up`,
          at: findNthDate(childActiveDayDates, recognitionStreakDaysTarget),
        },
      ].filter((achievement) => achievement.at)

      const customHighlights = (customBadges || [])
        .map((badge) => {
          const category = badge.category === 'recognition' ? 'recognition' : 'achievement'
          if ((category === 'achievement' && !achievementsEnabled) || (category === 'recognition' && !familyRecognitionEnabled)) {
            return null
          }

          const target = Math.max(1, Number(badge.target) || 1)
          const metricDates = {
            completed_goals: findNthDate(completedGoalDates, target),
            contribution_credits: findRunningTotalDate(familyContributionDates, target),
            helper_jobs: findNthDate(helperJobDates, target),
            reading_jobs: findNthDate(readingJobDates, target),
            streak_days: findNthDate(childActiveDayDates, target),
          }
          const at = metricDates[badge.metric || 'completed_goals']

          if (!at) {
            return null
          }

          return {
            id: `custom:${badge.id}:${child.id}`,
            icon: badge.icon || (category === 'recognition' ? 'ðŸŒŸ' : 'ðŸ…'),
            label: badge.label || 'Custom Badge',
            childName: child.displayName,
            detail: `${child.displayName} earned ${category === 'recognition' ? 'recognition' : 'a badge'}`,
            at,
          }
        })
        .filter(Boolean)

      return [
        ...(achievementsEnabled ? [...achievementHighlights, ...milestoneHighlights] : []),
        ...(familyRecognitionEnabled ? recognitionHighlights : []),
        ...customHighlights,
      ]
    })

  const latestFamilyActivityDate = dashboard.jobs
    .map((job) => toDate(job.completedAt || job.claimedAt || job.updatedAt || job.createdAt))
    .filter(Boolean)
    .sort((left, right) => right.getTime() - left.getTime())[0] || null
  const familyLevelHighlight = Number(dashboard.level?.current) > 1 && latestFamilyActivityDate
    ? [{
      id: `level:family:${dashboard.level.current}`,
      icon: 'â¬†ï¸',
      label: `Level ${dashboard.level.current}`,
      childName: 'Family',
      detail: `Family economy reached Level ${dashboard.level.current}`,
      at: latestFamilyActivityDate,
    }]
    : []
  const recentHighlights = [
    ...recentAchievements,
    ...familyLevelHighlight,
  ]
    .sort((left, right) => right.at.getTime() - left.at.getTime())
    .slice(0, 5)

  function getRecognitionEntries(valueByChildId) {
    return childProfiles
      .map((child) => ({
        child,
        value: Number(valueByChildId[child.id]) || 0,
      }))
      .sort((left, right) => {
        if (right.value !== left.value) {
          return right.value - left.value
        }
        return left.child.displayName.localeCompare(right.child.displayName)
      })
  }

  const topContributorEntries = getRecognitionEntries(familyWeeklyContributionsByChildId)
  const topSaverEntries = getRecognitionEntries(weeklySavingsByChildId)
  const hardestWorkerEntries = getRecognitionEntries(weeklyCompletedJobsByChildId)
  const mostHelpfulEntries = getRecognitionEntries(weeklyHelperJobsByChildId)
  const goalSetterEntries = getRecognitionEntries(weeklyCompletedGoalsByChildId)
  const mostImprovedEntries = getRecognitionEntries(
    childProfiles.reduce((accumulator, child) => {
      const currentCount = Number(weeklyCompletedJobsByChildId[child.id]) || 0
      const previousCount = Number(previousWeeklyCompletedJobsByChildId[child.id]) || 0
      accumulator[child.id] = Math.max(0, currentCount - previousCount)
      return accumulator
    }, {}),
  )
  const consistencyChampionEntries = getRecognitionEntries(weeklyActiveDaysByChildId)
  const smartInvestorEntries = getRecognitionEntries(
    childProfiles.reduce((accumulator, child) => {
      accumulator[child.id] = Number(
        child.monthlyInvestmentGrowth
          || child.investmentGrowth
          || child.portfolioGrowth
          || child.investmentReturn
          || 0,
      ) || 0
      return accumulator
    }, {}),
  )
  const childSavingsRecognitionEnabled = dashboard.goals.some((goal) => resolveChildId(goal.childId))
  const completedGoalRecognitionEnabled = dashboard.goals.some((goal) => resolveChildId(goal.childId))
  const futureRecognitionSlides = [
    {
      key: 'smart-investor',
      title: 'Smart Investor',
      summary: 'Best investment return this month',
      entries: smartInvestorEntries,
      emptyLeaderLabel: 'No Leader Yet',
      emptySupport: 'Waiting for the first investment return',
      metricSingular: 'Point',
      metricPlural: 'Points',
      enabled: false,
    },
  ]
  const recognitionSlides = [
    {
      key: 'hardest-worker',
      title: 'Hardest Worker',
      summary: 'Most jobs completed',
      entries: hardestWorkerEntries,
      emptyLeaderLabel: 'No Leader Yet',
      emptySupport: 'Waiting for the first completed job',
      metricSingular: 'Job',
      metricPlural: 'Jobs',
    },
    {
      key: 'most-helpful',
      title: 'Most Helpful',
      summary: 'Most helper jobs',
      entries: mostHelpfulEntries,
      emptyLeaderLabel: 'No Leader Yet',
      emptySupport: 'Waiting for the first helping hand',
      metricSingular: 'Helper Job',
      metricPlural: 'Helper Jobs',
    },
    ...(childSavingsRecognitionEnabled ? [
      {
        key: 'top-saver',
        title: 'Top Saver',
        summary: 'Most credits saved',
        entries: topSaverEntries,
        emptyLeaderLabel: 'No Leader Yet',
        emptySupport: 'Waiting for the first savings deposit',
        metricSingular: 'Credit',
        metricPlural: 'Credits',
      },
    ] : []),
    ...(completedGoalRecognitionEnabled ? [
      {
        key: 'goal-setter',
        title: 'Goal Setter',
        summary: 'Most goals completed',
        entries: goalSetterEntries,
        emptyLeaderLabel: 'No Leader Yet',
        emptySupport: 'Waiting for the first completed goal',
        metricSingular: 'Goal',
        metricPlural: 'Goals',
      },
    ] : []),
    ...(familyFundEnabled ? [
      {
        key: 'most-generous',
        title: 'Most Generous',
        summary: 'Most community contributions',
        entries: topContributorEntries,
        emptyLeaderLabel: 'No Leader Yet',
        emptySupport: 'Waiting for the first community fund gift',
        metricSingular: 'Credit',
        metricPlural: 'Credits',
      },
    ] : []),
    {
      key: 'most-improved',
      title: 'Most Improved',
      summary: 'Biggest improvement from last week',
      entries: mostImprovedEntries,
      emptyLeaderLabel: 'No Leader Yet',
      emptySupport: 'Waiting for someone to beat last week',
      metricSingular: 'More Job',
      metricPlural: 'More Jobs',
    },
    {
      key: 'consistency-champion',
      title: 'Consistency Champion',
      summary: 'Most active days this week',
      entries: consistencyChampionEntries,
      emptyLeaderLabel: 'No Leader Yet',
      emptySupport: 'Waiting for the first active day',
      metricSingular: 'Day',
      metricPlural: 'Days',
    },
    ...futureRecognitionSlides.filter((slide) => slide.enabled),
  ].filter((slide) => slide.entries.length > 0)

  useEffect(() => {
    if (!familyRecognitionEnabled || recognitionSlides.length < 2) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setRecognitionSlideIndex((current) => (current + 1) % recognitionSlides.length)
    }, 6500)

    return () => {
      window.clearInterval(timerId)
    }
  }, [familyRecognitionEnabled, recognitionSlides.length, recognitionAutoAdvanceResetKey])

  const activeRecognitionSlideIndex = recognitionSlides.length > 0
    ? recognitionSlideIndex % recognitionSlides.length
    : 0
  const currentRecognitionSlide = recognitionSlides.length > 0
    ? recognitionSlides[activeRecognitionSlideIndex]
    : null
  const currentRecognitionWinner = currentRecognitionSlide?.entries?.[0] || null
  const currentRecognitionTiles = currentRecognitionSlide?.entries?.slice(0, 2) || []
  const hasRecognitionLeader = Number(currentRecognitionWinner?.value) > 0
  const currentRecognitionSupport = hasRecognitionLeader
    ? ''
    : currentRecognitionSlide?.emptySupport || 'Waiting for the first moment'

  const familySavingsGoal = dashboard.goals
    .filter((goal) => !resolveChildId(goal.childId))
    .sort((left, right) => {
      const rank = {
        ready_to_claim: 0,
        active: 1,
        pending_parent_approval: 2,
        countered: 3,
        completed: 4,
      }
      const leftRank = rank[left.status] ?? 99
      const rightRank = rank[right.status] ?? 99

      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }

      const leftProgress = (Number(left.saved) || 0) / Math.max(1, Number(left.target) || 1)
      const rightProgress = (Number(right.saved) || 0) / Math.max(1, Number(right.target) || 1)

      if (rightProgress !== leftProgress) {
        return rightProgress - leftProgress
      }

      const leftUpdatedAt = toDate(left.updatedAt)?.getTime() || 0
      const rightUpdatedAt = toDate(right.updatedAt)?.getTime() || 0
      return rightUpdatedAt - leftUpdatedAt
    })[0] || null

  const familySavingsGoalPct = familySavingsGoal
    ? Math.min(
      100,
      Math.round(
        ((Number(familySavingsGoal.saved) || 0) / Math.max(1, Number(familySavingsGoal.target) || 1)) * 100,
      ),
    )
    : 0
  const familyFundLabel = String(familyFundName || 'Community Funds').trim() || 'Community Funds'
  const familySavingsContributors = Object.values(
    (familySavingsGoal?.contributionHistory || []).reduce((accumulator, entry) => {
      if (!entry?.childId) {
        return accumulator
      }

      const amount = Number(entry.amount) || 0
      accumulator[entry.childId] = accumulator[entry.childId] || { childId: entry.childId, amount: 0 }
      accumulator[entry.childId].amount += amount
      return accumulator
    }, {}),
  )
    .sort((left, right) => right.amount - left.amount)
  const overallJobEarnings = dashboard.jobs.reduce((sum, job) => {
    if (job.status === 'done') {
      return sum + getJobCreditAmount(job)
    }
    return sum
  }, 0)

  const familyTrackedJobs = dashboard.jobs
    .filter((job) => job.status === 'open' || job.status === 'claimed' || job.status === 'done')
    .sort((left, right) => {
      const score = {
        claimed: 0,
        open: 1,
        done: 2,
      }
      const leftScore = score[left.status] ?? 99
      const rightScore = score[right.status] ?? 99
      if (leftScore !== rightScore) {
        return leftScore - rightScore
      }
      return (right.order || 0) - (left.order || 0)
    })
    .slice(0, 14)

  const jobStatusCounts = {
    claimed: familyTrackedJobs.filter((job) => job.status === 'claimed').length,
    open: familyTrackedJobs.filter((job) => job.status === 'open').length,
    done: familyTrackedJobs.filter((job) => job.status === 'done').length,
  }

  function childBadge(childId) {
    const child = childProfilesById[childId]
    if (!child) {
      return <span className="family-badge">Unknown child</span>
    }

    return (
      <span className="family-badge">
        <span aria-hidden="true">{child.avatar}</span>
        <span>{child.displayName}</span>
      </span>
    )
  }

  function formatRecognitionCount(value, singular, plural) {
    const count = Number(value) || 0
    return `${count} ${count === 1 ? singular : plural}`
  }

  function getHighlightIcon(achievement) {
    const icon = String(achievement?.icon || '').trim()
    return icon && !/[ÃÂ�ðâ]/.test(icon) ? icon : '*'
  }

  const activityFeedItems = (() => {
    const items = []

    dashboard.jobs.forEach((job) => {
      const completedAt = toDate(job.completedAt)
      if (job.status === 'done' && completedAt) {
        const childId = resolveChildIdForJob(job)
        items.push({
          id: `job:${job.id || job.title}:${completedAt.getTime()}`,
          at: completedAt,
          childId,
          icon: '✅',
          text: `${job.title} earned ${formatJobReward(job)}`,
          kind: 'job',
        })
      }
    })

    store.requests.forEach((request) => {
      const childId = resolveChildIdForRewardRequest(request)
      const reviewedAt = toDate(request.reviewedAt)
      const fulfilledAt = toDate(request.fulfilledAt)

      if (request.status === 'approved' && reviewedAt) {
        items.push({
          id: `reward-approved:${request.id}:${reviewedAt.getTime()}`,
          at: reviewedAt,
          childId,
          icon: '🎁',
          text: `${request.rewardTitle} approved`,
          kind: 'reward-approved',
        })
      }

      if (request.status === 'fulfilled' && fulfilledAt) {
        items.push({
          id: `reward-fulfilled:${request.id}:${fulfilledAt.getTime()}`,
          at: fulfilledAt,
          childId,
          icon: '📦',
          text: `${request.rewardTitle} fulfilled`,
          kind: 'reward-fulfilled',
        })
      }
    })

    dashboard.goals.forEach((goal) => {
      const target = Number(goal.target) || 0
      const saved = Number(goal.saved) || 0
      const childId = resolveChildId(goal.childId)
      const progress = target > 0 ? (saved / target) : 0
      const updatedAt = toDate(goal.updatedAt)
      const completedAt = toDate(goal.completedAt)

      if (completedAt) {
        items.push({
          id: `goal-complete:${goal.id || goal.name}:${completedAt.getTime()}`,
          at: completedAt,
          childId,
          icon: '🏁',
          text: `${goal.rewardTitle || goal.name} completed`,
          kind: 'goal-complete',
        })
      } else if (updatedAt && progress >= 0.5) {
        items.push({
          id: `goal-progress:${goal.id || goal.name}:${updatedAt.getTime()}`,
          at: updatedAt,
          childId,
          icon: '🎯',
          text: `${goal.rewardTitle || goal.name} reached ${Math.round(progress * 100)}%`,
          kind: 'goal-progress',
        })
      }
    })

    const scopedItems = isParent
      ? items
      : items.filter((item) => item.childId && item.childId === activeChildProfile?.id)

    return scopedItems
      .sort((left, right) => (right.at?.getTime() || 0) - (left.at?.getTime() || 0))
      .slice(0, 10)
  })()

  const hasFamilyAnnouncement = Boolean(String(familyAnnouncement || '').trim())

  const kidGoalSpotlight = dashboard.goals
    .filter((goal) => {
      if (!activeChildProfile?.id) {
        return true
      }
      return resolveChildId(goal.childId) === activeChildProfile.id
    })
    .sort((left, right) => {
      const rank = {
        ready_to_claim: 0,
        active: 1,
        pending_parent_approval: 2,
        countered: 3,
        completed: 4,
      }
      const leftRank = rank[left.status] ?? 99
      const rightRank = rank[right.status] ?? 99
      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }

      const leftProgress = (Number(left.saved) || 0) / Math.max(1, Number(left.target) || 1)
      const rightProgress = (Number(right.saved) || 0) / Math.max(1, Number(right.target) || 1)
      return rightProgress - leftProgress
    })[0] || null

  const kidGoalProgressPct = kidGoalSpotlight
    ? Math.min(100, Math.round(((Number(kidGoalSpotlight.saved) || 0) / Math.max(1, Number(kidGoalSpotlight.target) || 1)) * 100))
    : 0

  return (
    <>
      <main className="phone-content home-grid">
        <StatusNote>{loading ? 'Loading dashboard...' : ''}</StatusNote>
        <StatusNote tone="error">{error}</StatusNote>

        {isParent ? (
          <>
            {hasFamilyAnnouncement ? (
              <section className="panel home-col-full family-news-panel">
                <div className="family-news-header">
                  <span className="family-news-icon" aria-hidden="true">📰</span>
                  <div>
                    <p className="panel-label">Family News</p>
                    <p className="family-news-kicker">Latest update from home base</p>
                  </div>
                </div>
                <div className="family-news-body">
                  <FormattedRichText className="family-news-copy" value={familyAnnouncement} />
                </div>
              </section>
            ) : null}

            <section className="panel home-col-full">
              <p className="panel-label">Family Goal</p>
              <p className="panel-muted home-section-subtitle">The shared target everyone can build together.</p>
              <div className="money-section-card money-section-card--shared family-goal-hero" style={{ marginTop: '0.25rem' }}>
                {!familyFundEnabled ? (
                  <p className="panel-muted">{familyFundLabel} is off. Turn it on in Parent Actions or setup to power shared family goals.</p>
                ) : null}
                {!familySavingsGoal ? (
                  <>
                    <p className="panel-muted" style={{ marginTop: 0 }}>{familyFundLabel}: {familyFundBalance} credits available</p>
                    <p className="panel-muted">No shared family goal yet. Create one in Savings with no child selected.</p>
                  </>
                ) : (
                  <>
                    <p className="family-goal-kicker">🎯 FAMILY GOAL</p>
                    <p className="family-goal-name">{(familySavingsGoal.rewardTitle || familySavingsGoal.name || 'Family Goal').toUpperCase()}</p>
                    <div className="limit-chip-row">
                      <span className="limit-chip">{getGoalStatusLabel(familySavingsGoal.status)}</span>
                      <span className="limit-chip">{childProfiles.length} kids can contribute</span>
                    </div>
                    <p className="panel-muted" style={{ marginTop: '0.45rem', marginBottom: 0 }}>{familyFundLabel}: {familyFundBalance} credits available</p>
                    <p className="family-goal-math">{familySavingsGoal.saved} / {familySavingsGoal.target} Credits</p>
                    <p className="family-goal-percent">{familySavingsGoalPct}%</p>
                    <ProgressTrack value={familySavingsGoalPct} light label="Family goal progress" />
                    <div>
                      <p className="money-section-kicker" style={{ marginBottom: '0.35rem' }}>Contributors</p>
                      {familySavingsContributors.length > 0 ? (
                        <ul className="profile-list">
                          {familySavingsContributors.map((contributor) => {
                            const child = childProfiles.find((profile) => profile.id === contributor.childId)
                            return (
                              <li key={contributor.childId} className="profile-list-item">
                                <span className="mission-main">
                                  {child?.avatar || '🧒'} {child?.displayName || 'Child'}
                                </span>
                                <span className="job-status-label">
                                  {contributor.amount} credits
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className="panel-muted">No one has chipped in yet.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>

            {(familyRecognitionEnabled || achievementsEnabled) ? (
              <section className="panel home-col-full family-recognition-panel">
                <p className="panel-label">Weekly Family Recognition</p>
                <p className="panel-muted home-section-subtitle">Highlights from this week</p>

                {familyRecognitionEnabled ? (
                  <div className="recognition-carousel" aria-roledescription="carousel">
                    {currentRecognitionSlide ? (
                      <>
                        <div className="recognition-carousel-stage">
                          <article className="recognition-slide">
                            <p className="recognition-slide-kicker">{currentRecognitionSlide.title}</p>
                            <p className="recognition-slide-summary">{currentRecognitionSlide.summary}</p>
                            <div className={`recognition-leader-card ${hasRecognitionLeader ? '' : 'recognition-leader-card-empty'}`}>
                              <span className="recognition-leader-avatar" aria-hidden="true">
                                {hasRecognitionLeader
                                  ? currentRecognitionWinner.child.avatar || currentRecognitionWinner.child.displayName.charAt(0)
                                  : '?'}
                              </span>
                              <strong>
                                {hasRecognitionLeader
                                  ? currentRecognitionWinner.child.displayName
                                  : currentRecognitionSlide.emptyLeaderLabel}
                              </strong>
                              {hasRecognitionLeader ? (
                                <span>
                                  {formatRecognitionCount(
                                    currentRecognitionWinner.value,
                                    currentRecognitionSlide.metricSingular,
                                    currentRecognitionSlide.metricPlural,
                                  )}
                                </span>
                              ) : null}
                            </div>
                            <div className="recognition-child-tile-row">
                              {currentRecognitionTiles.map((entry, index) => (
                                <div
                                  key={`${currentRecognitionSlide.key}:${entry.child.id}`}
                                  className={`recognition-child-tile ${hasRecognitionLeader && index === 0 ? 'recognition-child-tile-lead' : ''}`}
                                >
                                  <span className="recognition-child-avatar" aria-hidden="true">
                                    {entry.child.avatar || entry.child.displayName.charAt(0)}
                                  </span>
                                  <strong>{entry.child.displayName}</strong>
                                  <span>
                                    {formatRecognitionCount(
                                      entry.value,
                                      currentRecognitionSlide.metricSingular,
                                      currentRecognitionSlide.metricPlural,
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {currentRecognitionSupport ? (
                              <p className="recognition-slide-support">{currentRecognitionSupport}</p>
                            ) : null}
                          </article>

                          <button
                            type="button"
                            className="recognition-carousel-button recognition-carousel-button-prev"
                            onClick={() => {
                              setRecognitionSlideIndex((current) => (
                                (current - 1 + recognitionSlides.length) % recognitionSlides.length
                              ))
                              setRecognitionAutoAdvanceResetKey((current) => current + 1)
                            }}
                            disabled={recognitionSlides.length < 2}
                            aria-label="Previous recognition slide"
                          >
                            <span aria-hidden="true">{'<'}</span>
                          </button>

                          <button
                            type="button"
                            className="recognition-carousel-button recognition-carousel-button-next"
                            onClick={() => {
                              setRecognitionSlideIndex((current) => (
                                (current + 1) % recognitionSlides.length
                              ))
                              setRecognitionAutoAdvanceResetKey((current) => current + 1)
                            }}
                            disabled={recognitionSlides.length < 2}
                            aria-label="Next recognition slide"
                          >
                            <span aria-hidden="true">{'>'}</span>
                          </button>

                          <div className="recognition-carousel-dots" aria-label="Recognition slides">
                            {recognitionSlides.map((slide, index) => (
                              <button
                                key={slide.key}
                                type="button"
                                className={`recognition-carousel-dot ${index === activeRecognitionSlideIndex ? 'recognition-carousel-dot-active' : ''}`}
                                onClick={() => {
                                  setRecognitionSlideIndex(index)
                                  setRecognitionAutoAdvanceResetKey((current) => current + 1)
                                }}
                                aria-label={`Show ${slide.title}`}
                                aria-pressed={index === activeRecognitionSlideIndex}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="panel-muted">No weekly recognition yet.</p>
                    )}
                  </div>
                ) : null}

              </section>
            ) : null}

            <section className="panel home-col-full">
              <p className="panel-label">Family Job Tracker</p>
              <p className="panel-muted">{overallJobEarnings} credits earned from completed jobs</p>
              <div className="limit-chip-row">
                <span className="limit-chip">In progress: {jobStatusCounts.claimed}</span>
                <span className="limit-chip">Open: {jobStatusCounts.open}</span>
                <span className="limit-chip">Done: {jobStatusCounts.done}</span>
              </div>
              {familyTrackedJobs.length === 0 ? (
                <p className="panel-muted">No jobs created yet.</p>
              ) : (
                <ul className="family-job-list">
                  {familyTrackedJobs.map((job) => {
                    const ownerId = resolveChildIdForJob(job)
                    return (
                      <li key={job.id || job.title} className="family-job-item">
                        <div className="family-job-top">
                          <span className="mission-main">
                            <span className="family-job-checkbox" aria-hidden="true">{job.icon}</span>
                            <span>{job.title}</span>
                          </span>
                          <span className="mission-reward">{formatJobReward(job)}</span>
                        </div>
                        <div className="family-job-bottom">
                          <span>
                            {ownerId
                              ? childBadge(ownerId)
                              : <span className="family-badge">Unclaimed</span>}
                          </span>
                          <span className={`family-status-pill family-status-${job.status}`}>
                            {getJobStatusLabel(job.status)}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="panel home-col-full recent-activity-panel">
              <p className="panel-label">Recent Activity</p>
              <section className="activity-subsection activity-subsection-highlights">
                <div className="activity-subsection-head">
                  <p className="activity-subsection-title">Recent Achievements</p>
                  <span className="activity-subsection-count">Last 5</span>
                </div>
                {recentHighlights.length === 0 ? (
                  <p className="panel-muted">No recent achievements unlocked yet.</p>
                ) : (
                  <ul className="family-achievement-feed">
                    {recentHighlights.map((achievement) => (
                      <li key={achievement.id} className="family-achievement-item">
                        <span className="family-achievement-icon" aria-hidden="true">{getHighlightIcon(achievement)}</span>
                        <span className="family-achievement-label">
                          <span>{achievement.label}</span>
                          <small>{achievement.detail || `${achievement.childName} earned this`}</small>
                        </span>
                        <span className="family-achievement-time">
                          {formatRelativeActivityTime(achievement.at, nowMs)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="activity-subsection activity-subsection-feed">
                <div className="activity-subsection-head">
                  <p className="activity-subsection-title">Activity Feed</p>
                </div>
                {activityFeedItems.length === 0 ? (
                  <p className="panel-muted">No recent family activity yet.</p>
                ) : (
                  <ul className="activity-feed-list">
                    {activityFeedItems.map((item) => {
                      return (
                        <li key={item.id} className="activity-feed-item">
                          <div className="activity-feed-top">
                            <span className="mission-main activity-feed-title">
                              <span className="activity-feed-icon" aria-hidden="true">{item.icon}</span>
                              <span>{item.text}</span>
                            </span>
                          </div>
                          <div className="activity-feed-bottom">
                            <span className="job-status-label">
                              {item.childId ? childBadge(item.childId) : <span className="family-badge">Family</span>}
                            </span>
                            <span className="job-status-label">{formatRelativeActivityTime(item.at, nowMs)}</span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </section>
          </>
        ) : (
          <>
            {hasFamilyAnnouncement ? (
              <section className="panel home-col-full family-news-panel">
                <div className="family-news-header">
                  <span className="family-news-icon" aria-hidden="true">📰</span>
                  <div>
                    <p className="panel-label">Family News</p>
                    <p className="family-news-kicker">Latest update from home base</p>
                  </div>
                </div>
                <div className="family-news-body">
                  <FormattedRichText className="family-news-copy" value={familyAnnouncement} />
                </div>
              </section>
            ) : null}

            {!loading && !error && dashboard.jobs.length === 0 ? (
              <StatusNote>Finish onboarding to start seeing jobs and rewards here.</StatusNote>
            ) : null}
            <section className="home-col">
              <LevelCard
                level={dashboard.level}
                profileName={activeChildProfile?.displayName || dashboard.profileName}
              />
              <BalanceCard credits={dashboard.balance.credits} />
            </section>
            <section className="home-col">
              <JobsCard jobs={dashboard.jobs} />
              <StreakCard days={dashboard.streakDays} />
            </section>
            <section className="panel home-col-full">
              <p className="panel-label">Goal Spotlight</p>
              {!kidGoalSpotlight ? (
                <p className="panel-muted">No active goal yet. Start one in Savings.</p>
              ) : (
                <>
                  <p className="panel-muted">
                    {kidGoalSpotlight.rewardTitle || kidGoalSpotlight.name}
                  </p>
                  <div className="limit-chip-row">
                    <span className="limit-chip">{getGoalStatusLabel(kidGoalSpotlight.status)}</span>
                    <span className="limit-chip">{kidGoalSpotlight.saved}/{kidGoalSpotlight.target} credits</span>
                    <span className="limit-chip">{Math.max(0, Number(kidGoalSpotlight.target) - Number(kidGoalSpotlight.saved || 0))} to go</span>
                  </div>
                  <ProgressTrack value={kidGoalProgressPct} light label="Goal spotlight progress" />
                </>
              )}
            </section>
            <section className="panel home-col-full">
              <p className="panel-label">Recent Activity</p>
              {activityFeedItems.length === 0 ? (
                <p className="panel-muted">No recent activity for this child yet.</p>
              ) : (
                <ul className="mission-list">
                  {activityFeedItems.map((item) => {
                    const badge = getActivityBadgeMeta(item.kind)
                    return (
                      <li key={item.id}>
                        <span className="mission-main">{item.icon} {item.text}</span>
                        <span className={`activity-pill activity-pill-${badge.tone}`}>{badge.label}</span>
                        <span className="job-status-label">{formatRelativeActivityTime(item.at, nowMs)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  )
}
