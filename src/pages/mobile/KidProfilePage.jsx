import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import BalanceCard from '../../components/mobile/cards/BalanceCard'
import LevelCard from '../../components/mobile/cards/LevelCard'
import StreakCard from '../../components/mobile/cards/StreakCard'
import TopStatusBar from '../../components/mobile/TopStatusBar'
import { useAuth } from '../../context/AuthContext'
import { trackAnalyticsEvent } from '../../services/analytics'
import {
  acceptSavingsGoalCounter,
  cancelSavingsGoal,
  claimJob,
  createGoal,
  declineSavingsGoalCounter,
  contributeToSavingsGoal,
  getFamilyConsequenceEvents,
  getFamilyDashboard,
  getFamilyJobCheckRequests,
  getFamilyStoreData,
  getHouseholdOnboardingData,
  createCustomRewardRequest,
  acceptRewardRequestTerms,
  declineRewardRequestTerms,
  requestJobCheck,
  requestReward,
  setChildSessionCode,
} from '../../services/familyEconomyService'
import { computeClaimCountdownData } from '../../services/policyUtils.js'

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'rules', label: 'House Rules' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'statement', label: 'Money' },
  { key: 'savings', label: 'Savings' },
  { key: 'rewards', label: 'Rewards' },
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
  const [consequenceEvents, setConsequenceEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requiresSessionCode, setRequiresSessionCode] = useState(false)
  const [childHasSessionCode, setChildHasSessionCode] = useState(false)
  const [sessionCodeInput, setSessionCodeInput] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [sessionUnlocked, setSessionUnlocked] = useState(false)
  const [celebrationTitle, setCelebrationTitle] = useState('Credit Celebration')
  const [celebrationMessage, setCelebrationMessage] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [claimingJobId, setClaimingJobId] = useState('')
  const [requestingRewardId, setRequestingRewardId] = useState('')
  const [customRewardTitle, setCustomRewardTitle] = useState('')
  const [customRewardCost, setCustomRewardCost] = useState('100')
  const [customRewardNote, setCustomRewardNote] = useState('')
  const [creatingCustomRewardRequest, setCreatingCustomRewardRequest] = useState(false)
  const [resolvingRewardRequestId, setResolvingRewardRequestId] = useState('')
  const [requestingCheckJobId, setRequestingCheckJobId] = useState('')
  const [savingForRewardId, setSavingForRewardId] = useState('')
  const [cancelGoalConfirmId, setCancelGoalConfirmId] = useState('')
  const [cancellingGoalId, setCancellingGoalId] = useState('')
  const [contributionAmount, setContributionAmount] = useState('25')
  const [savingContribution, setSavingContribution] = useState(false)
  const [resolvingGoalCounter, setResolvingGoalCounter] = useState('')
  const [savingsGoalApprovalMode, setSavingsGoalApprovalMode] = useState('claim_only')
  const [familyRulesText, setFamilyRulesText] = useState('')
  const [missedJobConsequenceEnabled, setMissedJobConsequenceEnabled] = useState(false)
  const [missedJobPenaltyCredits, setMissedJobPenaltyCredits] = useState(0)
  const [missedJobTimingEnabled, setMissedJobTimingEnabled] = useState(false)
  const [missedJobDefaultHours, setMissedJobDefaultHours] = useState(24)
  const [failedJobCheckConsequenceEnabled, setFailedJobCheckConsequenceEnabled] = useState(false)
  const [failedJobCheckPenaltyCredits, setFailedJobCheckPenaltyCredits] = useState(0)
  const [maxActivePoolClaimsPerChild, setMaxActivePoolClaimsPerChild] = useState(1)
  const [allowClaimingWithPendingChecks, setAllowClaimingWithPendingChecks] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [houseRulesUpdatedAtMs, setHouseRulesUpdatedAtMs] = useState(0)
  const [hasUnreadHouseRulesUpdate, setHasUnreadHouseRulesUpdate] = useState(false)

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [])

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
      setCelebrationTitle('Credit Celebration')
      setCelebrationMessage(`Celebration! You gained ${gained} credits!`)
    }

    localStorage.setItem(storageKey, String(credits))
  }, [familyId])

  const updateGoalMilestoneCelebration = useCallback((selectedChildId, goals) => {
    if (!familyId || !selectedChildId) {
      return
    }

    const childGoal = (goals || []).find((goal) => goal.childId === selectedChildId)
    if (!childGoal) {
      return
    }

    const target = Number(childGoal.target) || 0
    const saved = Number(childGoal.saved) || 0
    if (target <= 0) {
      return
    }

    const progress = Math.min(100, Math.floor((saved / target) * 100))
    const milestones = [25, 50, 75, 100]
    const reachedMilestone = milestones.reduce((latest, value) => (progress >= value ? value : latest), 0)

    const goalKey = childGoal.id || childGoal.name || 'goal'
    const storageKey = `family-economy-goal-milestone:${familyId}:${selectedChildId}:${goalKey}`
    const raw = localStorage.getItem(storageKey)

    if (raw === null) {
      localStorage.setItem(storageKey, String(reachedMilestone))
      return
    }

    const previousMilestone = Number(raw)
    if (!Number.isFinite(previousMilestone)) {
      localStorage.setItem(storageKey, String(reachedMilestone))
      return
    }

    if (reachedMilestone > previousMilestone) {
      setCelebrationTitle('Savings Milestone')
      if (reachedMilestone >= 100) {
        setCelebrationMessage(`Goal complete! ${childGoal.name} is fully funded.`)
      } else {
        setCelebrationMessage(`Milestone reached! ${childGoal.name} is now ${reachedMilestone}% funded.`)
      }
    }

    localStorage.setItem(storageKey, String(reachedMilestone))
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
        setFamilyRulesText(onboarding.data.family?.familyRules || '')
        setSavingsGoalApprovalMode(onboarding.data.family?.savingsGoalApprovalMode || 'claim_only')
        setMissedJobConsequenceEnabled(Boolean(onboarding.data.family?.missedJobConsequenceEnabled))
        setMissedJobPenaltyCredits(Number(onboarding.data.family?.missedJobPenaltyCredits) || 0)
        setMissedJobTimingEnabled(Boolean(onboarding.data.family?.missedJobTimingEnabled))
        setMissedJobDefaultHours(Number(onboarding.data.family?.missedJobDefaultHours) || 24)
        setFailedJobCheckConsequenceEnabled(Boolean(onboarding.data.family?.failedJobCheckConsequenceEnabled))
        setFailedJobCheckPenaltyCredits(Number(onboarding.data.family?.failedJobCheckPenaltyCredits) || 0)
        setMaxActivePoolClaimsPerChild(
          Math.max(1, Number(onboarding.data.family?.maxActivePoolClaimsPerChild) || 1),
        )
        setAllowClaimingWithPendingChecks(Boolean(onboarding.data.family?.allowClaimingWithPendingChecks))

        const familyUpdatedAt = toDate(onboarding.data.family?.updatedAt)
        const updatedAtMs = familyUpdatedAt?.getTime() || 0
        setHouseRulesUpdatedAtMs(updatedAtMs)
        if (updatedAtMs > 0) {
          const rulesSeenKey = `family-economy-house-rules-seen:${familyId}:${childId}`
          const seenAtMs = Number(localStorage.getItem(rulesSeenKey) || 0)
          setHasUnreadHouseRulesUpdate(seenAtMs < updatedAtMs)
        } else {
          setHasUnreadHouseRulesUpdate(false)
        }

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

        const [dashboardResult, storeResult, consequenceResult] = await Promise.all([
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
          getFamilyConsequenceEvents({
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
        updateGoalMilestoneCelebration(selected.id, dashboardResult.data.goals)
        setDashboard(dashboardResult.data)
        setStoreData(storeResult.data)
        setConsequenceEvents(consequenceResult.data.events || [])
        setJobCheckRequests(checkResult.data.requests)
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError.message || 'Could not load child profile.')
          setDashboard(emptyDashboard)
          setStoreData({ rewards: [], requests: [] })
          setConsequenceEvents([])
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
    updateGoalMilestoneCelebration,
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
      const [dashboardResult, storeResult, consequenceResult] = await Promise.all([
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
        getFamilyConsequenceEvents({
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
      updateGoalMilestoneCelebration(selected.id, dashboardResult.data.goals)
      setDashboard(dashboardResult.data)
      setStoreData(storeResult.data)
      setConsequenceEvents(consequenceResult.data.events || [])
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
      updateGoalMilestoneCelebration(selected.id, dashboardResult.data.goals)
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
    const [dashboardResult, storeResult, checkResult, consequenceResult] = await Promise.all([
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
      getFamilyConsequenceEvents({
        familyId,
        userId,
        userRole,
        selectedChildId,
      }),
    ])

    updateCreditsCelebration(selectedChildId, dashboardResult.data.balance?.credits)
    updateGoalMilestoneCelebration(selectedChildId, dashboardResult.data.goals)
    setDashboard(dashboardResult.data)
    setStoreData(storeResult.data)
    setJobCheckRequests(checkResult.data.requests)
    setConsequenceEvents(consequenceResult.data.events || [])
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

  async function handleCreateCustomRewardRequest(event) {
    event.preventDefault()
    if (!resolvedChild?.id) {
      return
    }

    setCreatingCustomRewardRequest(true)
    setError('')

    try {
      await createCustomRewardRequest(
        {
          rewardTitle: customRewardTitle,
          cost: Number(customRewardCost) || 0,
          childNote: customRewardNote,
        },
        {
          familyId,
          userId: resolvedChild.id,
          userRole: 'kid',
          selectedChildId: resolvedChild.id,
        },
      )
      setCustomRewardTitle('')
      setCustomRewardCost('100')
      setCustomRewardNote('')
      await refreshChildData(resolvedChild.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not request this reward yet.')
    } finally {
      setCreatingCustomRewardRequest(false)
    }
  }

  async function handleAcceptRewardCounter(request) {
    if (!resolvedChild?.id) {
      return
    }

    setResolvingRewardRequestId(`accept:${request.id}`)
    setError('')

    try {
      await acceptRewardRequestTerms(request.id, {
        familyId,
        userId: resolvedChild.id,
        userRole: 'kid',
      })
      await refreshChildData(resolvedChild.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not accept these reward terms.')
    } finally {
      setResolvingRewardRequestId('')
    }
  }

  async function handleDeclineRewardCounter(request) {
    if (!resolvedChild?.id) {
      return
    }

    setResolvingRewardRequestId(`decline:${request.id}`)
    setError('')

    try {
      await declineRewardRequestTerms(request.id, {
        familyId,
        userId: resolvedChild.id,
        userRole: 'kid',
      })
      await refreshChildData(resolvedChild.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not decline these reward terms.')
    } finally {
      setResolvingRewardRequestId('')
    }
  }

  async function handleClaimApprovedReward(request) {
    if (!request?.rewardId || !resolvedChild?.id) {
      return
    }

    setRequestingRewardId(`approved:${request.id}`)
    setError('')

    try {
      await requestReward(
        {
          id: request.rewardId,
          title: request.rewardTitle,
          cost: request.cost,
        },
        {
          familyId,
          userId: resolvedChild.id,
          userRole: 'kid',
          selectedChildId: resolvedChild.id,
        },
      )
      await refreshChildData(resolvedChild.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not claim this approved reward yet.')
    } finally {
      setRequestingRewardId('')
    }
  }

  async function handleCreateSavingsGoal(reward) {
    if (!resolvedChild?.id || !reward?.id) {
      return
    }

    setError('')
    setSavingForRewardId(reward.id)

    try {
      await createGoal(
        {
          name: reward.title,
          rewardId: reward.id,
          rewardTitle: reward.title,
          target: Number(reward.cost) || 0,
          childId: resolvedChild.id,
          saved: 0,
        },
        {
          familyId,
          userId,
          userRole,
        },
      )
      await refreshChildData(resolvedChild.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not request savings goal.')
    } finally {
      setSavingForRewardId('')
    }
  }

  async function handleCancelSavingsGoal(goalId) {
    if (!resolvedChild?.id || !goalId) {
      return
    }

    setCancelGoalConfirmId('')
    setCancellingGoalId(goalId)
    setError('')

    try {
      await cancelSavingsGoal(goalId, { familyId, userId, userRole })
      await refreshChildData(resolvedChild.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not cancel savings goal.')
    } finally {
      setCancellingGoalId('')
    }
  }

  async function handleContributeToSavingsGoal(event) {
    event.preventDefault()
    if (!activeChildGoal?.id) {
      return
    }

    setError('')
    setSavingContribution(true)

    const contribution = Number(contributionAmount) || 0

    try {
      await contributeToSavingsGoal(activeChildGoal.id, contribution, { familyId, userId, userRole })

      const dashboardResult = await getFamilyDashboard({
        familyId,
        userId,
        userRole,
        selectedChildId: resolvedChild?.id,
      })

      setDashboard(dashboardResult.data)
      updateCreditsCelebration(resolvedChild?.id, dashboardResult.data.balance?.credits)
      updateGoalMilestoneCelebration(resolvedChild?.id, dashboardResult.data.goals)
      setContributionAmount('25')
    } catch (caughtError) {
      setError(caughtError.message || 'Could not move credits into savings.')
    } finally {
      setSavingContribution(false)
    }
  }

  async function handleAcceptGoalCounter() {
    if (!childGoal?.id) {
      return
    }

    setError('')
    setResolvingGoalCounter('accept')

    try {
      await acceptSavingsGoalCounter(childGoal.id, { familyId, userId, userRole })
      await refreshChildData(resolvedChild?.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not accept this counter offer.')
    } finally {
      setResolvingGoalCounter('')
    }
  }

  async function handleDeclineGoalCounter() {
    if (!childGoal?.id) {
      return
    }

    setError('')
    setResolvingGoalCounter('decline')

    try {
      await declineSavingsGoalCounter(childGoal.id, { familyId, userId, userRole })
      await refreshChildData(resolvedChild?.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not decline this counter offer.')
    } finally {
      setResolvingGoalCounter('')
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
  const jobsTabInProgressJobs = myActiveJobs
  const hasAnyJobsForJobsTab =
    todaysReadyJobs.length > 0 || jobsTabInProgressJobs.length > 0 || todaysDoneJobs.length > 0
  const completedJobsHistory = dashboard.jobs.filter(
    (job) => job.status === 'done' && job.claimedBy === resolvedChild?.id,
  )
  const jobPool = dashboard.jobs.filter((job) => job.status === 'open' && !job.childId)
  const pendingJobChecks = jobCheckRequests.filter((item) => item.status === 'pending')
  const myPendingJobCheckIds = new Set(pendingJobChecks.map((item) => item.jobId))
  const blockingPoolJobs = myClaimedPoolJobs.filter((job) =>
    allowClaimingWithPendingChecks ? !myPendingJobCheckIds.has(job.id) : true,
  )
  const rewardHistory = storeData.requests.filter(
    (request) => request.requestedBy === resolvedChild?.id,
  )
  const hasOpenRewardRequest = rewardHistory.some(
    (item) => item.status === 'pending' || item.status === 'countered',
  )
  const pendingRewardCount = rewardHistory.filter((item) => item.status === 'pending' || item.status === 'countered').length
  const approvedRewardCount = rewardHistory.filter((item) => item.status === 'approved').length
  const deniedRewardCount = rewardHistory.filter((item) => item.status === 'denied').length
  const childGoals = dashboard.goals.filter((goal) => goal.childId === resolvedChild?.id)
  const pendingChildGoalRequest =
    childGoals.find((goal) => goal.status === 'pending_parent_approval') || null
  const activeChildGoal =
    childGoals.find((goal) => goal.status === 'active' || goal.status === 'ready_to_claim') || null
  const childGoal = activeChildGoal || pendingChildGoalRequest || childGoals[0] || null
  const childGoalProgress = childGoal && Number(childGoal.target) > 0
    ? Math.min(100, Math.round((childGoal.saved / childGoal.target) * 100))
    : 0
  const childGoalStatus = activeChildGoal?.status || childGoal?.status || null
  const childGoalPendingApproval = childGoalStatus === 'pending_parent_approval'
  const childGoalCountered = childGoalStatus === 'countered'
  const childGoalWaitingApproval = childGoalStatus === 'ready_to_claim'
  const childGoalCompleted = childGoalStatus === 'completed'
  const hasPoolClaimLimitReached = blockingPoolJobs.length >= maxActivePoolClaimsPerChild
  const hasOpenPoolJobs = jobPool.length > 0
  const kidSessionReady = !loading && !error && (!requiresSessionCode || sessionUnlocked)
  const savingsApprovalHint =
    savingsGoalApprovalMode === 'create_and_claim'
      ? 'Parent approves when you start and when you finish a savings goal.'
      : savingsGoalApprovalMode === 'no_approval'
        ? 'Savings goals do not require parent approval.'
        : 'You can start saving right away; parent approves only when you finish.'
  const missedJobsHint = missedJobConsequenceEnabled
    ? `If a started job is not completed, a parent can mark it missed and remove up to ${missedJobPenaltyCredits} credits.${
      missedJobTimingEnabled
        ? ` This is time-based after about ${missedJobDefaultHours} hour(s), unless that job has its own timer.`
        : ' Parent can decide timing manually.'
    }`
    : 'There is no missed-job penalty set right now.'
  const poolJobsHint = `You can keep ${maxActivePoolClaimsPerChild} pool job(s) active at once.${
    allowClaimingWithPendingChecks
      ? ' Jobs waiting for parent check do not count toward this limit.'
      : ' Jobs waiting for parent check still count toward this limit.'
  }`
  const failedChecksHint = failedJobCheckConsequenceEnabled
    ? `If a parent says a check-in is not complete, up to ${failedJobCheckPenaltyCredits} credits can be removed.`
    : 'There is no extra penalty when a parent denies a job check.'

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

  function getNegotiationChips(goal) {
    const history = Array.isArray(goal?.negotiationHistory) ? goal.negotiationHistory : []
    if (history.length === 0) {
      return []
    }

    const labelsByType = {
      requested: { label: 'Requested', icon: '📝', tone: 'ready' },
      request_approved: { label: 'Approved', icon: '✅', tone: 'done' },
      request_denied: { label: 'Denied', icon: '⛔', tone: 'waiting' },
      countered: { label: 'Countered', icon: '🤝', tone: 'active' },
      counter_accepted: { label: 'Accepted', icon: '🎉', tone: 'done' },
      counter_declined: { label: 'Declined', icon: '🚫', tone: 'waiting' },
    }

    return history.slice(-3)
      .map((entry, index) => {
        const meta = labelsByType[entry.type] || { label: 'Updated', icon: '✨', tone: 'ready' }
        const target = Number(entry.target) > 0 ? ` ${entry.target}` : ''
        const at = formatDate(toDate(entry.at))
        return {
          key: `${entry.type}:${entry.at?.seconds || entry.at || index}`,
          label: `${meta.icon} ${meta.label}${target}`,
          tone: meta.tone,
          at,
        }
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
    if (status === 'countered') {
      return 'Countered'
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
    if (status === 'countered') {
      return 'ready'
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

  function getClaimCountdown(job) {
    const countdown = computeClaimCountdownData({
      claimedAt: job.claimedAt,
      nowMs,
      missedAfterHours: job.missedAfterHours,
      missedJobTimingEnabled,
      missedJobDefaultHours,
    })

    if (!countdown.hasTimer) {
      return null
    }

    const remainingMs = countdown.remainingMs

    if (remainingMs <= 0) {
      return { expired: true, label: 'Expired' }
    }

    const totalSeconds = Math.floor(remainingMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return {
      expired: false,
      label: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    }
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

  function getJobPolicyPreview(job) {
    const notes = []
    const timeoutHours = Number(job.missedAfterHours) > 0
      ? Number(job.missedAfterHours)
      : missedJobTimingEnabled
        ? Number(missedJobDefaultHours) || 24
        : 0

    if (timeoutHours > 0) {
      notes.push(`Time limit after start: ${timeoutHours}h`)
    }

    if (failedJobCheckConsequenceEnabled && failedJobCheckPenaltyCredits > 0) {
      notes.push(`If check is denied: -${failedJobCheckPenaltyCredits} credits`)
    }

    return notes
  }

  function handleTabChange(nextTab) {
    setActiveTab(nextTab)

    if (nextTab === 'rules' && hasUnreadHouseRulesUpdate && houseRulesUpdatedAtMs) {
      const rulesSeenKey = `family-economy-house-rules-seen:${familyId}:${childId}`
      localStorage.setItem(rulesSeenKey, String(houseRulesUpdatedAtMs))
      setHasUnreadHouseRulesUpdate(false)
    }
  }

  useEffect(() => {
    if (!kidSessionReady || activeTab !== 'overview' || !familyId || !resolvedChild?.id) {
      return
    }

    const dayKey = new Date().toISOString().slice(0, 10)
    trackAnalyticsEvent(
      'child_dashboard_viewed',
      {
        childId: resolvedChild.id,
        screen: 'kid_profile',
        source: 'KidProfilePage',
        tab: 'overview',
      },
      { familyId, userId, userRole, childId: resolvedChild.id },
      {
        dedupe: true,
        dedupeKey: `child_dashboard_viewed:${familyId}:${resolvedChild.id}:${dayKey}`,
      },
    )
  }, [kidSessionReady, activeTab, familyId, userId, userRole, resolvedChild?.id])

  useEffect(() => {
    if (!kidSessionReady || activeTab !== 'statement' || !familyId || !resolvedChild?.id) {
      return
    }

    const dayKey = new Date().toISOString().slice(0, 10)
    trackAnalyticsEvent(
      'statement_viewed',
      {
        childId: resolvedChild.id,
        screen: 'kid_profile',
        source: 'KidProfilePage',
        tab: 'statement',
      },
      { familyId, userId, userRole, childId: resolvedChild.id },
      {
        dedupe: true,
        dedupeKey: `statement_viewed:${familyId}:${resolvedChild.id}:${dayKey}`,
      },
    )
  }, [kidSessionReady, activeTab, familyId, userId, userRole, resolvedChild?.id])

  return (
    <>
      <TopStatusBar title="Child Profile" />
      <main className="phone-content kid-session-shell">
        <LevelCard
          level={dashboard.level}
          profileName={resolvedChild?.displayName || dashboard.profileName}
          subtitle="Kid session active. This space only shows this child&apos;s dashboard."
        >
          <div className="hero-tab-row" role="tablist" aria-label="Child dashboard sections">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? 'hero-tab hero-tab-active' : 'hero-tab'}
                onClick={() => handleTabChange(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
              >
                {tab.label}
                {tab.key === 'rules' && hasUnreadHouseRulesUpdate ? (
                  <span className="hero-tab-badge">New</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="hero-action-row">
            <button type="button" className="claim-button" onClick={handleExitProfile}>
              Log Out
            </button>
          </div>
        </LevelCard>

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
            <p className="panel-label">{celebrationTitle}</p>
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
            <BalanceCard credits={dashboard.balance.credits} />
            <StreakCard days={dashboard.streakDays} />

            <section className="panel">
              <p className="panel-label">Quick Jobs</p>
              <div className="limit-chip-row">
                <span className="limit-chip">Pool jobs: {blockingPoolJobs.length}/{maxActivePoolClaimsPerChild}</span>
                <span className="limit-chip">To do: {todaysReadyJobs.length}</span>
                <span className="limit-chip">Doing: {todaysInProgressJobs.length}</span>
              </div>
              {myActiveJobs.length === 0 ? (
                <p className="panel-muted">No active jobs right now.</p>
              ) : (
                <ul className="kid-job-list">
                  {myActiveJobs.slice(0, 4).map((job) => {
                    const countdown = getClaimCountdown(job)
                    return (
                      <li key={`overview:${job.id || job.title}`} className="kid-job-item">
                        <div className="kid-job-main">
                          <span className="mission-main">
                            <em aria-hidden="true">{job.icon}</em>
                            {job.title}
                          </span>
                          {countdown ? (
                            <span className={`job-status-label ${countdown.expired ? 'status-error' : ''}`}>
                              {countdown.expired ? 'Time is up' : `Time left: ${countdown.label}`}
                            </span>
                          ) : null}
                        </div>
                        <div className="kid-job-side">
                          <span className="mission-reward">+ {job.points}</span>
                          <span className="kid-job-state kid-job-state-active">
                            {job.childId ? 'Assigned' : 'Pool job'}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {!hasPoolClaimLimitReached && hasOpenPoolJobs ? (
                <button
                  type="button"
                  className="claim-button panel-action-button"
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
                className="claim-button panel-action-button"
                onClick={() => setActiveTab('rewards')}
              >
                Go To Rewards
              </button>
            </section>

            <section className="panel">
              <p className="panel-label">Savings</p>
              <div className="limit-chip-row">
                <span className="limit-chip">Goal slots: {activeChildGoal ? 1 : 0}/1</span>
              </div>
              {!activeChildGoal && !pendingChildGoalRequest ? (
                <p className="panel-muted">No active savings goal yet.</p>
              ) : null}
              {pendingChildGoalRequest ? (
                <p className="panel-muted">Your goal request is waiting for parent approval.</p>
              ) : (
                <>
                  {activeChildGoal ? (
                    <>
                      <p className="panel-muted">{activeChildGoal.name}</p>
                      <p className="panel-muted">
                        {activeChildGoal.saved}/{activeChildGoal.target} credits ({childGoalProgress}%)
                      </p>
                      <div className="xp-track xp-track-light">
                        <span style={{ width: `${childGoalProgress}%` }}></span>
                      </div>
                    </>
                  ) : null}
                </>
              )}
              {!activeChildGoal && !pendingChildGoalRequest ? (
                <button
                  type="button"
                  className="claim-button panel-action-button"
                  onClick={() => setActiveTab('savings')}
                >
                  Add Savings Goal
                </button>
              ) : null}
            </section>
          </>
        ) : null}

        {!loading && !error && (!requiresSessionCode || sessionUnlocked) && activeTab === 'rules' ? (
          <section className="panel">
            <p className="panel-label">House Rules</p>
            <p className="panel-muted">These are the current family rules that affect your jobs, savings, and rewards.</p>

            {familyRulesText ? (
              <div className="money-block">
                <p className="panel-label money-section-title">Family Note</p>
                <p className="panel-muted">{familyRulesText}</p>
              </div>
            ) : null}

            <div className="money-block">
              <p className="panel-label money-section-title">Savings</p>
              <p className="panel-muted">{savingsApprovalHint}</p>
            </div>

            <div className="money-block">
              <p className="panel-label money-section-title">Jobs</p>
              <p className="panel-muted">{missedJobsHint}</p>
              <p className="panel-muted">{failedChecksHint}</p>
              <p className="panel-muted">{poolJobsHint}</p>
            </div>

            <div className="money-block">
              <p className="panel-label money-section-title">Recent Outcomes</p>
              {consequenceEvents.length === 0 ? (
                <p className="panel-muted">No consequence events yet.</p>
              ) : (
                <ul className="kid-job-list">
                  {consequenceEvents.slice(0, 5).map((entry) => (
                    <li key={`rules-event:${entry.id}`} className="kid-job-item">
                      <div className="kid-job-main">
                        <span className="mission-main">
                          {entry.type === 'job_marked_missed' ? '⚠️ Job marked missed' : '🧪 Job check denied'}
                        </span>
                        <span className="job-status-label">{entry.jobTitle || 'Job'}</span>
                      </div>
                      <div className="kid-job-side">
                        <span className="mission-reward">
                          {entry.penaltyCredits > 0 ? `- ${entry.penaltyCredits}` : 'No credit change'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        {!loading && !error && (!requiresSessionCode || sessionUnlocked) && activeTab === 'jobs' ? (
          <section className="panel">
            <p className="panel-label">Jobs</p>
            <p className="panel-muted">See the House Rules tab for current policy details.</p>
            <div className="limit-chip-row">
              <span className="limit-chip">Pool claimed: {blockingPoolJobs.length}/{maxActivePoolClaimsPerChild}</span>
              <span className="limit-chip">To do: {todaysReadyJobs.length}</span>
              <span className="limit-chip">Doing: {jobsTabInProgressJobs.length}</span>
              <span className="limit-chip">Done: {todaysDoneJobs.length}</span>
            </div>

            {!hasAnyJobsForJobsTab ? (
              <p className="panel-muted">No jobs right now.</p>
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
                        const policyPreview = getJobPolicyPreview(job)
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
                              {policyPreview.map((line) => (
                                <p key={`${job.id}:${line}`} className="kid-job-hint">{line}</p>
                              ))}
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
                  {jobsTabInProgressJobs.length === 0 ? (
                    <p className="panel-muted">No jobs in progress.</p>
                  ) : (
                    <ul className="kid-job-list">
                      {jobsTabInProgressJobs.map((job) => {
                        const state = getJobState(job)
                        const countdown = getClaimCountdown(job)
                        return (
                          <li key={`progress:${job.id || job.title}`} className="kid-job-item">
                            <div className="kid-job-main">
                              <span className="mission-main">
                                <em aria-hidden="true">{job.icon}</em>
                                {job.title}
                              </span>
                              {countdown ? (
                                <span className={`job-status-label ${countdown.expired ? 'status-error' : ''}`}>
                                  {countdown.expired ? 'Time is up' : `Time left: ${countdown.label}`}
                                </span>
                              ) : null}
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
                {allowClaimingWithPendingChecks
                  ? 'Finish one active pool job or submit it for parent check, then pick a new one.'
                  : 'Finish or submit enough pool jobs so you are under your slot limit, then pick a new one.'}
              </p>
            ) : null}
            {jobPool.length === 0 ? (
              <p className="panel-muted">No pool jobs right now.</p>
            ) : (
              <ul className="kid-job-list">
                {jobPool.map((job) => {
                  const limitDetails = getJobLimitDetails(job)
                  const policyPreview = getJobPolicyPreview(job)
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
                        {policyPreview.map((line) => (
                          <p key={`${job.id}:${line}`} className="kid-job-hint">{line}</p>
                        ))}
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
          <section className="panel kid-money-panel">
            <p className="panel-label">Money</p>
            <p className="panel-muted">See what credits you got and what you spent.</p>

            <div className="money-block">
              <p className="panel-label money-section-title">Savings Snapshot</p>
              <div className="limit-chip-row">
                <span className="limit-chip">
                  Goal: {
                    activeChildGoal
                      ? 'Active'
                      : pendingChildGoalRequest
                        ? 'Pending approval'
                        : childGoalCountered
                          ? 'Counter offer'
                          : 'Not set'
                  }
                </span>
                <span className="limit-chip">Balance: {dashboard.balance.credits} credits</span>
              </div>
              {activeChildGoal ? (
                <>
                  <p className="panel-muted">{activeChildGoal.name}</p>
                  <p className="panel-muted">
                    {activeChildGoal.saved}/{activeChildGoal.target} credits ({childGoalProgress}%)
                  </p>
                  <div className="xp-track xp-track-light">
                    <span style={{ width: `${childGoalProgress}%` }}></span>
                  </div>
                </>
              ) : pendingChildGoalRequest ? (
                <p className="panel-muted">
                  Reward goal request pending: {pendingChildGoalRequest.rewardTitle || pendingChildGoalRequest.name} ({pendingChildGoalRequest.target} credits)
                </p>
              ) : childGoalCountered && childGoal ? (
                <p className="panel-muted">
                  Parent sent a counter offer for {childGoal.name}: {childGoal.counterTarget} credits.
                </p>
              ) : (
                <p className="panel-muted">No savings goal yet. Make one and start building it up.</p>
              )}
              <button
                type="button"
                className="claim-button"
                onClick={() => setActiveTab('savings')}
              >
                {activeChildGoal || pendingChildGoalRequest ? 'Open Savings' : 'Save for a Reward'}
              </button>
            </div>

            <div className="money-block">
              <p className="panel-label money-section-title">History</p>
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
            </div>
          </section>
        ) : null}

        {!loading && !error && (!requiresSessionCode || sessionUnlocked) && activeTab === 'savings' ? (
          <section className="panel kid-savings-panel">
            <p className="panel-label">Savings</p>
            <p className="panel-muted">Save up credits to earn a reward you want.</p>
            <p className="panel-muted">See the House Rules tab for current approval rules.</p>

            <div className="money-block">
              <p className="panel-label money-section-title">Savings Goal</p>
              <div className="limit-chip-row">
                <span className="limit-chip">Goal slots: {activeChildGoal ? 1 : 0}/1</span>
                <span className="limit-chip">Balance: {dashboard.balance.credits} credits</span>
              </div>
              {activeChildGoal ? (
                <p className="panel-muted">
                  One active savings goal is allowed at a time. Complete this one before creating a new goal.
                </p>
              ) : pendingChildGoalRequest ? (
                <p className="panel-muted">
                  Your goal request is waiting for parent approval.
                </p>
              ) : childGoalCountered ? (
                <p className="panel-muted">
                  Parent sent a counter offer. Accept it to start saving or decline and request a new goal.
                </p>
              ) : (
                <p className="panel-muted">Pick a reward and start saving for it.</p>
              )}

              {!activeChildGoal && !pendingChildGoalRequest && !childGoalCountered ? (
                <button
                  type="button"
                  className="claim-button"
                  onClick={() => setActiveTab('rewards')}
                >
                  Browse Rewards to Save For
                </button>
              ) : null}

              {childGoalCountered && childGoal ? (
                <div className="auth-form">
                  <p className="panel-muted">
                    Counter offer target: {childGoal.counterTarget} credits
                  </p>
                  {childGoal.counterNote ? (
                    <p className="panel-muted">Parent note: {childGoal.counterNote}</p>
                  ) : null}
                  <div className="button-row">
                    <button
                      type="button"
                      className="claim-button"
                      disabled={resolvingGoalCounter.length > 0}
                      onClick={handleAcceptGoalCounter}
                    >
                      {resolvingGoalCounter === 'accept' ? 'Accepting...' : 'Accept Offer'}
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={resolvingGoalCounter.length > 0}
                      onClick={handleDeclineGoalCounter}
                    >
                      {resolvingGoalCounter === 'decline' ? 'Declining...' : 'Decline Offer'}
                    </button>
                  </div>
                </div>
              ) : null}

              {activeChildGoal && !childGoalWaitingApproval ? (
                <form className="auth-form" onSubmit={handleContributeToSavingsGoal}>
                  <p className="panel-muted">
                    Pick an amount to move into your goal.
                  </p>
                  <div className="money-quick-row" role="group" aria-label="Quick contribution amounts">
                    {[10, 25, 50].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className="limit-chip money-quick-chip"
                        onClick={() => setContributionAmount(String(value))}
                      >
                        +{value}
                      </button>
                    ))}
                  </div>
                  <input
                    className="job-input"
                    type="number"
                    min="1"
                    max={Math.max(0, Number(dashboard.balance.credits) || 0)}
                    placeholder="Contribution amount"
                    value={contributionAmount}
                    onChange={(event) => setContributionAmount(event.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className="claim-button"
                    disabled={
                      savingContribution
                      || (Number(dashboard.balance.credits) || 0) <= 0
                      || childGoalCompleted
                    }
                  >
                    {savingContribution ? 'Saving...' : 'Add To Savings Goal'}
                  </button>
                </form>
              ) : null}

              {childGoalWaitingApproval ? (
                <p className="panel-muted">
                  Target reached. A parent can now approve this goal as completed.
                </p>
              ) : null}

              {childGoalPendingApproval ? (
                <p className="panel-muted">
                  Parent review is needed before you can contribute to this goal.
                </p>
              ) : null}

              {childGoalCountered ? (
                <p className="panel-muted">
                  Respond to the counter offer before contributing.
                </p>
              ) : null}

              {childGoalCompleted ? (
                <p className="panel-muted">
                  Goal completed and parent-approved. You can start a new goal now.
                </p>
              ) : null}
            </div>

            {childGoals.length === 0 ? (
              <p className="panel-muted">No savings goals for this child yet.</p>
            ) : (
              <ul className="kid-job-list">
                {childGoals.map((goal) => {
                  const pct = Number(goal.target) > 0
                    ? Math.round((goal.saved / goal.target) * 100)
                    : 0
                  const statusLabel =
                    goal.status === 'completed'
                      ? 'Completed'
                      : goal.status === 'pending_parent_approval'
                        ? 'Pending Parent'
                      : goal.status === 'ready_to_claim'
                        ? 'Ready for Parent'
                        : goal.status === 'denied'
                          ? 'Denied'
                        : 'Saving'

                  return (
                    <li key={`${goal.childId || 'family'}:${goal.name}`} className="kid-job-item">
                      <div className="kid-job-main" style={{ width: '100%' }}>
                        <span className="mission-main">
                          {goal.rewardId ? '🎁' : '🎯'} {goal.rewardTitle || goal.name}
                        </span>
                        {goal.rewardId && goal.rewardTitle !== goal.name ? (
                          <span className="panel-muted" style={{ fontSize: '0.78rem' }}>{goal.name}</span>
                        ) : null}
                        <div className="limit-chip-row">
                          <span className="job-status-label">{goal.saved}/{goal.target} credits</span>
                          <span className="kid-job-state kid-job-state-ready">{statusLabel}</span>
                        </div>
                        {getNegotiationChips(goal).length > 0 ? (
                          <div className="negotiation-chip-row">
                            {getNegotiationChips(goal).map((chip) => (
                              <span
                                key={chip.key}
                                className={`negotiation-chip negotiation-chip-${chip.tone}`}
                                title={chip.at}
                              >
                                {chip.label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="xp-track xp-track-light">
                          <span style={{ width: `${pct}%` }}></span>
                        </div>
                        {goal.status !== 'completed' ? (
                          cancelGoalConfirmId === goal.id ? (
                            <div className="button-row" style={{ marginTop: '0.5rem' }}>
                              <span className="panel-muted" style={{ fontSize: '0.8rem' }}>
                                {Number(goal.saved) > 0
                                  ? `Cancel and return ${goal.saved} credits?`
                                  : 'Cancel this goal?'}
                              </span>
                              <button
                                type="button"
                                className="text-button"
                                style={{ color: 'var(--color-danger, #e05252)' }}
                                disabled={cancellingGoalId === goal.id}
                                onClick={() => handleCancelSavingsGoal(goal.id)}
                              >
                                {cancellingGoalId === goal.id ? 'Cancelling...' : 'Yes, cancel'}
                              </button>
                              <button
                                type="button"
                                className="text-button"
                                onClick={() => setCancelGoalConfirmId('')}
                              >
                                Keep it
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="text-button"
                              style={{ marginTop: '0.4rem', fontSize: '0.78rem' }}
                              disabled={cancellingGoalId === goal.id}
                              onClick={() => setCancelGoalConfirmId(goal.id)}
                            >
                              Cancel goal
                            </button>
                          )
                        ) : null}
                      </div>
                    </li>
                  )
                })}
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
            <div className="money-block">
              <p className="panel-label money-section-title">Pitch A Reward Idea</p>
              <p className="panel-muted">
                Send one custom reward idea at a time so parents can review it.
              </p>
              {hasOpenRewardRequest ? (
                <p className="panel-muted">You already have a reward request waiting for review.</p>
              ) : (
                <form className="auth-form" onSubmit={handleCreateCustomRewardRequest}>
                  <input
                    className="job-input"
                    placeholder="Reward idea"
                    value={customRewardTitle}
                    onChange={(event) => setCustomRewardTitle(event.target.value)}
                    required
                  />
                  <input
                    className="job-input"
                    type="number"
                    min="1"
                    placeholder="Proposed cost"
                    value={customRewardCost}
                    onChange={(event) => setCustomRewardCost(event.target.value)}
                    required
                  />
                  <input
                    className="job-input"
                    placeholder="Optional note to parent"
                    value={customRewardNote}
                    onChange={(event) => setCustomRewardNote(event.target.value)}
                  />
                  <button type="submit" className="claim-button" disabled={creatingCustomRewardRequest}>
                    {creatingCustomRewardRequest ? 'Sending...' : 'Send Reward Idea'}
                  </button>
                </form>
              )}
            </div>
            {storeData.rewards.length === 0 ? (
              <p className="panel-muted">No rewards for this child yet.</p>
            ) : (
              <ul className="kid-job-list">
                {storeData.rewards.map((reward) => {
                  const limitDetails = getRewardLimitDetails(reward)
                  const alreadySavingForThis = childGoals.some(
                    (g) =>
                      g.rewardId === reward.id
                      && (g.status === 'active'
                        || g.status === 'pending_parent_approval'
                        || g.status === 'ready_to_claim'),
                  )
                  const goalSlotTaken = !!(activeChildGoal || pendingChildGoalRequest || childGoalCountered)
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
                        {alreadySavingForThis ? (
                          <p className="kid-job-hint">✅ Saving for this</p>
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
                            || hasOpenRewardRequest
                            || limitDetails.personalBlocked
                            || limitDetails.familyBlocked
                          }
                        >
                          {requestingRewardId === reward.id ? 'Requesting...' : 'Request'}
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          style={{ marginTop: '0.25rem', fontSize: '0.78rem' }}
                          disabled={
                            savingForRewardId === reward.id
                            || alreadySavingForThis
                            || goalSlotTaken
                          }
                          onClick={() => handleCreateSavingsGoal(reward)}
                        >
                          {savingForRewardId === reward.id
                            ? 'Requesting...'
                            : alreadySavingForThis
                              ? 'Already saving'
                              : goalSlotTaken
                                ? 'Slot taken'
                                : '🪙 Save for this'}
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
                      {item.childNote ? (
                        <p className="panel-muted">Your note: {item.childNote}</p>
                      ) : null}
                      {item.parentNote ? (
                        <p className="panel-muted">Parent note: {item.parentNote}</p>
                      ) : null}
                      {item.status === 'countered' ? (
                        <p className="panel-muted">
                          Parent offered: {item.counterRewardTitle || item.rewardTitle} ({item.counterCost || item.cost} credits)
                        </p>
                      ) : null}
                    </div>
                    <div className="kid-job-side">
                      <span className={`kid-job-state kid-job-state-${getRequestTone(item.status)}`}>
                        {displayRequestStatus(item.status)}
                      </span>
                      {item.status === 'countered' ? (
                        <div className="button-row" style={{ marginTop: '0.35rem' }}>
                          <button
                            type="button"
                            className="claim-button"
                            disabled={resolvingRewardRequestId.length > 0}
                            onClick={() => handleAcceptRewardCounter(item)}
                          >
                            {resolvingRewardRequestId === `accept:${item.id}` ? 'Accepting...' : 'Accept Parent Offer'}
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            disabled={resolvingRewardRequestId.length > 0}
                            onClick={() => handleDeclineRewardCounter(item)}
                          >
                            {resolvingRewardRequestId === `decline:${item.id}` ? 'Declining...' : 'Decline'}
                          </button>
                        </div>
                      ) : null}
                      {item.status === 'approved' && item.requestKind === 'proposal' && item.rewardId ? (
                        <div className="button-row" style={{ marginTop: '0.35rem' }}>
                          <button
                            type="button"
                            className="claim-button"
                            disabled={requestingRewardId.length > 0}
                            onClick={() => handleClaimApprovedReward(item)}
                          >
                            {requestingRewardId === `approved:${item.id}` ? 'Claiming...' : 'Claim Now'}
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            disabled={savingForRewardId.length > 0 || !!(activeChildGoal || pendingChildGoalRequest || childGoalCountered)}
                            onClick={() => handleCreateSavingsGoal({
                              id: item.rewardId,
                              title: item.rewardTitle,
                              cost: item.cost,
                            })}
                          >
                            Save For This
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

      </main>
    </>
  )
}
