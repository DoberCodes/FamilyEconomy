import { useEffect, useState } from 'react'
import BottomTabBar from '../../components/mobile/BottomTabBar'
import BalanceCard from '../../components/mobile/cards/BalanceCard'
import LevelCard from '../../components/mobile/cards/LevelCard'
import JobsCard from '../../components/mobile/cards/MissionsCard'
import StreakCard from '../../components/mobile/cards/StreakCard'
import { useAuth } from '../../context/AuthContext'
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
      } catch {
        if (!mounted) {
          return
        }

        setDashboard(emptyDashboard)
        setStore({ rewards: [], requests: [] })
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

  const todayStart = startOfToday()

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
    const saved = dashboard.goals
      .filter((goal) => goal.childId === child.id)
      .reduce((sum, goal) => sum + Number(goal.saved || 0), 0)

    return {
      child,
      saved,
    }
  })

  const topEarner = childDailyEarnings
    .slice()
    .sort((a, b) => b.earned - a.earned)[0] || null
  const topSpender = childDailySpending
    .slice()
    .sort((a, b) => b.spent - a.spent)[0] || null
  const topSaver = childSavedTotals
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

  return (
    <>
      <header className="status-row">
        <span>9:41</span>
        <span aria-hidden="true">...</span>
      </header>
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
                  <small>Top Saver</small>
                  <strong>
                    {topSaver ? `${topSaver.child.avatar} ${topSaver.child.displayName}` : 'No data'}
                  </strong>
                  <span>{topSaver?.saved || 0} saved</span>
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
                        <span className="family-stat-pill family-stat-pill-save">{save} saved total</span>
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
