import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import BalanceCard from '../../components/mobile/cards/BalanceCard'
import LevelCard from '../../components/mobile/cards/LevelCard'
import StreakCard from '../../components/mobile/cards/StreakCard'
import { useAuth } from '../../context/AuthContext'
import {
  claimJob,
  createGoal,
  getFamilyDashboard,
  getFamilyJobCheckRequests,
  getFamilyStoreData,
  getHouseholdOnboardingData,
  requestJobCheck,
  requestReward,
  setChildSessionCode,
} from '../../services/familyEconomyService'

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'statement', label: 'Money' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'savings', label: 'Savings' },
]

const emptyDashboard = {
  profileName: '',
  level: { current: 1, xp: 0, nextXp: 500 },
  balance: { credits: 0 },
  jobs: [],
  goals: [],
  streakDays: 0,
}

export default function KidProfilePage() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const {
    familyId,
    userId,
    userRole,
    activeChildProfile,
    setActiveChildProfile,
  } = useAuth()

  const [childProfiles, setChildProfiles] = useState([])
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [storeData, setStoreData] = useState({ rewards: [], requests: [] })
  const [jobCheckRequests, setJobCheckRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requiresSessionCode, setRequiresSessionCode] = useState(false)
  const [childHasSessionCode, setChildHasSessionCode] = useState(false)
  const [sessionCodeInput, setSessionCodeInput] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [sessionUnlocked, setSessionUnlocked] = useState(false)
  const [celebrationMessage, setCelebrationMessage] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [claimingJobId, setClaimingJobId] = useState('')
  const [requestingRewardId, setRequestingRewardId] = useState('')
  const [requestingCheckJobId, setRequestingCheckJobId] = useState('')
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('300')

  const resolvedChild = useMemo(
    () => childProfiles.find((child) => child.id === childId) || activeChildProfile,
    [childProfiles, childId, activeChildProfile],
  )

  const updateCreditsCelebration = useCallback((selectedChildId, nextCredits) => {
    if (!familyId || !selectedChildId) {
      return
    }

    const credits = Number(nextCredits) || 0
    const storageKey = `family-economy-last-seen-credits:${familyId}:${selectedChildId}`
    const raw = localStorage.getItem(storageKey)

    if (raw === null) {
      localStorage.setItem(storageKey, String(credits))
      return
    }

    const previousCredits = Number(raw)
    if (!Number.isFinite(previousCredits)) {
      localStorage.setItem(storageKey, String(credits))
      return
    }

    if (credits > previousCredits) {
      const gained = credits - previousCredits
      setCelebrationMessage(`Celebration! You gained ${gained} credits!`)
    }

    localStorage.setItem(storageKey, String(credits))
  }, [familyId])

  useEffect(() => {
    let cancelled = false

    async function bootstrapKidSession() {
      setLoading(true)
      setError('')
      setUnlockError('')
      setSessionCodeInput('')
      setSessionUnlocked(false)
      setCelebrationMessage('')

      try {
        const onboarding = await getHouseholdOnboardingData({ familyId, userId, userRole })
        const children = onboarding.data.childProfiles || []

        if (cancelled) {
          return
        }

        setChildProfiles(children)

        const selected = children.find((child) => child.id === childId)
        if (!selected) {
          setError('Child profile not found. Select a child tile again.')
          setLoading(false)
          return
        }

        setActiveChildProfile(selected)

        const lockEnabled = Boolean(
          onboarding.data.family?.childSessionSecurityEnabled && selected.sessionCodeEnabled,
        )

        setChildHasSessionCode(Boolean(selected.sessionCodeEnabled))
        setRequiresSessionCode(lockEnabled)

        if (lockEnabled) {
          setLoading(false)
          return
        }

        setSessionUnlocked(true)

        const [dashboardResult, storeResult] = await Promise.all([
          getFamilyDashboard({
            familyId,
            userId,
            userRole,
            selectedChildId: selected.id,
          }),
          getFamilyStoreData({
            familyId,
            userId,
            userRole,
            selectedChildId: selected.id,
          }),
        ])
        const checkResult = await getFamilyJobCheckRequests({
          familyId,
          userId,
          userRole,
          selectedChildId: selected.id,
        })

        if (cancelled) {
          return
        }

        updateCreditsCelebration(selected.id, dashboardResult.data.balance?.credits)
        setDashboard(dashboardResult.data)
        setStoreData(storeResult.data)
        setJobCheckRequests(checkResult.data.requests)
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError.message || 'Could not load child profile.')
          setDashboard(emptyDashboard)
          setStoreData({ rewards: [], requests: [] })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    bootstrapKidSession()

    return () => {
      cancelled = true
    }
  }, [
    childId,
    familyId,
    userId,
    userRole,
    setActiveChildProfile,
    updateCreditsCelebration,
  ])

  async function handleUnlockSession(event) {
    event.preventDefault()
    setUnlockError('')

    const selected = childProfiles.find((child) => child.id === childId)
    if (!selected) {
      setUnlockError('Child profile not found.')
      return
    }

    if (!selected.sessionCodeEnabled || sessionCodeInput.trim() !== selected.sessionCode) {
      setUnlockError('Incorrect child session code.')
      return
    }

    setLoading(true)

    try {
      const [dashboardResult, storeResult] = await Promise.all([
        getFamilyDashboard({
          familyId,
          userId,
          userRole,
          selectedChildId: selected.id,
        }),
        getFamilyStoreData({
          familyId,
          userId,
          userRole,
          selectedChildId: selected.id,
        }),
      ])
      const checkResult = await getFamilyJobCheckRequests({
        familyId,
        userId,
        userRole,
        selectedChildId: selected.id,
      })

      updateCreditsCelebration(selected.id, dashboardResult.data.balance?.credits)
      setDashboard(dashboardResult.data)
      setStoreData(storeResult.data)
      setJobCheckRequests(checkResult.data.requests)
      setSessionUnlocked(true)
      setSessionCodeInput('')
    } catch (caughtError) {
      setUnlockError(caughtError.message || 'Could not unlock child session.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateChildSessionCode(event) {
    event.preventDefault()
    setUnlockError('')

    if (!/^\d{4}$/.test(sessionCodeInput.trim())) {
      setUnlockError('Set a 4-digit child session code.')
      return
    }

    const selected = childProfiles.find((child) => child.id === childId)
    if (!selected) {
      setUnlockError('Child profile not found.')
      return
    }

    if (!selected.allowChildSetSessionCode) {
      setUnlockError('Parent has disabled child PIN setup for this child.')
      return
    }

    setLoading(true)

    try {
      await setChildSessionCode(selected.id, sessionCodeInput.trim(), {
        familyId,
        userId,
        userRole,
      })

      const [dashboardResult, storeResult] = await Promise.all([
        getFamilyDashboard({
          familyId,
          userId,
          userRole,
          selectedChildId: selected.id,
        }),
        getFamilyStoreData({
          familyId,
          userId,
          userRole,
          selectedChildId: selected.id,
        }),
      ])

      updateCreditsCelebration(selected.id, dashboardResult.data.balance?.credits)
      setDashboard(dashboardResult.data)
      setStoreData(storeResult.data)
      setChildHasSessionCode(true)
      setSessionUnlocked(true)
      setSessionCodeInput('')
    } catch (caughtError) {
      setUnlockError(caughtError.message || 'Could not set child session code.')
    } finally {
      setLoading(false)
    }
  }

  function handleExitProfile() {
    setActiveChildProfile(null)
    setSessionUnlocked(false)
    setSessionCodeInput('')
    setRequiresSessionCode(false)
    setCelebrationMessage('')
    navigate('/mobile/children')
  }

  async function refreshChildData(selectedChildId) {
    const [dashboardResult, storeResult, checkResult] = await Promise.all([
      getFamilyDashboard({
        familyId,
        userId,
        userRole,
        selectedChildId,
      }),
      getFamilyStoreData({
        familyId,
        userId,
        userRole,
        selectedChildId,
      }),
      getFamilyJobCheckRequests({
        familyId,
        userId,
        userRole,
        selectedChildId,
      }),
    ])

    updateCreditsCelebration(selectedChildId, dashboardResult.data.balance?.credits)
    setDashboard(dashboardResult.data)
    setStoreData(storeResult.data)
    setJobCheckRequests(checkResult.data.requests)
  }

  async function handleRequestJobCheck(job) {
    if (!resolvedChild?.id || !job?.id) {
      return
    }

    setRequestingCheckJobId(job.id)
    setError('')

    try {
      await requestJobCheck(job, {
        familyId,
        userId: resolvedChild.id,
        userRole: 'kid',
      })
      await refreshChildData(resolvedChild.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not request a job check.')
    } finally {
      setRequestingCheckJobId('')
    }
  }

  async function handleClaimJob(job) {
    if (!resolvedChild?.id || !job?.id) {
      return
    }

    setClaimingJobId(job.id)
    setError('')

    try {
      await claimJob(job.id, {
        familyId,
        userId: resolvedChild.id,
        userRole: 'kid',
      })
      await refreshChildData(resolvedChild.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not start this job.')
    } finally {
      setClaimingJobId('')
    }
  }

  async function handleRequestReward(reward) {
    if (!resolvedChild?.id) {
      return
    }

    setRequestingRewardId(reward.id)
    setError('')

    try {
      await requestReward(reward, {
        familyId,
        userId: resolvedChild.id,
        userRole: 'kid',
        selectedChildId: resolvedChild.id,
      })
      await refreshChildData(resolvedChild.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not request reward.')
    } finally {
      setRequestingRewardId('')
    }
  }

  async function handleCreateSavingsGoal(event) {
    event.preventDefault()

    if (!resolvedChild?.id) {
      return
    }

    setError('')
    setLoading(true)

    try {
      await createGoal(
        {
          name: newGoalName,
          target: Number(newGoalTarget) || 0,
          childId: resolvedChild.id,
          saved: 0,
        },
        {
          familyId,
          userId,
          userRole,
        },
      )
      setNewGoalName('')
      setNewGoalTarget('300')
      await refreshChildData(resolvedChild.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not create savings goal.')
    } finally {
      setLoading(false)
    }
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

    if (typeof value === 'number') {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? null : date
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  function isToday(value) {
    const date = toDate(value)
    if (!date) {
      return false
    }

    const now = new Date()
    return (
      date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate()
    )
  }

  const myJobs = dashboard.jobs.filter((job) => job.claimedBy === resolvedChild?.id)
  const myActiveJobs = myJobs.filter((job) => job.status === 'claimed')
  const myClaimedPoolJobs = myActiveJobs.filter((job) => !job.childId)
  const todaysJobsMap = new Map()

  dashboard.jobs.forEach((job) => {
    const isMine = job.claimedBy === resolvedChild?.id
    const isAssignedToMe = job.childId === resolvedChild?.id
    const touchedToday = isToday(job.completedAt || job.claimedAt || job.createdAt)

    if ((isMine && touchedToday) || (isAssignedToMe && (job.status === 'open' || touchedToday))) {
      todaysJobsMap.set(job.id || `${job.title}:${job.status}`, job)
    }
  })

  const todaysJobs = Array.from(todaysJobsMap.values())
  const todaysReadyJobs = todaysJobs.filter((job) => job.status === 'open')
  const todaysInProgressJobs = todaysJobs.filter((job) => job.status === 'claimed')
  const todaysDoneJobs = todaysJobs.filter((job) => job.status === 'done')
  const completedJobsHistory = dashboard.jobs.filter(
    (job) => job.status === 'done' && job.claimedBy === resolvedChild?.id,
  )
  const jobPool = dashboard.jobs.filter((job) => job.status === 'open' && !job.childId)
  const pendingJobChecks = jobCheckRequests.filter((item) => item.status === 'pending')
  const myPendingJobCheckIds = new Set(pendingJobChecks.map((item) => item.jobId))
  const rewardHistory = storeData.requests.filter(
    (request) => request.requestedBy === resolvedChild?.id,
  )
  const pendingRewardCount = rewardHistory.filter((item) => item.status === 'pending').length
  const approvedRewardCount = rewardHistory.filter((item) => item.status === 'approved').length
  const deniedRewardCount = rewardHistory.filter((item) => item.status === 'denied').length
  const childGoal = dashboard.goals.find((goal) => goal.childId === resolvedChild?.id) || null
  const childGoalProgress = childGoal
    ? Math.min(100, Math.round((childGoal.saved / childGoal.target) * 100))
    : 0
  const hasPoolClaimLimitReached = myClaimedPoolJobs.length >= 1
  const hasOpenPoolJobs = jobPool.length > 0

  const statementEntries = [
    ...completedJobsHistory.map((job) => ({
      id: `job:${job.id || job.title}`,
      type: 'in',
      label: job.title,
      amount: Number(job.points) || 0,
      status: 'posted',
      at: toDate(job.completedAt || job.claimedAt || job.createdAt),
    })),
    ...rewardHistory.map((request) => ({
      id: `reward:${request.id}`,
      type: 'out',
      label: request.rewardTitle,
      amount: Number(request.cost) || 0,
      status: request.status,
      at: toDate(request.reviewedAt || request.createdAt),
    })),
  ]
    .sort((a, b) => {
      const left = a.at ? a.at.getTime() : 0
      const right = b.at ? b.at.getTime() : 0
      return right - left
    })

  const statementIncome = statementEntries
    .filter((entry) => entry.type === 'in')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const statementSpent = statementEntries
    .filter((entry) => entry.type === 'out' && entry.status === 'approved')
    .reduce((sum, entry) => sum + entry.amount, 0)

  function formatDate(value) {
    if (!value) {
      return 'No date'
    }

    return value.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }

  function displayStatementStatus(status) {
    if (status === 'posted') {
      return 'Got'
    }
    if (status === 'approved') {
      return 'Bought'
    }
    if (status === 'denied') {
      return 'Denied'
    }
    return 'Pending'
  }

  function displayRequestStatus(status) {
    if (status === 'approved') {
      return 'Approved'
    }
    if (status === 'denied') {
      return 'Denied'
    }
    return 'Pending'
  }

  function getRequestTone(status) {
    if (status === 'approved' || status === 'posted') {
      return 'done'
    }
    if (status === 'denied') {
      return 'waiting'
    }
    return 'active'
  }

  function normalizeJobLimitKey(title) {
    return (title || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  }

  function getWindowStart(period) {
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

  function getWindowLabel(period) {
    return period === 'day' ? 'today' : 'this week'
  }

  function getJobLimitDetails(job) {
    const limitKey = job.claimLimitKey || normalizeJobLimitKey(job.title)
    const usedJobs = dashboard.jobs.filter(
      (item) => item.status === 'claimed' || item.status === 'done',
    )

    let personalBlocked = false
    let familyBlocked = false
    let personalMessage = ''
    let familyMessage = ''

    if (job.claimLimitCount > 0 && job.claimLimitPeriod && limitKey) {
      const windowStart = getWindowStart(job.claimLimitPeriod)
      const personalUsed = usedJobs
        .filter((item) => item.claimedBy === resolvedChild?.id)
        .filter((item) => item.claimLimitKey === limitKey)
        .filter((item) => {
          const claimedAt = toDate(item.claimedAt)
          return Boolean(windowStart && claimedAt && claimedAt >= windowStart)
        }).length

      const personalRemaining = Math.max(0, job.claimLimitCount - personalUsed)
      personalBlocked = personalRemaining <= 0

      if (personalBlocked) {
        personalMessage = `You have already claimed this ${personalUsed} times ${getWindowLabel(job.claimLimitPeriod)}.`
      } else {
        personalMessage = `You can claim this job ${personalRemaining} more times ${getWindowLabel(job.claimLimitPeriod)}.`
      }
    }

    if (job.familyClaimLimitCount > 0 && job.familyClaimLimitPeriod && limitKey) {
      const windowStart = getWindowStart(job.familyClaimLimitPeriod)
      const familyUsed = usedJobs
        .filter((item) => item.claimLimitKey === limitKey)
        .filter((item) => {
          const claimedAt = toDate(item.claimedAt)
          return Boolean(windowStart && claimedAt && claimedAt >= windowStart)
        }).length

      const familyRemaining = Math.max(0, job.familyClaimLimitCount - familyUsed)
      familyBlocked = familyRemaining <= 0

      if (familyBlocked) {
        familyMessage = `This job has already been completed for ${getWindowLabel(job.familyClaimLimitPeriod)}.`
      }
    }

    return {
      personalBlocked,
      familyBlocked,
      personalMessage,
      familyMessage,
    }
  }

  function getRewardUsageCount(rewardId, scope, period) {
    const usage = storeData.rewardUsage?.[rewardId]
    if (!usage) {
      return 0
    }

    if (scope === 'child') {
      return period === 'day' ? usage.childDay || 0 : usage.childWeek || 0
    }

    return period === 'day' ? usage.familyDay || 0 : usage.familyWeek || 0
  }

  function getRewardLimitDetails(reward) {
    let personalBlocked = false
    let familyBlocked = false
    let personalMessage = ''
    let familyMessage = ''
    const availableCredits = Number(dashboard.balance?.credits) || 0

    if (reward.repeatMode === 'once') {
      const usedOnce = rewardHistory.some(
        (item) =>
          item.rewardId === reward.id
          && (item.status === 'pending' || item.status === 'approved'),
      )

      if (usedOnce) {
        personalBlocked = true
        personalMessage = 'You already used this one-time reward.'
      }
    }

    if (reward.claimLimitCount > 0 && reward.claimLimitPeriod) {
      const used = getRewardUsageCount(reward.id, 'child', reward.claimLimitPeriod)
      const remaining = Math.max(0, reward.claimLimitCount - used)
      const label = reward.claimLimitPeriod === 'day' ? 'today' : 'this week'

      if (remaining <= 0) {
        personalBlocked = true
        personalMessage = `You have already requested this ${used} times ${label}.`
      } else if (!personalMessage) {
        personalMessage = `You can request this reward ${remaining} more times ${label}.`
      }
    }

    if (reward.familyClaimLimitCount > 0 && reward.familyClaimLimitPeriod) {
      const used = getRewardUsageCount(reward.id, 'family', reward.familyClaimLimitPeriod)
      const remaining = Math.max(0, reward.familyClaimLimitCount - used)
      const label = reward.familyClaimLimitPeriod === 'day' ? 'today' : 'this week'

      if (remaining <= 0) {
        familyBlocked = true
        familyMessage = `This reward has already been used for ${label}.`
      }
    }

    if (Number(reward.cost || 0) > availableCredits) {
      const needed = Number(reward.cost || 0) - availableCredits
      personalBlocked = true
      personalMessage = `You need ${needed} more credits.`
    }

    return {
      personalBlocked,
      familyBlocked,
      personalMessage,
      familyMessage,
    }
  }

  function getJobState(job) {
    if (job.status === 'done') {
      return { label: 'Done', tone: 'done' }
    }
    if (job.status === 'claimed') {
      if (myPendingJobCheckIds.has(job.id)) {
        return { label: 'Parent Check', tone: 'waiting' }
      }
      return { label: 'Doing', tone: 'active' }
    }
    if (job.childId === resolvedChild?.id) {
      return { label: 'Mine', tone: 'ready' }
    }
    return { label: 'To Do', tone: 'ready' }
  }

  return (
    <>
      <header className="status-row">
        <span>9:41</span>
        <span className="page-title">Child Profile</span>
      </header>
      <main className="phone-content kid-session-shell">
        <section className="panel kid-session-header">
          <p className="panel-label">
            {resolvedChild ? `${resolvedChild.avatar} ${resolvedChild.displayName}` : 'Kid Dashboard'}
          </p>
          <p className="panel-muted">Kid session active. This space only shows this child&apos;s dashboard.</p>
          <div className="kid-session-tabs" role="tablist" aria-label="Child dashboard sections">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? 'step-pill step-pill-active' : 'step-pill'}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="button-row">
            <button type="button" className="claim-button" onClick={handleExitProfile}>
              Log Out
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => navigate('/mobile/children')}
            >
              Change Child
            </button>
          </div>
        </section>

        {loading ? <p className="status-note">Loading child data...</p> : null}
        {error ? <p className="status-note status-error">{error}</p> : null}
        {celebrationMessage ? (
          <section className="panel celebration-panel celebration-pop">
            <div className="celebration-confetti" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p className="panel-label">Credit Celebration</p>
            <p className="panel-muted">{celebrationMessage}</p>
            <button
              type="button"
              className="claim-button"
              onClick={() => setCelebrationMessage('')}
            >
              Awesome!
            </button>
          </section>
        ) : null}

        {!loading && !error && requiresSessionCode && !sessionUnlocked ? (
          <section className="panel">
            <p className="panel-label">Session Locked</p>
            {childHasSessionCode ? (
              <>
                <p className="panel-muted">Enter child session code to continue.</p>
                <form className="auth-form" onSubmit={handleUnlockSession}>
                  <input
                    className="job-input"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    placeholder="4-digit code"
                    value={sessionCodeInput}
                    onChange={(event) => setSessionCodeInput(event.target.value)}
                    required
                  />
                  <button type="submit" className="claim-button">Unlock</button>
                </form>
              </>
            ) : resolvedChild?.allowChildSetSessionCode ? (
              <>
                <p className="panel-muted">Set your 4-digit child session code to continue.</p>
                <form className="auth-form" onSubmit={handleCreateChildSessionCode}>
                  <input
                    className="job-input"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    placeholder="Create 4-digit code"
                    value={sessionCodeInput}
                    onChange={(event) => setSessionCodeInput(event.target.value)}
                    required
                  />
                  <button type="submit" className="claim-button">Save Code</button>
                </form>
              </>
            ) : (
              <p className="panel-muted">
                Session lock is enabled, but no child PIN is set. Ask a parent to configure it in Parent Command Center.
              </p>
            )}
            {unlockError ? <p className="status-note status-error">{unlockError}</p> : null}
          </section>
        ) : null}

        {!loading &&
        !error &&
        !childHasSessionCode &&
        resolvedChild?.allowChildSetSessionCode &&
        (!requiresSessionCode || sessionUnlocked) ? (
          <section className="panel">
            <p className="panel-label">Set PIN</p>
            <p className="panel-muted">
              You can set a 4-digit PIN to protect your session next time.
            </p>
            <form className="auth-form" onSubmit={handleCreateChildSessionCode}>
              <input
                className="job-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                placeholder="Create 4-digit code"
                value={sessionCodeInput}
                onChange={(event) => setSessionCodeInput(event.target.value)}
                required
              />
              <button type="submit" className="claim-button">
                Save My PIN
              </button>
            </form>
          </section>
        ) : null}

        {!loading && !error && (!requiresSessionCode || sessionUnlocked) && activeTab === 'overview' ? (
          <>
            <LevelCard
              level={dashboard.level}
              profileName={resolvedChild?.displayName || dashboard.profileName}
            />
            <BalanceCard credits={dashboard.balance.credits} />
            <StreakCard days={dashboard.streakDays} />

            <section className="panel">
              <p className="panel-label">Quick Jobs</p>
              <div className="limit-chip-row">
                <span className="limit-chip">Pool jobs: {myClaimedPoolJobs.length}/1</span>
                <span className="limit-chip">To do: {todaysReadyJobs.length}</span>
                <span className="limit-chip">Doing: {todaysInProgressJobs.length}</span>
              </div>
              {myActiveJobs.length === 0 ? (
                <p className="panel-muted">No active jobs right now.</p>
              ) : (
                <ul className="kid-job-list">
                  {myActiveJobs.slice(0, 4).map((job) => (
                    <li key={`overview:${job.id || job.title}`} className="kid-job-item">
                      <div className="kid-job-main">
                        <span className="mission-main">
                          <em aria-hidden="true">{job.icon}</em>
                          {job.title}
                        </span>
                      </div>
                      <div className="kid-job-side">
                        <span className="mission-reward">+ {job.points}</span>
                        <span className="kid-job-state kid-job-state-active">
                          {job.childId ? 'Assigned' : 'Pool job'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!hasPoolClaimLimitReached && hasOpenPoolJobs ? (
                <button
                  type="button"
                  className="claim-button"
                  onClick={() => setActiveTab('jobs')}
                >
                  See Open Jobs
                </button>
              ) : null}
            </section>

            <section className="panel">
              <p className="panel-label">Rewards Snapshot</p>
              <div className="limit-chip-row">
                <span className="limit-chip">Pending: {pendingRewardCount}</span>
                <span className="limit-chip">Approved: {approvedRewardCount}</span>
                <span className="limit-chip">Denied: {deniedRewardCount}</span>
              </div>
              <button
                type="button"
                className="claim-button"
                onClick={() => setActiveTab('rewards')}
              >
                Go To Rewards
              </button>
            </section>

            <section className="panel">
              <p className="panel-label">Savings</p>
              <div className="limit-chip-row">
                <span className="limit-chip">Goal slots: {childGoal ? 1 : 0}/1</span>
              </div>
              {!childGoal ? (
                <p className="panel-muted">No active savings goal yet.</p>
              ) : (
                <>
                  <p className="panel-muted">{childGoal.name}</p>
                  <p className="panel-muted">
                    {childGoal.saved}/{childGoal.target} credits ({childGoalProgress}%)
                  </p>
                  <div className="xp-track xp-track-light">
                    <span style={{ width: `${childGoalProgress}%` }}></span>
                  </div>
                </>
              )}
              {!childGoal ? (
                <button
                  type="button"
                  className="claim-button"
                  onClick={() => setActiveTab('savings')}
                >
                  Add Savings Goal
                </button>
              ) : null}
            </section>
          </>
        ) : null}

        {!loading && !error && (!requiresSessionCode || sessionUnlocked) && activeTab === 'jobs' ? (
          <section className="panel">
            <p className="panel-label">Jobs</p>
            <div className="limit-chip-row">
              <span className="limit-chip">Pool claimed: {myClaimedPoolJobs.length}/1</span>
              <span className="limit-chip">To do: {todaysReadyJobs.length}</span>
              <span className="limit-chip">Doing: {todaysInProgressJobs.length}</span>
              <span className="limit-chip">Done: {todaysDoneJobs.length}</span>
            </div>

            {todaysJobs.length === 0 ? (
              <p className="panel-muted">No jobs yet today.</p>
            ) : (
              <div className="kid-job-groups">
                <div className="kid-job-group">
                  <p className="panel-label">To Do</p>
                  {todaysReadyJobs.length === 0 ? (
                    <p className="panel-muted">Nothing to start right now.</p>
                  ) : (
                    <ul className="kid-job-list">
                      {todaysReadyJobs.map((job) => {
                        const state = getJobState(job)
                        const limitDetails = getJobLimitDetails(job)
                        return (
                          <li key={`ready:${job.id || job.title}`} className="kid-job-item">
                            <div className="kid-job-main">
                              <span className="mission-main">
                                <em aria-hidden="true">{job.icon}</em>
                                {job.title}
                              </span>
                              <div className="limit-chip-row">
                                <span className="limit-chip">{job.autoRecreate ? 'Recurring' : 'One-time'}</span>
                              </div>
                              {limitDetails.personalMessage ? (
                                <p
                                  className={
                                    limitDetails.personalBlocked
                                      ? 'kid-job-hint kid-job-hint-blocked'
                                      : 'kid-job-hint'
                                  }
                                >
                                  {limitDetails.personalMessage}
                                </p>
                              ) : null}
                              {limitDetails.familyMessage ? (
                                <p
                                  className={
                                    limitDetails.familyBlocked
                                      ? 'kid-job-hint kid-job-hint-blocked'
                                      : 'kid-job-hint'
                                  }
                                >
                                  {limitDetails.familyMessage}
                                </p>
                              ) : null}
                            </div>
                            <div className="kid-job-side">
                              <span className="mission-reward">+ {job.points}</span>
                              <span className={`kid-job-state kid-job-state-${state.tone}`}>{state.label}</span>
                              {job.status === 'open' && job.childId === resolvedChild?.id ? (
                                <button
                                  type="button"
                                  className="claim-button"
                                  onClick={() => handleClaimJob(job)}
                                  disabled={
                                    claimingJobId === job.id
                                    || limitDetails.personalBlocked
                                    || limitDetails.familyBlocked
                                  }
                                >
                                  {claimingJobId === job.id ? 'Starting...' : 'Start'}
                                </button>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                <div className="kid-job-group">
                  <p className="panel-label">Doing</p>
                  {todaysInProgressJobs.length === 0 ? (
                    <p className="panel-muted">No jobs in progress.</p>
                  ) : (
                    <ul className="kid-job-list">
                      {todaysInProgressJobs.map((job) => {
                        const state = getJobState(job)
                        return (
                          <li key={`progress:${job.id || job.title}`} className="kid-job-item">
                            <div className="kid-job-main">
                              <span className="mission-main">
                                <em aria-hidden="true">{job.icon}</em>
                                {job.title}
                              </span>
                            </div>
                            <div className="kid-job-side">
                              <span className="mission-reward">+ {job.points}</span>
                              <span className={`kid-job-state kid-job-state-${state.tone}`}>{state.label}</span>
                              <button
                                type="button"
                                className="claim-button"
                                onClick={() => handleRequestJobCheck(job)}
                                disabled={
                                  requestingCheckJobId === job.id || myPendingJobCheckIds.has(job.id)
                                }
                              >
                                {requestingCheckJobId === job.id
                                  ? 'Asking...'
                                  : myPendingJobCheckIds.has(job.id)
                                    ? 'Parent Check'
                                    : 'Ask Parent'}
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                <div className="kid-job-group">
                  <p className="panel-label">Done</p>
                  {todaysDoneJobs.length === 0 ? (
                    <p className="panel-muted">No finished jobs yet today.</p>
                  ) : (
                    <ul className="kid-job-list">
                      {todaysDoneJobs.map((job) => {
                        const state = getJobState(job)
                        return (
                          <li key={`done:${job.id || job.title}`} className="kid-job-item kid-job-item-done">
                            <div className="kid-job-main">
                              <span className="mission-main">
                                <em aria-hidden="true">{job.icon}</em>
                                {job.title}
                              </span>
                            </div>
                            <div className="kid-job-side">
                              <span className="mission-reward">+ {job.points}</span>
                              <span className={`kid-job-state kid-job-state-${state.tone}`}>{state.label}</span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <p className="panel-label" style={{ marginTop: '0.85rem' }}>Open Pool Jobs</p>
            {hasPoolClaimLimitReached ? (
              <p className="panel-muted">
                Finish your pool job first, then pick a new one.
              </p>
            ) : null}
            {jobPool.length === 0 ? (
              <p className="panel-muted">No pool jobs right now.</p>
            ) : (
              <ul className="kid-job-list">
                {jobPool.map((job) => {
                  const limitDetails = getJobLimitDetails(job)
                  return (
                    <li key={job.id || `${job.title}-pool`} className="kid-job-item">
                      <div className="kid-job-main">
                        <span className="mission-main">
                          <em aria-hidden="true">{job.icon}</em>
                          {job.title}
                        </span>
                        <div className="limit-chip-row">
                          <span className="limit-chip">{job.autoRecreate ? 'Recurring' : 'One-time'}</span>
                        </div>
                        {limitDetails.personalMessage ? (
                          <p
                            className={
                              limitDetails.personalBlocked
                                ? 'kid-job-hint kid-job-hint-blocked'
                                : 'kid-job-hint'
                            }
                          >
                            {limitDetails.personalMessage}
                          </p>
                        ) : null}
                        {limitDetails.familyMessage ? (
                          <p
                            className={
                              limitDetails.familyBlocked
                                ? 'kid-job-hint kid-job-hint-blocked'
                                : 'kid-job-hint'
                            }
                          >
                            {limitDetails.familyMessage}
                          </p>
                        ) : null}
                      </div>
                      <div className="kid-job-side">
                        <span className="mission-reward">+ {job.points}</span>
                        <span className="kid-job-state kid-job-state-ready">Ready</span>
                        <button
                          type="button"
                          className="claim-button"
                          onClick={() => handleClaimJob(job)}
                          disabled={
                            claimingJobId === job.id
                            || hasPoolClaimLimitReached
                            || limitDetails.personalBlocked
                            || limitDetails.familyBlocked
                          }
                        >
                          {claimingJobId === job.id ? 'Claiming...' : 'Claim'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ) : null}

        {!loading && !error && (!requiresSessionCode || sessionUnlocked) && activeTab === 'statement' ? (
          <section className="panel">
            <p className="panel-label">Money</p>
            <p className="panel-muted">See money you got and money you spent.</p>

            <div className="limit-chip-row">
              <span className="limit-chip">Got: +{statementIncome}</span>
              <span className="limit-chip">Spent: -{statementSpent}</span>
            </div>

            {statementEntries.length === 0 ? (
              <p className="panel-muted">No money moves yet.</p>
            ) : (
              <ul className="kid-job-list">
                {statementEntries.map((entry) => (
                  <li key={entry.id} className="kid-job-item">
                    <div className="kid-job-main">
                      <span className="mission-main">
                        {entry.type === 'in' ? '💰' : '🧾'} {entry.label}
                      </span>
                      <div className="limit-chip-row">
                        <span className={`kid-job-state kid-job-state-${getRequestTone(entry.status)}`}>
                          {displayStatementStatus(entry.status)}
                        </span>
                        <span className="job-status-label">{formatDate(entry.at)}</span>
                      </div>
                    </div>
                    <div className="kid-job-side">
                      <span
                        className={entry.type === 'in' ? 'mission-reward' : 'statement-spend'}
                      >
                        {entry.type === 'in' ? '+' : '-'} {entry.amount}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {!loading && !error && (!requiresSessionCode || sessionUnlocked) && activeTab === 'rewards' ? (
          <section className="panel">
            <p className="panel-label">Rewards</p>
            <div className="limit-chip-row">
              <span className="limit-chip">Pending: {pendingRewardCount}</span>
              <span className="limit-chip">Approved: {approvedRewardCount}</span>
              <span className="limit-chip">Denied: {deniedRewardCount}</span>
            </div>
            {storeData.rewards.length === 0 ? (
              <p className="panel-muted">No rewards for this child yet.</p>
            ) : (
              <ul className="kid-job-list">
                {storeData.rewards.map((reward) => {
                  const limitDetails = getRewardLimitDetails(reward)
                  return (
                    <li key={reward.id} className="kid-job-item">
                      <div className="kid-job-main">
                        <span className="mission-main">🎁 {reward.title}</span>
                        <div className="limit-chip-row">
                          <span className="limit-chip">
                            {reward.repeatMode === 'once' ? 'One-time' : 'Recurring'}
                          </span>
                          {reward.pricingMeta?.dynamicPricingApplied ? (
                            <span className="limit-chip">Base {reward.pricingMeta.baseCost} demand price</span>
                          ) : null}
                        </div>
                        {limitDetails.personalMessage ? (
                          <p
                            className={
                              limitDetails.personalBlocked
                                ? 'kid-job-hint kid-job-hint-blocked'
                                : 'kid-job-hint'
                            }
                          >
                            {limitDetails.personalMessage}
                          </p>
                        ) : null}
                        {limitDetails.familyMessage ? (
                          <p className="kid-job-hint kid-job-hint-blocked">
                            {limitDetails.familyMessage}
                          </p>
                        ) : null}
                      </div>
                      <div className="kid-job-side">
                        <span className="mission-reward">{reward.cost}</span>
                        <button
                          type="button"
                          className="claim-button"
                          onClick={() => handleRequestReward(reward)}
                          disabled={
                            requestingRewardId === reward.id
                            || limitDetails.personalBlocked
                            || limitDetails.familyBlocked
                          }
                        >
                          {requestingRewardId === reward.id ? 'Requesting...' : 'Request'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <p className="panel-label" style={{ marginTop: '0.85rem' }}>Past Requests</p>
            {rewardHistory.length === 0 ? (
              <p className="panel-muted">No reward requests yet.</p>
            ) : (
              <ul className="kid-job-list">
                {rewardHistory.map((item) => (
                  <li key={item.id} className="kid-job-item">
                    <div className="kid-job-main">
                      <span className="mission-main">{item.rewardTitle}</span>
                    </div>
                    <div className="kid-job-side">
                      <span className={`kid-job-state kid-job-state-${getRequestTone(item.status)}`}>
                        {displayRequestStatus(item.status)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {!loading && !error && (!requiresSessionCode || sessionUnlocked) && activeTab === 'savings' ? (
          <section className="panel">
            <p className="panel-label">Savings</p>
            <div className="limit-chip-row">
              <span className="limit-chip">Goal slots: {childGoal ? 1 : 0}/1</span>
            </div>
            {childGoal ? (
              <p className="panel-muted">
                One active savings goal is allowed at a time. Complete this one before creating a new goal.
              </p>
            ) : null}
            <form className="auth-form" onSubmit={handleCreateSavingsGoal}>
              <input
                className="job-input"
                placeholder="New goal name"
                value={newGoalName}
                onChange={(event) => setNewGoalName(event.target.value)}
                disabled={Boolean(childGoal)}
                required
              />
              <input
                className="job-input"
                type="number"
                min="1"
                placeholder="Target credits"
                value={newGoalTarget}
                onChange={(event) => setNewGoalTarget(event.target.value)}
                disabled={Boolean(childGoal)}
                required
              />
              <button type="submit" className="claim-button" disabled={loading || Boolean(childGoal)}>
                Add My Goal
              </button>
            </form>

            {dashboard.goals.length === 0 ? (
              <p className="panel-muted">No savings goals for this child yet.</p>
            ) : (
              <ul className="kid-job-list">
                {dashboard.goals.map((goal) => {
                  const pct = Math.round((goal.saved / goal.target) * 100)
                  return (
                    <li key={`${goal.childId || 'family'}:${goal.name}`} className="kid-job-item">
                      <div className="kid-job-main" style={{ width: '100%' }}>
                        <span className="mission-main">🎯 {goal.name}</span>
                        <span className="job-status-label">{goal.saved}/{goal.target} credits</span>
                        <div className="xp-track xp-track-light">
                          <span style={{ width: `${pct}%` }}></span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ) : null}
      </main>
    </>
  )
}
