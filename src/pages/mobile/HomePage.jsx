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
  isWithinDateRange,
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
    familyDashboardTopCardsEnabled,
    achievementsEnabled,
    familyRecognitionEnabled,
    loading,
    error,
  } = useFamilyHomeData()
  const [nowMs, setNowMs] = useState(() => Date.now())

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

  function buildDirectionDelta(currentValue, previousValue, reverseGood = false) {
    const current = Number(currentValue) || 0
    const previous = Number(previousValue) || 0
    const delta = current - previous

    if (delta === 0) {
      return {
        delta,
        label: 'flat vs last month',
        tone: 'flat',
      }
    }

    const rawTone = delta > 0 ? 'up' : 'down'
    const tone = reverseGood ? (rawTone === 'up' ? 'down' : 'up') : rawTone

    return {
      delta,
      label: `${delta > 0 ? '+' : ''}${delta} vs last month`,
      tone,
    }
  }

  const todayStart = startOfToday()
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const thisWeekStart = startOfWeek()
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

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

  const topWeeklyEarner = childWeeklyEarnings
    .slice()
    .sort((a, b) => b.earned - a.earned)[0] || null

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

  const weeklyDoneJobsByChildId = dashboard.jobs
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

  const recentAchievements = childProfiles
    .flatMap((child) => {
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
        if (contributionTotal >= 100) {
          contributorBadgeDate = entry.at
        }
      })

      const helperJobDates = dashboard.jobs
        .filter((job) => job.status === 'done' && !job.childId && resolveChildIdForJob(job) === child.id)
        .map((job) => toDate(job.completedAt || job.claimedAt))
        .filter(Boolean)
        .sort((left, right) => left.getTime() - right.getTime())

      const readingJobDates = dashboard.jobs
        .filter((job) => job.status === 'done' && resolveChildIdForJob(job) === child.id && /read|book|reading/i.test(job.title || ''))
        .map((job) => toDate(job.completedAt || job.claimedAt))
        .filter(Boolean)
        .sort((left, right) => left.getTime() - right.getTime())

      return [
        {
          id: `achievement:first-goal:${child.id}`,
          icon: '🏁',
          label: 'First Goal',
          childName: child.displayName,
          at: findNthDate(completedGoalDates, 1),
        },
        {
          id: `achievement:consistent-contributor:${child.id}`,
          icon: '🤝',
          label: 'Consistent Contributor',
          childName: child.displayName,
          at: contributorBadgeDate,
        },
        {
          id: `achievement:family-helper:${child.id}`,
          icon: '🛟',
          label: 'Family Helper',
          childName: child.displayName,
          at: findNthDate(helperJobDates, 3),
        },
        {
          id: `achievement:reading-champion:${child.id}`,
          icon: '📚',
          label: 'Reading Champion',
          childName: child.displayName,
          at: findNthDate(readingJobDates, 5),
        },
      ].filter((achievement) => achievement.at)
    })
    .sort((left, right) => right.at.getTime() - left.at.getTime())
    .slice(0, 6)

  const mostHelpful = childProfiles
    .map((child) => ({ child, value: weeklyDoneJobsByChildId[child.id] || 0 }))
    .sort((left, right) => right.value - left.value)[0] || null

  const goalSetter = childProfiles
    .map((child) => ({ child, value: weeklyCompletedGoalsByChildId[child.id] || 0 }))
    .sort((left, right) => right.value - left.value)[0] || null

  const topContributor = childProfiles
    .map((child) => ({
      child,
      contribution: familyWeeklyContributionsByChildId[child.id] || 0,
    }))
    .sort((left, right) => {
      if (right.contribution !== left.contribution) {
        return right.contribution - left.contribution
      }
      return left.child.displayName.localeCompare(right.child.displayName)
    })[0] || null

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

  const currentDate = toDate(nowMs) || new Date()
  const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)

  function getMonthlyDoneJobs(start, end) {
    return dashboard.jobs.filter((job) => {
      if (job.status !== 'done') {
        return false
      }
      const completedAt = toDate(job.completedAt)
      return isWithinDateRange(completedAt, start, end)
    })
  }

  function getMonthlyCompletedGoals(start, end) {
    return dashboard.goals.filter((goal) => {
      const completedAt = toDate(goal.completedAt)
      return isWithinDateRange(completedAt, start, end)
    }).length
  }

  function getFamilyContributionTotalsByWindow(start, end) {
    return dashboard.goals
      .filter((goal) => !resolveChildId(goal.childId))
      .reduce((sum, goal) => {
        const scopedContribution = (goal.contributionHistory || []).reduce((goalSum, entry) => {
          const createdAt = toDate(entry.createdAt)
          if (!isWithinDateRange(createdAt, start, end)) {
            return goalSum
          }

          return goalSum + (Number(entry.amount) || 0)
        }, 0)

        return sum + scopedContribution
      }, 0)
  }

  function getEngagedChildrenCount(start, end) {
    const engagedIds = new Set()

    dashboard.jobs.forEach((job) => {
      if (job.status !== 'done') {
        return
      }
      const completedAt = toDate(job.completedAt)
      if (!isWithinDateRange(completedAt, start, end)) {
        return
      }

      const childId = resolveChildIdForJob(job)
      if (childId) {
        engagedIds.add(childId)
      }
    })

    dashboard.goals.forEach((goal) => {
      ;(goal.contributionHistory || []).forEach((entry) => {
        const createdAt = toDate(entry.createdAt)
        if (!isWithinDateRange(createdAt, start, end)) {
          return
        }

        const childId = resolveChildId(entry.childId)
        if (childId) {
          engagedIds.add(childId)
        }
      })
    })

    return engagedIds.size
  }

  const currentMonthDoneJobs = getMonthlyDoneJobs(currentMonthStart, currentDate)
  const previousMonthDoneJobs = getMonthlyDoneJobs(previousMonthStart, currentMonthStart)
  const currentMonthEarnedCredits = currentMonthDoneJobs.reduce((sum, job) => sum + getJobCreditAmount(job), 0)
  const previousMonthEarnedCredits = previousMonthDoneJobs.reduce((sum, job) => sum + getJobCreditAmount(job), 0)

  const currentMonthCompletedGoals = getMonthlyCompletedGoals(currentMonthStart, currentDate)
  const previousMonthCompletedGoals = getMonthlyCompletedGoals(previousMonthStart, currentMonthStart)

  const currentMonthFamilyContribution = getFamilyContributionTotalsByWindow(currentMonthStart, currentDate)
  const previousMonthFamilyContribution = getFamilyContributionTotalsByWindow(previousMonthStart, currentMonthStart)

  const currentMonthEngagement = getEngagedChildrenCount(currentMonthStart, currentDate)
  const previousMonthEngagement = getEngagedChildrenCount(previousMonthStart, currentMonthStart)

  const earnedDirection = buildDirectionDelta(currentMonthEarnedCredits, previousMonthEarnedCredits)
  const goalsDirection = buildDirectionDelta(currentMonthCompletedGoals, previousMonthCompletedGoals)
  const engagementDirection = buildDirectionDelta(currentMonthEngagement, previousMonthEngagement)
  const communityFundDirection = buildDirectionDelta(currentMonthFamilyContribution, previousMonthFamilyContribution)

  const familySnapshotCards = [
    {
      key: 'economy-flow',
      label: 'Economy Flow',
      value: `${currentMonthEarnedCredits} credits earned`,
      helper: `${currentMonthDoneJobs.length} jobs completed this month`,
      direction: earnedDirection,
    },
    {
      key: 'goal-progress',
      label: 'Goals Moving Forward',
      value: `${currentMonthCompletedGoals} goals completed`,
      helper: `${dashboard.goals.filter((goal) => goal.status === 'active').length} active goals in progress`,
      direction: goalsDirection,
    },
    {
      key: 'participation',
      label: 'Family Participation',
      value: `${currentMonthEngagement}/${childProfiles.length || 1} kids active`,
      helper: 'Completed jobs or contributed to a goal',
      direction: engagementDirection,
    },
    {
      key: 'community-fund',
      label: familyFundLabel,
      value: familyFundEnabled
        ? `${familyFundBalance} credits available`
        : 'Feature is off',
      helper: familyFundEnabled
        ? familySavingsGoal
          ? `+${currentMonthFamilyContribution} added this month toward ${(familySavingsGoal.rewardTitle || familySavingsGoal.name || 'family goal').toLowerCase()}`
          : `+${currentMonthFamilyContribution} added this month for future family goals`
        : 'Enable it in Parent Actions or setup to power shared family goals',
      direction: communityFundDirection,
    },
  ]

  const focusThisWeek = (() => {
    if (engagementDirection.tone === 'down') {
      return {
        title: 'Boost Family Participation',
        detail: 'Participation dropped vs last month. Add two shared jobs that any child can claim.',
        metric: `${currentMonthEngagement}/${childProfiles.length || 1} kids active this month`,
        tone: 'down',
      }
    }

    if (goalsDirection.tone === 'down') {
      return {
        title: 'Unblock Goal Momentum',
        detail: 'Completed goals are down. Pick one active goal and schedule a focused contribution day.',
        metric: `${currentMonthCompletedGoals} goals completed this month`,
        tone: 'down',
      }
    }

    if (communityFundDirection.tone === 'down') {
      return {
        title: 'Reinforce Community Funding',
        detail: 'Family goal contributions slowed. Run a short family challenge tied to the shared goal.',
        metric: `${familyFundBalance} available • +${currentMonthFamilyContribution} this month`,
        tone: 'down',
      }
    }

    if (earnedDirection.tone === 'down') {
      return {
        title: 'Recover Economy Flow',
        detail: 'Credits earned are down. Rebalance open jobs so each child has at least one quick win.',
        metric: `${currentMonthEarnedCredits} credits earned this month`,
        tone: 'down',
      }
    }

    return {
      title: 'Scale What Is Working',
      detail: 'Momentum is positive. Keep this cadence and introduce one stretch goal for next week.',
      metric: `${currentMonthEarnedCredits} earned • ${currentMonthCompletedGoals} goals completed`,
      tone: 'up',
    }
  })()

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

            <section className="panel home-col-full family-snapshot-panel">
              <p className="panel-label">Family Snapshot</p>
              <p className="panel-muted home-section-subtitle">
                Direction over the last month, compared with the month before.
              </p>
              <div className="family-insight-grid">
                {familySnapshotCards.map((card) => (
                  <article key={card.key} className="family-insight-card">
                    <small>{card.label}</small>
                    <strong>{card.value}</strong>
                    <span className="family-insight-note">{card.helper}</span>
                    <span className={`family-direction-pill family-direction-pill-${card.direction.tone}`}>
                      {card.direction.label}
                    </span>
                  </article>
                ))}
              </div>
              <article className={`family-focus-card family-focus-card-${focusThisWeek.tone}`}>
                <small>Focus This Week</small>
                <strong>{focusThisWeek.title}</strong>
                <p>{focusThisWeek.detail}</p>
                <span>{focusThisWeek.metric}</span>
              </article>
            </section>

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
                  <div className="family-podium family-podium-compact">
                    {familyDashboardTopCardsEnabled ? (
                      <>
                        <div className="family-score-card family-score-card-compact">
                          <small>Top Earner</small>
                          <strong>
                            {topWeeklyEarner ? `${topWeeklyEarner.child.avatar} ${topWeeklyEarner.child.displayName}` : 'No data'}
                          </strong>
                        </div>
                        <div className="family-score-card family-score-card-compact">
                          <small>Top Contributor</small>
                          <strong>
                            {topContributor ? `${topContributor.child.avatar} ${topContributor.child.displayName}` : 'No data'}
                          </strong>
                        </div>
                      </>
                    ) : null}
                    <div className="family-score-card family-score-card-compact">
                      <small>Most Helpful</small>
                      <strong>{mostHelpful ? `${mostHelpful.child.avatar} ${mostHelpful.child.displayName}` : 'No data'}</strong>
                    </div>
                    <div className="family-score-card family-score-card-compact">
                      <small>Goal Setter</small>
                      <strong>{goalSetter ? `${goalSetter.child.avatar} ${goalSetter.child.displayName}` : 'No data'}</strong>
                    </div>
                  </div>
                ) : null}

                {achievementsEnabled ? (
                  <>
                    <p className="panel-muted home-section-subtitle family-recognition-achievements-title">Recent Achievements</p>
                    {recentAchievements.length === 0 ? (
                      <p className="panel-muted">No recent achievements unlocked yet.</p>
                    ) : (
                      <ul className="family-achievement-feed">
                        {recentAchievements.map((achievement) => (
                          <li key={achievement.id} className="family-achievement-item">
                            <span className="family-achievement-icon" aria-hidden="true">{achievement.icon}</span>
                            <span className="family-achievement-label">{achievement.label}</span>
                            <span className="family-achievement-time">
                              {achievement.childName} earned this {formatRelativeActivityTime(achievement.at, nowMs)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
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
                          <span className="job-status-label">{formatRelativeActivityTime(item.at, nowMs)}</span>
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
