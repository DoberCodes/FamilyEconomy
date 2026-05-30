import { useEffect, useState } from 'react'
import BottomTabBar from '../../components/mobile/BottomTabBar'
import TopStatusBar from '../../components/mobile/TopStatusBar'
import BalanceCard from '../../components/mobile/cards/BalanceCard'
import LevelCard from '../../components/mobile/cards/LevelCard'
import JobsCard from '../../components/mobile/cards/MissionsCard'
import StreakCard from '../../components/mobile/cards/StreakCard'
import { useAuth } from '../../context/AuthContext'
import { trackAnalyticsEvent } from '../../services/analytics'
import {
  getFamilyDashboard,
  getHouseholdOnboardingData,
  getFamilyStoreData,
} from '../../services/familyEconomyService'

const emptyDashboard = {
  profileName: '',
  level: { current: 1, xp: 0, nextXp: 500 },
  balance: { credits: 0 },
  jobs: [],
  goals: [],
  streakDays: 0,
}

export default function HomePage() {
  const { familyId, userId, userRole, activeChildProfile } = useAuth()
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [store, setStore] = useState({ rewards: [], requests: [] })
  const [childProfiles, setChildProfiles] = useState([])
  const [familyDashboardTopCardsEnabled, setFamilyDashboardTopCardsEnabled] = useState(true)
  const [achievementsEnabled, setAchievementsEnabled] = useState(true)
  const [familyRecognitionEnabled, setFamilyRecognitionEnabled] = useState(true)
  const [trendView, setTrendView] = useState('daily')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isParent = userRole === 'parent'

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const [dashboardResult, storeResult, onboardingResult] = await Promise.all([
          getFamilyDashboard({
            familyId,
            userId,
            userRole,
            selectedChildId: isParent ? null : activeChildProfile?.id,
          }),
          getFamilyStoreData({
            familyId,
            userId,
            userRole,
            selectedChildId: isParent ? null : activeChildProfile?.id,
          }),
          getHouseholdOnboardingData({
            familyId,
            userId,
            userRole,
          }),
        ])

        if (!mounted) {
          return
        }

        setDashboard(dashboardResult.data)
        setStore(storeResult.data)
        setChildProfiles(onboardingResult.data.childProfiles || [])
        setFamilyDashboardTopCardsEnabled(
          onboardingResult.data.family?.familyDashboardTopCardsEnabled !== false,
        )
        setAchievementsEnabled(onboardingResult.data.family?.achievementsEnabled !== false)
        setFamilyRecognitionEnabled(onboardingResult.data.family?.familyRecognitionEnabled !== false)
      } catch {
        if (!mounted) {
          return
        }

        setDashboard(emptyDashboard)
        setStore({ rewards: [], requests: [] })
        setChildProfiles([])
        setFamilyDashboardTopCardsEnabled(true)
        setAchievementsEnabled(true)
        setFamilyRecognitionEnabled(true)
        setError('Could not load family data right now.')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [familyId, userId, userRole, activeChildProfile?.id, isParent])

  useEffect(() => {
    if (!isParent) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setTrendView((currentView) => (currentView === 'daily' ? 'weekly' : 'daily'))
    }, 8000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [isParent])

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

  function toDate(value) {
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

  function startOfToday() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  function startOfWeek(value = new Date()) {
    const start = new Date(value)
    const day = start.getDay()
    const daysSinceMonday = (day + 6) % 7
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - daysSinceMonday)
    return start
  }

  function isWithinRange(value, start, end) {
    return Boolean(value && value >= start && value < end)
  }

  const todayStart = startOfToday()
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const thisWeekStart = startOfWeek()
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const childDailyEarnings = childProfiles.map((child) => {
    const earned = dashboard.jobs
      .filter((job) => job.status === 'claimed' || job.status === 'done')
      .filter((job) => resolveChildIdForJob(job) === child.id)
      .filter((job) => {
        const completedAt = toDate(job.completedAt)
        const claimedAt = toDate(job.claimedAt)

        if (job.status === 'done') {
          return Boolean(completedAt && completedAt >= todayStart)
        }

        return Boolean(claimedAt && claimedAt >= todayStart)
      })
      .reduce((sum, job) => sum + getJobCreditAmount(job), 0)

    return {
      child,
      earned,
    }
  })

  const childDailySpending = childProfiles.map((child) => {
    const spent = store.requests
      .filter((request) => request.status === 'approved' || request.status === 'fulfilled')
      .filter((request) => resolveChildIdForRewardRequest(request) === child.id)
      .filter((request) => {
        const reviewedAt = toDate(request.reviewedAt || request.createdAt)
        return Boolean(reviewedAt && reviewedAt >= todayStart)
      })
      .reduce((sum, request) => sum + Number(request.cost || 0), 0)

    return {
      child,
      spent,
    }
  })

  const childWeeklyEarnings = childProfiles.map((child) => {
    const earned = dashboard.jobs
      .filter((job) => job.status === 'claimed' || job.status === 'done')
      .filter((job) => resolveChildIdForJob(job) === child.id)
      .filter((job) => {
        const completedAt = toDate(job.completedAt)
        const claimedAt = toDate(job.claimedAt)

        if (job.status === 'done') {
          return Boolean(completedAt && completedAt >= thisWeekStart)
        }

        return Boolean(claimedAt && claimedAt >= thisWeekStart)
      })
      .reduce((sum, job) => sum + getJobCreditAmount(job), 0)

    return {
      child,
      earned,
    }
  })

  const childWeeklySpending = childProfiles.map((child) => {
    const spent = store.requests
      .filter((request) => request.status === 'approved' || request.status === 'fulfilled')
      .filter((request) => resolveChildIdForRewardRequest(request) === child.id)
      .filter((request) => {
        const reviewedAt = toDate(request.reviewedAt || request.createdAt)
        return Boolean(reviewedAt && reviewedAt >= thisWeekStart)
      })
      .reduce((sum, request) => sum + Number(request.cost || 0), 0)

    return {
      child,
      spent,
    }
  })

  const childSavedTotals = childProfiles.map((child) => {
    const saved = Number(child.credits) || 0

    return {
      child,
      saved,
    }
  })

  const currentDayJobCompletions = dashboard.jobs.filter((job) => {
    const completedAt = toDate(job.completedAt)
    return job.status === 'done' && isWithinRange(completedAt, todayStart, new Date())
  })

  const previousDayJobCompletions = dashboard.jobs.filter((job) => {
    const completedAt = toDate(job.completedAt)
    return job.status === 'done' && isWithinRange(completedAt, yesterdayStart, todayStart)
  })

  const currentDayRewardApprovals = store.requests.filter((request) => {
    const reviewedAt = toDate(request.reviewedAt || request.createdAt)
    return (request.status === 'approved' || request.status === 'fulfilled')
      && isWithinRange(reviewedAt, todayStart, new Date())
  })

  const previousDayRewardApprovals = store.requests.filter((request) => {
    const reviewedAt = toDate(request.reviewedAt || request.createdAt)
    return (request.status === 'approved' || request.status === 'fulfilled')
      && isWithinRange(reviewedAt, yesterdayStart, todayStart)
  })

  const currentDayEarnedCredits = currentDayJobCompletions.reduce(
    (sum, job) => sum + getJobCreditAmount(job),
    0,
  )
  const previousDayEarnedCredits = previousDayJobCompletions.reduce(
    (sum, job) => sum + getJobCreditAmount(job),
    0,
  )
  const currentDaySpentCredits = currentDayRewardApprovals.reduce(
    (sum, request) => sum + Number(request.cost || 0),
    0,
  )
  const previousDaySpentCredits = previousDayRewardApprovals.reduce(
    (sum, request) => sum + Number(request.cost || 0),
    0,
  )

  const dailyTrendCards = [
    {
      label: 'Earned today',
      value: `+${currentDayEarnedCredits}`,
      helper: `${currentDayJobCompletions.length} completed jobs`,
      delta: currentDayEarnedCredits - previousDayEarnedCredits,
      tone: 'earn',
    },
    {
      label: 'Spent today',
      value: `-${currentDaySpentCredits}`,
      helper: `${currentDayRewardApprovals.length} approved rewards`,
      delta: currentDaySpentCredits - previousDaySpentCredits,
      tone: 'spend',
    },
    {
      label: 'Job completions',
      value: String(currentDayJobCompletions.length),
      helper: `${previousDayJobCompletions.length} yesterday`,
      delta: currentDayJobCompletions.length - previousDayJobCompletions.length,
      tone: 'save',
    },
    {
      label: 'Reward approvals',
      value: String(currentDayRewardApprovals.length),
      helper: `${previousDayRewardApprovals.length} yesterday`,
      delta: currentDayRewardApprovals.length - previousDayRewardApprovals.length,
      tone: 'spend',
    },
  ]

  const currentWeekJobCompletions = dashboard.jobs.filter((job) => {
    const completedAt = toDate(job.completedAt)
    return job.status === 'done' && isWithinRange(completedAt, thisWeekStart, new Date())
  })

  const previousWeekJobCompletions = dashboard.jobs.filter((job) => {
    const completedAt = toDate(job.completedAt)
    return job.status === 'done' && isWithinRange(completedAt, lastWeekStart, thisWeekStart)
  })

  const currentWeekRewardApprovals = store.requests.filter((request) => {
    const reviewedAt = toDate(request.reviewedAt || request.createdAt)
    return (request.status === 'approved' || request.status === 'fulfilled')
      && isWithinRange(reviewedAt, thisWeekStart, new Date())
  })

  const previousWeekRewardApprovals = store.requests.filter((request) => {
    const reviewedAt = toDate(request.reviewedAt || request.createdAt)
    return (request.status === 'approved' || request.status === 'fulfilled')
      && isWithinRange(reviewedAt, lastWeekStart, thisWeekStart)
  })

  const currentWeekEarnedCredits = currentWeekJobCompletions.reduce(
    (sum, job) => sum + getJobCreditAmount(job),
    0,
  )
  const previousWeekEarnedCredits = previousWeekJobCompletions.reduce(
    (sum, job) => sum + getJobCreditAmount(job),
    0,
  )
  const currentWeekSpentCredits = currentWeekRewardApprovals.reduce(
    (sum, request) => sum + Number(request.cost || 0),
    0,
  )
  const previousWeekSpentCredits = previousWeekRewardApprovals.reduce(
    (sum, request) => sum + Number(request.cost || 0),
    0,
  )

  const weeklyTrendCards = [
    {
      label: 'Earned this week',
      value: `+${currentWeekEarnedCredits}`,
      helper: `${currentWeekJobCompletions.length} completed jobs`,
      delta: currentWeekEarnedCredits - previousWeekEarnedCredits,
      tone: 'earn',
    },
    {
      label: 'Spent this week',
      value: `-${currentWeekSpentCredits}`,
      helper: `${currentWeekRewardApprovals.length} approved rewards`,
      delta: currentWeekSpentCredits - previousWeekSpentCredits,
      tone: 'spend',
    },
    {
      label: 'Job completions',
      value: String(currentWeekJobCompletions.length),
      helper: `${previousWeekJobCompletions.length} last week`,
      delta: currentWeekJobCompletions.length - previousWeekJobCompletions.length,
      tone: 'save',
    },
    {
      label: 'Reward approvals',
      value: String(currentWeekRewardApprovals.length),
      helper: `${previousWeekRewardApprovals.length} last week`,
      delta: currentWeekRewardApprovals.length - previousWeekRewardApprovals.length,
      tone: 'spend',
    },
  ]

  const topDailyEarner = childDailyEarnings
    .slice()
    .sort((a, b) => b.earned - a.earned)[0] || null
  const topWeeklyEarner = childWeeklyEarnings
    .slice()
    .sort((a, b) => b.earned - a.earned)[0] || null
  const topDailySpender = childDailySpending
    .slice()
    .sort((a, b) => b.spent - a.spent)[0] || null
  const topWeeklySpender = childWeeklySpending
    .slice()
    .sort((a, b) => b.spent - a.spent)[0] || null
  const topCreditsHolder = childSavedTotals
    .slice()
    .sort((a, b) => b.saved - a.saved)[0] || null

  const completedGoalsByChildId = dashboard.goals
    .filter((goal) => goal.status === 'completed' && resolveChildId(goal.childId))
    .reduce((accumulator, goal) => {
      accumulator[goal.childId] = (accumulator[goal.childId] || 0) + 1
      return accumulator
    }, {})

  const familyContributionsByChildId = dashboard.goals
    .filter((goal) => !resolveChildId(goal.childId))
    .reduce((accumulator, goal) => {
      ;(goal.contributionHistory || []).forEach((entry) => {
        const id = resolveChildId(entry.childId)
        if (!id) {
          return
        }
        accumulator[id] = (accumulator[id] || 0) + (Number(entry.amount) || 0)
      })
      return accumulator
    }, {})

  const doneJobsByChildId = dashboard.jobs
    .filter((job) => job.status === 'done')
    .reduce((accumulator, job) => {
      const childId = resolveChildIdForJob(job)
      if (!childId) {
        return accumulator
      }
      accumulator[childId] = (accumulator[childId] || 0) + 1
      return accumulator
    }, {})

  const helperPoolJobsByChildId = dashboard.jobs
    .filter((job) => job.status === 'done' && !job.childId)
    .reduce((accumulator, job) => {
      const childId = resolveChildIdForJob(job)
      if (!childId) {
        return accumulator
      }
      accumulator[childId] = (accumulator[childId] || 0) + 1
      return accumulator
    }, {})

  const readingJobsByChildId = dashboard.jobs
    .filter((job) => job.status === 'done' && /read|book|reading/i.test(job.title || ''))
    .reduce((accumulator, job) => {
      const childId = resolveChildIdForJob(job)
      if (!childId) {
        return accumulator
      }
      accumulator[childId] = (accumulator[childId] || 0) + 1
      return accumulator
    }, {})

  const childAchievements = childProfiles
    .map((child) => {
      const badges = []
      if ((completedGoalsByChildId[child.id] || 0) >= 1) {
        badges.push({ id: 'first-goal', icon: '🏁', label: 'First Goal' })
      }
      if ((familyContributionsByChildId[child.id] || 0) >= 100) {
        badges.push({ id: 'consistent-contributor', icon: '🤝', label: 'Consistent Contributor' })
      }
      if ((helperPoolJobsByChildId[child.id] || 0) >= 3) {
        badges.push({ id: 'family-helper', icon: '🛟', label: 'Family Helper' })
      }
      if ((readingJobsByChildId[child.id] || 0) >= 5) {
        badges.push({ id: 'reading-champion', icon: '📚', label: 'Reading Champion' })
      }

      return { child, badges }
    })
    .filter((entry) => entry.badges.length > 0)

  const weeklyDoneDaysByChildId = dashboard.jobs
    .filter((job) => job.status === 'done')
    .reduce((accumulator, job) => {
      const childId = resolveChildIdForJob(job)
      const completedAt = toDate(job.completedAt || job.claimedAt)
      if (!childId || !completedAt) {
        return accumulator
      }
      const key = completedAt.toISOString().slice(0, 10)
      accumulator[childId] = accumulator[childId] || new Set()
      accumulator[childId].add(key)
      return accumulator
    }, {})

  const mostHelpful = childProfiles
    .map((child) => ({ child, value: doneJobsByChildId[child.id] || 0 }))
    .sort((left, right) => right.value - left.value)[0] || null

  const longestStreakKid = childProfiles
    .map((child) => ({ child, value: (weeklyDoneDaysByChildId[child.id] || new Set()).size }))
    .sort((left, right) => right.value - left.value)[0] || null

  const goalSetter = childProfiles
    .map((child) => ({ child, value: completedGoalsByChildId[child.id] || 0 }))
    .sort((left, right) => right.value - left.value)[0] || null

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

  function formatJobStatus(status) {
    if (status === 'claimed') {
      return 'In Progress'
    }
    if (status === 'open') {
      return 'Open'
    }
    if (status === 'done') {
      return 'Done'
    }
    return 'Unknown'
  }

  const activeTrendCards = trendView === 'daily' ? dailyTrendCards : weeklyTrendCards
  const trendHeading = trendView === 'daily' ? 'Today at a Glance' : 'This Week at a Glance'
  const trendDescription = trendView === 'daily'
    ? 'See how today is going compared with yesterday.'
    : 'See how this week is going compared with last week.'
  const trendDeltaLabel = trendView === 'daily' ? 'from yesterday' : 'from last week'
  const topWindowLabel = trendView === 'daily' ? 'today' : 'this week'
  const activeTopEarner = trendView === 'daily' ? topDailyEarner : topWeeklyEarner
  const activeTopSpender = trendView === 'daily' ? topDailySpender : topWeeklySpender

  function formatActivityTime(value) {
    const date = toDate(value)
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

  const latestCelebrationItem = activityFeedItems.find((item) => {
    if (!item?.at) {
      return false
    }
    if (item.kind !== 'goal-complete' && item.kind !== 'reward-fulfilled') {
      return false
    }

    const ageMs = nowMs - item.at.getTime()
    return ageMs >= 0 && ageMs <= (24 * 60 * 60 * 1000)
  })

  const childGoalMomentumById = childProfiles.reduce((accumulator, child) => {
    const bestGoal = dashboard.goals
      .filter((goal) => resolveChildId(goal.childId) === child.id)
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

    if (!bestGoal) {
      accumulator[child.id] = null
      return accumulator
    }

    const pct = Math.min(
      100,
      Math.round(((Number(bestGoal.saved) || 0) / Math.max(1, Number(bestGoal.target) || 1)) * 100),
    )

    accumulator[child.id] = {
      goal: bestGoal,
      pct,
    }

    return accumulator
  }, {})

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

  function displayGoalStatus(status) {
    if (status === 'ready_to_claim') {
      return 'Ready for Parent'
    }
    if (status === 'pending_parent_approval') {
      return 'Pending Parent'
    }
    if (status === 'countered') {
      return 'Countered'
    }
    if (status === 'completed') {
      return 'Completed'
    }
    return 'Saving'
  }

  function getActivityBadge(item) {
    if (item.kind === 'goal-complete') {
      return { label: 'Milestone', tone: 'milestone' }
    }
    if (item.kind === 'reward-fulfilled') {
      return { label: 'Delivered', tone: 'delivered' }
    }
    if (item.kind === 'reward-approved') {
      return { label: 'Approved', tone: 'approved' }
    }
    if (item.kind === 'goal-progress') {
      return { label: 'Progress', tone: 'progress' }
    }
    if (item.kind === 'job') {
      return { label: 'Win', tone: 'win' }
    }
    return { label: 'Update', tone: 'default' }
  }

  return (
    <>
      <TopStatusBar title={isParent ? 'Family Dashboard' : 'Home'} />
      <main className="phone-content home-grid">
        {loading ? <p className="status-note">Loading dashboard...</p> : null}
        {error ? <p className="status-note status-error">{error}</p> : null}

        {isParent ? (
          <>
            {latestCelebrationItem ? (
              <section className="panel celebration-panel celebration-pop home-col-full">
                <div className="celebration-confetti" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p className="panel-label">Family Celebration</p>
                <p className="panel-muted">{latestCelebrationItem.icon} {latestCelebrationItem.text}</p>
                <p className="panel-muted">{formatActivityTime(latestCelebrationItem.at)}</p>
              </section>
            ) : null}

            <section className="panel home-col-full">
              <div className="money-block">
                <div className="trend-panel-header">
                  <p className="panel-label">{trendHeading}</p>
                  <div className="trend-tabs" role="tablist" aria-label="Trend range">
                    <button
                      type="button"
                      className={trendView === 'daily' ? 'trend-tab trend-tab-active' : 'trend-tab'}
                      onClick={() => setTrendView('daily')}
                      aria-pressed={trendView === 'daily'}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      className={trendView === 'weekly' ? 'trend-tab trend-tab-active' : 'trend-tab'}
                      onClick={() => setTrendView('weekly')}
                      aria-pressed={trendView === 'weekly'}
                    >
                      Weekly
                    </button>
                  </div>
                </div>
                <p className="panel-muted home-section-subtitle">Family Economy Activity</p>
                {familyDashboardTopCardsEnabled ? (
                  <div className="family-podium">
                    <div className="family-score-card">
                      <small>Top Earner</small>
                      <strong>
                        {activeTopEarner ? `${activeTopEarner.child.avatar} ${activeTopEarner.child.displayName}` : 'No data'}
                      </strong>
                      <span>+{activeTopEarner?.earned || 0} {topWindowLabel}</span>
                    </div>
                    <div className="family-score-card">
                      <small>Top Credits</small>
                      <strong>
                        {topCreditsHolder ? `${topCreditsHolder.child.avatar} ${topCreditsHolder.child.displayName}` : 'No data'}
                      </strong>
                      <span>{topCreditsHolder?.saved || 0} credits total</span>
                    </div>
                    <div className="family-score-card">
                      <small>Top Spender</small>
                      <strong>
                        {activeTopSpender ? `${activeTopSpender.child.avatar} ${activeTopSpender.child.displayName}` : 'No data'}
                      </strong>
                      <span>-{activeTopSpender?.spent || 0} {topWindowLabel}</span>
                    </div>
                  </div>
                ) : null}
                <p className="panel-muted">{trendDescription}</p>
                <div className="family-trend-grid">
                  {activeTrendCards.map((card) => (
                    <div key={card.label} className="family-trend-card">
                      <small>{card.label}</small>
                      <strong>{card.value}</strong>
                      <span>{card.helper}</span>
                      <span
                        className={
                          card.delta > 0
                            ? 'family-trend-delta family-trend-delta-up'
                            : card.delta < 0
                              ? 'family-trend-delta family-trend-delta-down'
                              : 'family-trend-delta'
                        }
                      >
                        {card.delta > 0 ? '+' : ''}{card.delta} {trendDeltaLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {familyRecognitionEnabled ? (
              <section className="panel home-col-full">
                <p className="panel-label">Family Recognition</p>
                <p className="panel-muted home-section-subtitle">Celebrating positive habits and consistency</p>
                <div className="family-podium">
                  <div className="family-score-card">
                    <small>Most Helpful</small>
                    <strong>{mostHelpful ? `${mostHelpful.child.avatar} ${mostHelpful.child.displayName}` : 'No data'}</strong>
                    <span>{mostHelpful?.value || 0} jobs completed</span>
                  </div>
                  <div className="family-score-card">
                    <small>Longest Streak</small>
                    <strong>{longestStreakKid ? `${longestStreakKid.child.avatar} ${longestStreakKid.child.displayName}` : 'No data'}</strong>
                    <span>{longestStreakKid?.value || 0} active day(s)</span>
                  </div>
                  <div className="family-score-card">
                    <small>Goal Setter</small>
                    <strong>{goalSetter ? `${goalSetter.child.avatar} ${goalSetter.child.displayName}` : 'No data'}</strong>
                    <span>{goalSetter?.value || 0} completed goal(s)</span>
                  </div>
                </div>
              </section>
            ) : null}

            {achievementsEnabled ? (
              <section className="panel home-col-full">
                <p className="panel-label">Achievement Board</p>
                <p className="panel-muted home-section-subtitle">Milestones unlocked by family members</p>
                {childAchievements.length === 0 ? (
                  <p className="panel-muted">No achievements unlocked yet.</p>
                ) : (
                  <ul className="family-grid-list">
                    {childAchievements.map((entry) => (
                      <li key={`achievements:${entry.child.id}`}>
                        <span className="mission-main">{entry.child.avatar} {entry.child.displayName}</span>
                        <div className="limit-chip-row" style={{ marginTop: '0.45rem' }}>
                          {entry.badges.map((badge) => (
                            <span key={badge.id} className="limit-chip">{badge.icon} {badge.label}</span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            <section className="panel home-col-full">
              <p className="panel-label">Family Goal</p>
              <p className="panel-muted home-section-subtitle">The shared target everyone can build together.</p>
              <div className="money-section-card money-section-card--shared family-goal-hero" style={{ marginTop: '0.25rem' }}>
                {!familySavingsGoal ? (
                  <p className="panel-muted">No shared family goal yet. Create one in Savings with no child selected.</p>
                ) : (
                  <>
                    <p className="family-goal-kicker">🎯 FAMILY GOAL</p>
                    <p className="family-goal-name">{(familySavingsGoal.rewardTitle || familySavingsGoal.name || 'Family Goal').toUpperCase()}</p>
                    <div className="limit-chip-row">
                      <span className="limit-chip">{displayGoalStatus(familySavingsGoal.status)}</span>
                      <span className="limit-chip">{childProfiles.length} kids can contribute</span>
                    </div>
                    <p className="family-goal-math">{familySavingsGoal.saved} / {familySavingsGoal.target} Credits</p>
                    <p className="family-goal-percent">{familySavingsGoalPct}%</p>
                    <div className="xp-track xp-track-light">
                      <span style={{ width: `${familySavingsGoalPct}%` }}></span>
                    </div>
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

            <section className="panel home-col-full">
              <p className="panel-label">Kids At A Glance</p>
              <p className="panel-muted">Daily performance plus personal goal momentum for each child.</p>
              {childProfiles.length === 0 ? (
                <p className="panel-muted">No kids added yet.</p>
              ) : (
                <ul className="family-grid-list">
                  {childProfiles.map((child) => {
                    const earn = childDailyEarnings.find((item) => item.child.id === child.id)?.earned || 0
                    const spend = childDailySpending.find((item) => item.child.id === child.id)?.spent || 0
                    const save = childSavedTotals.find((item) => item.child.id === child.id)?.saved || 0
                    const childMomentum = childGoalMomentumById[child.id]
                    return (
                      <li key={child.id} className="family-kid-row">
                        <div className="family-kid-row-header">
                          <span className="mission-main">{child.avatar} {child.displayName}</span>
                          <span className="family-stat-pill family-stat-pill-save">{save} credits total</span>
                        </div>

                        <div className="family-kid-row-stats">
                          <span className="family-stat-pill family-stat-pill-earn">+{earn} earned today</span>
                          <span className="family-stat-pill family-stat-pill-spend">-{spend} spent today</span>
                        </div>

                        <div className="family-kid-row-goals">
                          <article className="family-kid-goal-card">
                            <small>Goal Progress</small>
                            {!childMomentum ? (
                              <p className="panel-muted">No personal goal yet.</p>
                            ) : (
                              <>
                                <strong>{childMomentum.goal.rewardTitle || childMomentum.goal.name}</strong>
                                <span className="family-insight-note">
                                  {displayGoalStatus(childMomentum.goal.status)} • {childMomentum.goal.saved}/{childMomentum.goal.target} credits
                                </span>
                                <div className="xp-track xp-track-light">
                                  <span style={{ width: `${childMomentum.pct}%` }}></span>
                                </div>
                              </>
                            )}
                          </article>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

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
                            {formatJobStatus(job.status)}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="panel home-col-full">
              <p className="panel-label">Recent Activity</p>
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
                          <span className="job-status-label">{formatActivityTime(item.at)}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        ) : (
          <>
            {latestCelebrationItem ? (
              <section className="panel celebration-panel celebration-pop home-col-full">
                <div className="celebration-confetti" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p className="panel-label">Celebrate</p>
                <p className="panel-muted">{latestCelebrationItem.icon} {latestCelebrationItem.text}</p>
              </section>
            ) : null}

            {!loading && !error && dashboard.jobs.length === 0 ? (
              <p className="status-note">
                Finish onboarding to start seeing jobs and rewards here.
              </p>
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
                    <span className="limit-chip">{displayGoalStatus(kidGoalSpotlight.status)}</span>
                    <span className="limit-chip">{kidGoalSpotlight.saved}/{kidGoalSpotlight.target} credits</span>
                    <span className="limit-chip">{Math.max(0, Number(kidGoalSpotlight.target) - Number(kidGoalSpotlight.saved || 0))} to go</span>
                  </div>
                  <div className="xp-track xp-track-light">
                    <span style={{ width: `${kidGoalProgressPct}%` }}></span>
                  </div>
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
                    const badge = getActivityBadge(item)
                    return (
                      <li key={item.id}>
                        <span className="mission-main">{item.icon} {item.text}</span>
                        <span className={`activity-pill activity-pill-${badge.tone}`}>{badge.label}</span>
                        <span className="job-status-label">{formatActivityTime(item.at)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
      <BottomTabBar />
    </>
  )
}
