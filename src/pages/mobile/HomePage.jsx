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
  getFamilyConsequenceEvents,
  getFamilyJobCheckRequests,
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
  const [jobChecks, setJobChecks] = useState([])
  const [consequenceEvents, setConsequenceEvents] = useState([])
  const [childProfiles, setChildProfiles] = useState([])
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
        const [dashboardResult, storeResult, onboardingResult, checksResult, consequencesResult] = await Promise.all([
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
          getFamilyJobCheckRequests({
            familyId,
            userId,
            userRole,
            selectedChildId: isParent ? null : activeChildProfile?.id,
          }),
          getFamilyConsequenceEvents({
            familyId,
            userId,
            userRole,
            selectedChildId: isParent ? null : activeChildProfile?.id,
          }),
        ])

        if (!mounted) {
          return
        }

        setDashboard(dashboardResult.data)
        setStore(storeResult.data)
        setJobChecks(checksResult.data.requests || [])
        setConsequenceEvents(consequencesResult.data.events || [])
        setChildProfiles(onboardingResult.data.childProfiles || [])
      } catch {
        if (!mounted) {
          return
        }

        setDashboard(emptyDashboard)
        setStore({ rewards: [], requests: [] })
        setJobChecks([])
        setConsequenceEvents([])
        setChildProfiles([])
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
      .reduce((sum, job) => sum + Number(job.points || 0), 0)

    return {
      child,
      earned,
    }
  })

  const childDailySpending = childProfiles.map((child) => {
    const spent = store.requests
      .filter((request) => request.status === 'approved')
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
    return request.status === 'approved' && isWithinRange(reviewedAt, todayStart, new Date())
  })

  const previousDayRewardApprovals = store.requests.filter((request) => {
    const reviewedAt = toDate(request.reviewedAt || request.createdAt)
    return request.status === 'approved' && isWithinRange(reviewedAt, yesterdayStart, todayStart)
  })

  const currentDayEarnedCredits = currentDayJobCompletions.reduce(
    (sum, job) => sum + Number(job.points || 0),
    0,
  )
  const previousDayEarnedCredits = previousDayJobCompletions.reduce(
    (sum, job) => sum + Number(job.points || 0),
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
    return request.status === 'approved' && isWithinRange(reviewedAt, thisWeekStart, new Date())
  })

  const previousWeekRewardApprovals = store.requests.filter((request) => {
    const reviewedAt = toDate(request.reviewedAt || request.createdAt)
    return request.status === 'approved' && isWithinRange(reviewedAt, lastWeekStart, thisWeekStart)
  })

  const currentWeekEarnedCredits = currentWeekJobCompletions.reduce(
    (sum, job) => sum + Number(job.points || 0),
    0,
  )
  const previousWeekEarnedCredits = previousWeekJobCompletions.reduce(
    (sum, job) => sum + Number(job.points || 0),
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

  const thisWeekConsequenceEvents = consequenceEvents.filter((event) => {
    const createdAt = toDate(event.createdAt)
    return isWithinRange(createdAt, thisWeekStart, new Date())
  })

  const lastWeekConsequenceEvents = consequenceEvents.filter((event) => {
    const createdAt = toDate(event.createdAt)
    return isWithinRange(createdAt, lastWeekStart, thisWeekStart)
  })

  const missedCounts = thisWeekConsequenceEvents
    .filter((event) => event.type === 'job_missed')
    .reduce((accumulator, event) => {
      const key = event.jobTitle || 'Unknown job'
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {})

  const mostMissedJobs = Object.entries(missedCounts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const deniedChecksThisWeek = thisWeekConsequenceEvents.filter(
    (event) => event.type === 'job_check_denied',
  )
  const deniedChecksLastWeek = lastWeekConsequenceEvents.filter(
    (event) => event.type === 'job_check_denied',
  )
  const deniedPenaltyThisWeek = deniedChecksThisWeek.reduce(
    (sum, event) => sum + Number(event.penaltyCredits || 0),
    0,
  )
  const deniedPenaltyLastWeek = deniedChecksLastWeek.reduce(
    (sum, event) => sum + Number(event.penaltyCredits || 0),
    0,
  )

  const dynamicPressureRewards = (store.rewards || [])
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
        adjustedCost,
        baseCost,
        demandCount: Number(reward.pricingMeta.demandCount || 0),
        upliftPct,
      }
    })
    .sort((a, b) => {
      if (b.upliftPct !== a.upliftPct) {
        return b.upliftPct - a.upliftPct
      }
      return b.demandCount - a.demandCount
    })
    .slice(0, 3)

  const reviewedChecks = jobChecks.filter((request) => {
    const reviewedAt = toDate(request.reviewedAt)
    return (request.status === 'approved' || request.status === 'denied')
      && isWithinRange(reviewedAt, thisWeekStart, new Date())
  })

  const reviewDurationsHours = reviewedChecks
    .map((request) => {
      const createdAt = toDate(request.createdAt)
      const reviewedAt = toDate(request.reviewedAt)

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

  const pendingChecks = jobChecks.filter((request) => request.status === 'pending')
  const stalePendingChecks = pendingChecks.filter((request) => {
    const createdAt = toDate(request.createdAt)
    if (!createdAt) {
      return false
    }
    const ageHours = (nowMs - createdAt.getTime()) / (1000 * 60 * 60)
    return ageHours >= 24
  })
  const pendingRewardRequests = store.requests.filter((request) => request.status === 'pending')

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

  const topEarner = childDailyEarnings
    .slice()
    .sort((a, b) => b.earned - a.earned)[0] || null
  const topSpender = childDailySpending
    .slice()
    .sort((a, b) => b.spent - a.spent)[0] || null
  const topCreditsHolder = childSavedTotals
    .slice()
    .sort((a, b) => b.saved - a.saved)[0] || null

  const totalSavingsTarget = dashboard.goals.reduce(
    (sum, goal) => sum + Number(goal.target || 0),
    0,
  )
  const totalSavingsSaved = dashboard.goals.reduce(
    (sum, goal) => sum + Number(goal.saved || 0),
    0,
  )
  const overallJobEarnings = dashboard.jobs.reduce((sum, job) => {
    if (job.status === 'done') {
      return sum + Number(job.points || 0)
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

  const rewardPurchaseCounts = store.requests
    .filter((request) => request.status === 'approved')
    .reduce((accumulator, request) => {
      const key = request.rewardTitle || 'Unknown reward'
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {})

  const commonRewards = Object.entries(rewardPurchaseCounts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

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
  const trendHeading = trendView === 'daily' ? 'Daily Trends' : 'Weekly Trends'
  const trendDescription = trendView === 'daily'
    ? 'Compare today with yesterday to catch near-term changes.'
    : 'Compare this week with the previous 7-day window.'
  const trendDeltaLabel = trendView === 'daily' ? 'vs yesterday' : 'vs last week'

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

  return (
    <>
      <TopStatusBar title="Home" />
      <main className="phone-content home-grid">
        {loading ? <p className="status-note">Loading dashboard...</p> : null}
        {error ? <p className="status-note status-error">{error}</p> : null}

        {isParent ? (
          <>
            <section className="panel home-col-full">
              <p className="panel-label">Top Today</p>
              <div className="family-podium">
                <div className="family-score-card">
                  <small>Top Earner</small>
                  <strong>
                    {topEarner ? `${topEarner.child.avatar} ${topEarner.child.displayName}` : 'No data'}
                  </strong>
                  <span>+{topEarner?.earned || 0} today</span>
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
                    {topSpender ? `${topSpender.child.avatar} ${topSpender.child.displayName}` : 'No data'}
                  </strong>
                  <span>-{topSpender?.spent || 0} today</span>
                </div>
              </div>
            </section>

            <section className="panel home-col-full">
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
            </section>

            <section className="panel home-col-full">
              <p className="panel-label">Deeper Family Insights</p>
              <p className="panel-muted">Weekly pressure points and parent workload signals.</p>
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
                    {pendingRewardRequests.length} pending reward requests
                  </span>
                </article>
              </div>
            </section>

            <section className="panel home-col-full">
              <p className="panel-label">Kids At A Glance</p>
              {childProfiles.length === 0 ? (
                <p className="panel-muted">No kids added yet.</p>
              ) : (
                <ul className="family-grid-list">
                  {childProfiles.map((child) => {
                    const earn = childDailyEarnings.find((item) => item.child.id === child.id)?.earned || 0
                    const spend = childDailySpending.find((item) => item.child.id === child.id)?.spent || 0
                    const save = childSavedTotals.find((item) => item.child.id === child.id)?.saved || 0
                    return (
                      <li key={child.id}>
                        <span className="mission-main">{child.avatar} {child.displayName}</span>
                        <span className="family-stat-pill family-stat-pill-earn">+{earn} earned today</span>
                        <span className="family-stat-pill family-stat-pill-save">{save} credits total</span>
                        <span className="family-stat-pill family-stat-pill-spend">-{spend} spent today</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="panel">
              <p className="panel-label">Family Savings</p>
              <p className="panel-muted">
                {totalSavingsSaved} / {totalSavingsTarget || 0} credits across all goals
              </p>
              {dashboard.goals.length === 0 ? (
                <p className="panel-muted">No savings goals yet.</p>
              ) : (
                <ul className="goal-list-simple">
                  {dashboard.goals.map((goal) => {
                    const pct = Math.round((goal.saved / goal.target) * 100)
                    return (
                      <li key={`${goal.childId || 'family'}:${goal.name}`}>
                        <p>
                          {goal.name}
                          {' '}
                          {goal.childId ? childBadge(goal.childId) : <span className="family-badge">Family</span>}
                        </p>
                        <small>
                          {goal.saved}/{goal.target} ({pct}%)
                        </small>
                        <div className="xp-track xp-track-light">
                          <span style={{ width: `${pct}%` }}></span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="panel">
              <p className="panel-label">Commonly Bought Rewards</p>
              {commonRewards.length === 0 ? (
                <p className="panel-muted">No approved reward history yet.</p>
              ) : (
                <ul className="mission-list">
                  {commonRewards.map((reward) => (
                    <li key={reward.title}>
                      <span className="mission-main">🎁 {reward.title}</span>
                      <span className="job-status-label">{reward.count} approvals</span>
                    </li>
                  ))}
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
                      <span className="mission-main">
                        <em aria-hidden="true">{job.icon}</em>
                        {job.title}
                      </span>
                      <span className="mission-reward">+ {job.points}</span>
                      <span>
                        {ownerId
                          ? childBadge(ownerId)
                          : <span className="family-badge">Unclaimed</span>}
                      </span>
                      <span className={`family-status-pill family-status-${job.status}`}>
                        {formatJobStatus(job.status)}
                      </span>
                    </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        ) : (
          <>
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
          </>
        )}
      </main>
      <BottomTabBar />
    </>
  )
}
