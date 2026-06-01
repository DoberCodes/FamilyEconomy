import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import FormattedRichText from '../../components/shared/FormattedRichText'
import BalanceCard from '../../components/mobile/cards/BalanceCard'
import StreakCard from '../../components/mobile/cards/StreakCard'
import KidPinCodeField from '../../components/mobile/kidProfile/KidPinCodeField'
import KidProfileHeader from '../../components/mobile/kidProfile/KidProfileHeader'
import { EMPTY_KID_DASHBOARD } from '../../components/mobile/kidProfile/kidProfileConstants'
import TopStatusBar from '../../components/mobile/TopStatusBar'
import ProgressTrack from '../../components/shared/ProgressTrack'
import { useAuth } from '../../context/AuthContext'
import {
  getGoalStatusLabel as displayGoalStatus,
  getRequestTone,
  getRewardRequestStatusLabel as displayRequestStatus,
  getStatementStatusLabel as displayStatementStatus,
} from '../../domain/familyEconomyTypes'
import { trackAnalyticsEvent } from '../../services/analytics'
import {
  getFamilyConsequenceEvents,
  getFamilyDashboard,
  getFamilyJobCheckRequests,
  getFamilyStoreData,
  getHouseholdOnboardingData,
  setChildSessionCode,
} from '../../services/familyEconomyService'
import { computeClaimCountdownData } from '../../services/policyUtils.js'
import {
  useAcceptRewardRequestTermsMutation,
  useAcceptSavingsGoalCounterMutation,
  useCancelSavingsGoalMutation,
  useClaimApprovedRewardProposalMutation,
  useClaimJobMutation,
  useContributeToSavingsGoalMutation,
  useCreateCustomRewardRequestMutation,
  useCreateGoalMutation,
  useDeclineRewardRequestTermsMutation,
  useDeclineSavingsGoalCounterMutation,
  useRequestJobCheckMutation,
  useRequestRewardMutation,
} from '../../store/familyEconomyApi'
import {
  formatShortDate as formatDate,
  getWindowLabel,
  getWindowStart,
  toDate,
} from '../../utils/dateUtils'

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
  const [acceptRewardRequestTermsMutation] = useAcceptRewardRequestTermsMutation()
  const [acceptSavingsGoalCounterMutation] = useAcceptSavingsGoalCounterMutation()
  const [cancelSavingsGoalMutation] = useCancelSavingsGoalMutation()
  const [claimApprovedRewardProposalMutation] = useClaimApprovedRewardProposalMutation()
  const [claimJobMutation] = useClaimJobMutation()
  const [contributeToSavingsGoalMutation] = useContributeToSavingsGoalMutation()
  const [createCustomRewardRequestMutation] = useCreateCustomRewardRequestMutation()
  const [createGoalMutation] = useCreateGoalMutation()
  const [declineRewardRequestTermsMutation] = useDeclineRewardRequestTermsMutation()
  const [declineSavingsGoalCounterMutation] = useDeclineSavingsGoalCounterMutation()
  const [requestJobCheckMutation] = useRequestJobCheckMutation()
  const [requestRewardMutation] = useRequestRewardMutation()

  const [childProfiles, setChildProfiles] = useState([])
  const [dashboard, setDashboard] = useState(EMPTY_KID_DASHBOARD)
  const [storeData, setStoreData] = useState({ rewards: [], requests: [] })
  const [jobCheckRequests, setJobCheckRequests] = useState([])
  const [consequenceEvents, setConsequenceEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requiresSessionCode, setRequiresSessionCode] = useState(false)
  const [childHasSessionCode, setChildHasSessionCode] = useState(false)
  const [sessionCodeInput, setSessionCodeInput] = useState('')
  const [showSessionCode, setShowSessionCode] = useState(false)
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
  const [familyContributionAmount, setFamilyContributionAmount] = useState('25')
  const [savingContribution, setSavingContribution] = useState(false)
  const [savingFamilyContribution, setSavingFamilyContribution] = useState(false)
  const [resolvingGoalCounter, setResolvingGoalCounter] = useState('')
  const [savingsGoalApprovalMode, setSavingsGoalApprovalMode] = useState('claim_only')
  const [familyAnnouncementText, setFamilyAnnouncementText] = useState('')
  const [familyRulesText, setFamilyRulesText] = useState('')
  const [achievementsEnabled, setAchievementsEnabled] = useState(true)
  const [familyRecognitionEnabled, setFamilyRecognitionEnabled] = useState(true)
  const [achievementFirstGoalTarget, setAchievementFirstGoalTarget] = useState(1)
  const [achievementContributorCreditsTarget, setAchievementContributorCreditsTarget] = useState(100)
  const [achievementHelperJobsTarget, setAchievementHelperJobsTarget] = useState(3)
  const [achievementReadingJobsTarget, setAchievementReadingJobsTarget] = useState(5)
  const [recognitionStreakDaysTarget, setRecognitionStreakDaysTarget] = useState(3)
  const [recognitionHelpingHandJobsTarget, setRecognitionHelpingHandJobsTarget] = useState(1)
  const [recognitionGoalGetterTarget, setRecognitionGoalGetterTarget] = useState(1)
  const [customBadges, setCustomBadges] = useState([])
  const [missedJobConsequenceEnabled, setMissedJobConsequenceEnabled] = useState(false)
  const [missedJobPenaltyCredits, setMissedJobPenaltyCredits] = useState(0)
  const [missedJobTimingEnabled, setMissedJobTimingEnabled] = useState(false)
  const [missedJobDefaultHours, setMissedJobDefaultHours] = useState(24)
  const [failedJobCheckConsequenceEnabled, setFailedJobCheckConsequenceEnabled] = useState(false)
  const [failedJobCheckPenaltyCredits, setFailedJobCheckPenaltyCredits] = useState(0)
  const [maxActivePoolClaimsPerChild, setMaxActivePoolClaimsPerChild] = useState(1)
  const [allowClaimingWithPendingChecks, setAllowClaimingWithPendingChecks] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [houseRulesSnapshot, setHouseRulesSnapshot] = useState('')
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

  const updateRewardCelebration = useCallback((selectedChildId, requests) => {
    if (!familyId || !selectedChildId) {
      return
    }

    const relevantRequests = (requests || [])
      .filter((request) => request.requestedBy === selectedChildId)
      .filter((request) => request.status === 'approved' || request.status === 'fulfilled')

    if (relevantRequests.length === 0) {
      return
    }

    const parseTimeMs = (value) => {
      if (!value) {
        return 0
      }
      if (typeof value?.toDate === 'function') {
        return value.toDate().getTime()
      }
      if (typeof value === 'string' || value instanceof Date) {
        const date = new Date(value)
        return Number.isNaN(date.getTime()) ? 0 : date.getTime()
      }
      return 0
    }

    const latest = relevantRequests
      .map((request) => ({
        request,
        atMs: Math.max(parseTimeMs(request.fulfilledAt), parseTimeMs(request.reviewedAt), parseTimeMs(request.createdAt)),
      }))
      .sort((left, right) => right.atMs - left.atMs)[0]

    if (!latest || latest.atMs <= 0) {
      return
    }

    const storageKey = `family-economy-reward-celebration:${familyId}:${selectedChildId}`
    const previousMs = Number(localStorage.getItem(storageKey) || 0)

    if (latest.atMs > previousMs) {
      if (latest.request.status === 'fulfilled') {
        setCelebrationTitle('Reward Delivered')
        setCelebrationMessage(`Your reward "${latest.request.rewardTitle}" was fulfilled!`)
      } else {
        setCelebrationTitle('Reward Approved')
        setCelebrationMessage(`Nice! "${latest.request.rewardTitle}" was approved.`)
      }
    }

    localStorage.setItem(storageKey, String(latest.atMs))
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
        setFamilyAnnouncementText(onboarding.data.family?.familyAnnouncement || '')
        setFamilyRulesText(onboarding.data.family?.familyRules || '')
        setSavingsGoalApprovalMode(onboarding.data.family?.savingsGoalApprovalMode || 'claim_only')
        setAchievementsEnabled(onboarding.data.family?.achievementsEnabled !== false)
        setFamilyRecognitionEnabled(onboarding.data.family?.familyRecognitionEnabled !== false)
        setAchievementFirstGoalTarget(Math.max(1, Number(onboarding.data.family?.achievementFirstGoalTarget) || 1))
        setAchievementContributorCreditsTarget(Math.max(1, Number(onboarding.data.family?.achievementContributorCreditsTarget) || 100))
        setAchievementHelperJobsTarget(Math.max(1, Number(onboarding.data.family?.achievementHelperJobsTarget) || 3))
        setAchievementReadingJobsTarget(Math.max(1, Number(onboarding.data.family?.achievementReadingJobsTarget) || 5))
        setRecognitionStreakDaysTarget(Math.max(1, Number(onboarding.data.family?.recognitionStreakDaysTarget) || 3))
        setRecognitionHelpingHandJobsTarget(Math.max(1, Number(onboarding.data.family?.recognitionHelpingHandJobsTarget) || 1))
        setRecognitionGoalGetterTarget(Math.max(1, Number(onboarding.data.family?.recognitionGoalGetterTarget) || 1))
        setCustomBadges(Array.isArray(onboarding.data.family?.customBadges) ? onboarding.data.family.customBadges : [])
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

        const rulesSnapshot = JSON.stringify({
          familyRules: onboarding.data.family?.familyRules || '',
          familyAnnouncement: onboarding.data.family?.familyAnnouncement || '',
          savingsGoalApprovalMode: onboarding.data.family?.savingsGoalApprovalMode || 'claim_only',
          missedJobConsequenceEnabled: Boolean(onboarding.data.family?.missedJobConsequenceEnabled),
          missedJobPenaltyCredits: Number(onboarding.data.family?.missedJobPenaltyCredits) || 0,
          missedJobTimingEnabled: Boolean(onboarding.data.family?.missedJobTimingEnabled),
          missedJobDefaultHours: Number(onboarding.data.family?.missedJobDefaultHours) || 24,
          failedJobCheckConsequenceEnabled: Boolean(onboarding.data.family?.failedJobCheckConsequenceEnabled),
          failedJobCheckPenaltyCredits: Number(onboarding.data.family?.failedJobCheckPenaltyCredits) || 0,
          maxActivePoolClaimsPerChild: Math.max(1, Number(onboarding.data.family?.maxActivePoolClaimsPerChild) || 1),
          allowClaimingWithPendingChecks: Boolean(onboarding.data.family?.allowClaimingWithPendingChecks),
        })
        setHouseRulesSnapshot(rulesSnapshot)
        if (familyId && childId) {
          const rulesSeenKey = `family-economy-house-rules-seen:${familyId}:${childId}`
          const seenSnapshot = localStorage.getItem(rulesSeenKey)
          const seenLooksLegacyTimestamp = /^\d+$/.test((seenSnapshot || '').trim())

          if (!seenSnapshot || seenLooksLegacyTimestamp) {
            localStorage.setItem(rulesSeenKey, rulesSnapshot)
            setHasUnreadHouseRulesUpdate(false)
          } else {
            setHasUnreadHouseRulesUpdate(seenSnapshot !== rulesSnapshot)
          }
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
        updateRewardCelebration(selected.id, storeResult.data.requests)
        setDashboard(dashboardResult.data)
        setStoreData(storeResult.data)
        setConsequenceEvents(consequenceResult.data.events || [])
        setJobCheckRequests(checkResult.data.requests)
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError.message || 'Could not load child profile.')
          setDashboard(EMPTY_KID_DASHBOARD)
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
    updateRewardCelebration,
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
      updateRewardCelebration(selected.id, storeResult.data.requests)
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
      updateRewardCelebration(selected.id, storeResult.data.requests)
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
    updateRewardCelebration(selectedChildId, storeResult.data.requests)
    setDashboard(dashboardResult.data)
    setStoreData(storeResult.data)
    setJobCheckRequests(checkResult.data.requests)
    setConsequenceEvents(consequenceResult.data.events || [])
  }

  function getChildSessionContext() {
    return {
      familyId,
      userId,
      userRole,
      selectedChildId: resolvedChild?.id,
    }
  }

  async function handleRequestJobCheck(job) {
    if (!resolvedChild?.id || !job?.id) {
      return
    }

    setRequestingCheckJobId(job.id)
    setError('')

    try {
      await requestJobCheckMutation({
        job,
        context: getChildSessionContext(),
      }).unwrap()
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
      await claimJobMutation({
        jobId: job.id,
        context: getChildSessionContext(),
      }).unwrap()
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
      await requestRewardMutation({
        reward,
        context: getChildSessionContext(),
      }).unwrap()
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
      await createCustomRewardRequestMutation({
        requestPayload: {
          rewardTitle: customRewardTitle,
          cost: Number(customRewardCost) || 0,
          childNote: customRewardNote,
        },
        context: getChildSessionContext(),
      }).unwrap()
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
      await acceptRewardRequestTermsMutation({
        requestId: request.id,
        context: getChildSessionContext(),
      }).unwrap()
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
      await declineRewardRequestTermsMutation({
        requestId: request.id,
        context: getChildSessionContext(),
      }).unwrap()
      await refreshChildData(resolvedChild.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not decline these reward terms.')
    } finally {
      setResolvingRewardRequestId('')
    }
  }

  async function handleClaimApprovedReward(request) {
    if (!request?.id || !resolvedChild?.id) {
      return
    }

    setRequestingRewardId(`approved:${request.id}`)
    setError('')

    try {
      await claimApprovedRewardProposalMutation({
        requestId: request.id,
        context: getChildSessionContext(),
      }).unwrap()
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
      await createGoalMutation({
        goalPayload: {
          name: reward.title,
          rewardId: reward.id,
          rewardTitle: reward.title,
          target: Number(reward.cost) || 0,
          childId: resolvedChild.id,
          saved: 0,
        },
        context: getChildSessionContext(),
      }).unwrap()
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
      await cancelSavingsGoalMutation({
        goalId,
        context: getChildSessionContext(),
      }).unwrap()
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
      await contributeToSavingsGoalMutation({
        goalId: activeChildGoal.id,
        amount: contribution,
        context: getChildSessionContext(),
      }).unwrap()

      await refreshChildData(resolvedChild?.id)
      setContributionAmount('25')
    } catch (caughtError) {
      setError(caughtError.message || 'Could not move credits into savings.')
    } finally {
      setSavingContribution(false)
    }
  }

  async function handleContributeToFamilySavingsGoal(event) {
    event.preventDefault()
    if (!familySavingsGoal?.id) {
      return
    }

    setError('')
    setSavingFamilyContribution(true)

    const contribution = Number(familyContributionAmount) || 0

    try {
      await contributeToSavingsGoalMutation({
        goalId: familySavingsGoal.id,
        amount: contribution,
        context: getChildSessionContext(),
      }).unwrap()

      await refreshChildData(resolvedChild?.id)
      setFamilyContributionAmount('25')
    } catch (caughtError) {
      setError(caughtError.message || 'Could not move credits into the family savings goal.')
    } finally {
      setSavingFamilyContribution(false)
    }
  }

  async function handleAcceptGoalCounter() {
    if (!childGoal?.id) {
      return
    }

    setError('')
    setResolvingGoalCounter('accept')

    try {
      await acceptSavingsGoalCounterMutation({
        goalId: childGoal.id,
        context: getChildSessionContext(),
      }).unwrap()
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
      await declineSavingsGoalCounterMutation({
        goalId: childGoal.id,
        context: getChildSessionContext(),
      }).unwrap()
      await refreshChildData(resolvedChild?.id)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not decline this counter offer.')
    } finally {
      setResolvingGoalCounter('')
    }
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
  const latestVisibleJobCreatedAtMs = dashboard.jobs
    .filter((job) => job.status === 'open' && (job.childId === resolvedChild?.id || !job.childId))
    .reduce((maxValue, job) => {
      const ms = toDate(job.createdAt || job.updatedAt)?.getTime() || 0
      return Math.max(maxValue, ms)
    }, 0)
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
  const rewardRequestGoalKeys = new Set(
    dashboard.goals
      .filter((goal) => goal.childId === resolvedChild?.id && goal.rewardId)
      .map((goal) => String(goal.rewardId)),
  )
  const getRewardRequestGoalKey = (request) => String(request.rewardId || `proposal:${request.id}`)
  const isRewardRequestActionLocked = (request) => rewardRequestGoalKeys.has(getRewardRequestGoalKey(request))
  const hiddenProposalRewardIds = new Set(
    rewardHistory
      .filter((request) => request.requestKind === 'proposal' && request.rewardId)
      .map((request) => request.rewardId),
  )
  const visibleRewards = (storeData.rewards || []).filter(
    (reward) => !hiddenProposalRewardIds.has(reward.id),
  )
  const latestRewardCreatedAtMs = visibleRewards.reduce((maxValue, reward) => {
    const ms = toDate(reward.createdAt || reward.updatedAt)?.getTime() || 0
    return Math.max(maxValue, ms)
  }, 0)
  const jobsSeenKey = familyId && resolvedChild?.id
    ? `family-economy-jobs-seen:${familyId}:${resolvedChild.id}`
    : ''
  const rewardsSeenKey = familyId && resolvedChild?.id
    ? `family-economy-rewards-seen:${familyId}:${resolvedChild.id}`
    : ''
  const seenJobsAtMs = jobsSeenKey ? Number(localStorage.getItem(jobsSeenKey) || 0) : 0
  const seenRewardsAtMs = rewardsSeenKey ? Number(localStorage.getItem(rewardsSeenKey) || 0) : 0
  const hasUnreadJobsUpdate =
    latestVisibleJobCreatedAtMs > 0
    && seenJobsAtMs > 0
    && seenJobsAtMs < latestVisibleJobCreatedAtMs
  const hasUnreadRewardsUpdate =
    latestRewardCreatedAtMs > 0
    && seenRewardsAtMs > 0
    && seenRewardsAtMs < latestRewardCreatedAtMs
  const rewardSnapshotItems = rewardHistory
    .slice()
    .sort((left, right) => {
      const leftMs = toDate(left.fulfilledAt || left.reviewedAt || left.createdAt)?.getTime() || 0
      const rightMs = toDate(right.fulfilledAt || right.reviewedAt || right.createdAt)?.getTime() || 0
      return rightMs - leftMs
    })
  const sortedPastRewardHistory = rewardHistory
    .slice()
    .sort((left, right) => {
      const leftHasActions =
        left.status === 'approved'
        && left.requestKind === 'proposal'
        && !isRewardRequestActionLocked(left)
          ? 1
          : 0
      const rightHasActions =
        right.status === 'approved'
        && right.requestKind === 'proposal'
        && !isRewardRequestActionLocked(right)
          ? 1
          : 0

      if (leftHasActions !== rightHasActions) {
        return rightHasActions - leftHasActions
      }

      const leftMs = toDate(left.fulfilledAt || left.reviewedAt || left.createdAt)?.getTime() || 0
      const rightMs = toDate(right.fulfilledAt || right.reviewedAt || right.createdAt)?.getTime() || 0
      return rightMs - leftMs
    })
  const hasOpenRewardRequest = rewardHistory.some(
    (item) => item.status === 'pending' || item.status === 'countered',
  )
  const pendingRewardCount = rewardHistory.filter((item) => item.status === 'pending' || item.status === 'countered').length
  const approvedRewardCount = rewardHistory.filter((item) => item.status === 'approved').length
  const fulfilledRewardCount = rewardHistory.filter((item) => item.status === 'fulfilled').length
  const deniedRewardCount = rewardHistory.filter((item) => item.status === 'denied').length
  const familySavingsGoal = dashboard.goals
    .filter((goal) => !goal.childId)
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
  const familySavingsGoalProgress = familySavingsGoal && Number(familySavingsGoal.target) > 0
    ? Math.min(100, Math.round((familySavingsGoal.saved / familySavingsGoal.target) * 100))
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
  const childGoals = dashboard.goals.filter((goal) => goal.childId === resolvedChild?.id)
  const childCompletedGoalsCount = childGoals.filter((goal) => goal.status === 'completed').length
  const childFamilyContributionCredits = (familySavingsGoal?.contributionHistory || [])
    .filter((entry) => entry.childId === resolvedChild?.id)
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
  const childHelperPoolJobsCount = completedJobsHistory.filter((job) => (
    job.badgeContribution === 'helper'
    || (job.badgeContribution !== 'reading' && !job.childId)
  )).length
  const childReadingJobsCount = completedJobsHistory
    .filter((job) => (
      job.badgeContribution === 'reading'
      || (job.badgeContribution !== 'helper' && /read|book|reading/i.test(job.title || ''))
    ))
    .length
  const childAchievements = [
    childCompletedGoalsCount >= achievementFirstGoalTarget
      ? { id: 'first-goal', icon: '🏁', label: 'First Goal', category: 'achievement', score: 180 }
      : null,
    childFamilyContributionCredits >= achievementContributorCreditsTarget
      ? {
        id: 'consistent-contributor',
        icon: '🤝',
        label: 'Consistent Contributor',
        category: 'achievement',
        score: 140 + Math.min(80, childFamilyContributionCredits),
      }
      : null,
    childHelperPoolJobsCount >= achievementHelperJobsTarget
      ? {
        id: 'family-helper',
        icon: '🛟',
        label: 'Family Helper',
        category: 'achievement',
        score: 130 + Math.min(60, childHelperPoolJobsCount * 10),
      }
      : null,
    childReadingJobsCount >= achievementReadingJobsTarget
      ? {
        id: 'reading-champion',
        icon: '📚',
        label: 'Reading Champion',
        category: 'achievement',
        score: 120 + Math.min(60, childReadingJobsCount * 8),
      }
      : null,
  ].filter(Boolean)
  const childRecognitionBadges = [
    dashboard.streakDays >= recognitionStreakDaysTarget
      ? {
        id: 'streak-star',
        icon: '🔥',
        label: `Streak Star (${dashboard.streakDays} days)`,
        category: 'recognition',
        score: 100 + Math.min(90, dashboard.streakDays * 3),
      }
      : null,
    childHelperPoolJobsCount >= recognitionHelpingHandJobsTarget
      ? {
        id: 'helping-hand',
        icon: '🌟',
        label: `Helping Hand (${childHelperPoolJobsCount} helps)`,
        category: 'recognition',
        score: 90 + Math.min(70, childHelperPoolJobsCount * 8),
      }
      : null,
    childCompletedGoalsCount >= recognitionGoalGetterTarget
      ? {
        id: 'goal-getter',
        icon: '🎯',
        label: `Goal Getter (${childCompletedGoalsCount} done)`,
        category: 'recognition',
        score: 95 + Math.min(65, childCompletedGoalsCount * 10),
      }
      : null,
  ].filter(Boolean)

  const metricCounts = {
    completed_goals: childCompletedGoalsCount,
    contribution_credits: childFamilyContributionCredits,
    helper_jobs: childHelperPoolJobsCount,
    reading_jobs: childReadingJobsCount,
    streak_days: dashboard.streakDays,
  }
  const customEarnedBadges = (customBadges || [])
    .map((badge, index) => {
      const metricKey = badge?.metric || 'completed_goals'
      const target = Math.max(1, Number(badge?.target) || 1)
      const progress = Number(metricCounts[metricKey]) || 0
      if (progress < target) {
        return null
      }

      const category = badge?.category === 'recognition' ? 'recognition' : 'achievement'
      if (category === 'achievement' && !achievementsEnabled) {
        return null
      }
      if (category === 'recognition' && !familyRecognitionEnabled) {
        return null
      }

      return {
        id: badge?.id || `custom-badge-${index + 1}`,
        icon: badge?.icon || (category === 'recognition' ? '🌟' : '🏅'),
        label: badge?.label || 'Custom Badge',
        category,
        score: 85 + Math.min(90, progress),
      }
    })
    .filter(Boolean)
  const allEarnedBadges = [
    ...(achievementsEnabled ? childAchievements : []),
    ...(familyRecognitionEnabled ? childRecognitionBadges : []),
    ...customEarnedBadges,
  ].sort((left, right) => right.score - left.score)
  const topHeroBadges = allEarnedBadges.slice(0, 3)
  const achievementBadgeCount = achievementsEnabled ? childAchievements.length : 0
  const recognitionBadgeCount = familyRecognitionEnabled ? childRecognitionBadges.length : 0
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
  const isGoalCelebrationState = childGoalWaitingApproval || childGoalCompleted || childGoalProgress >= 100
  const hasPoolClaimLimitReached = blockingPoolJobs.length >= maxActivePoolClaimsPerChild
  const hasOpenPoolJobs = jobPool.length > 0
  const kidSessionReady = !loading && !error && (!requiresSessionCode || sessionUnlocked)
  const showUnlockGate = !loading && !error && requiresSessionCode && !sessionUnlocked
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

  function formatJobReward(job) {
    const amount = Number(job.points) || 0
    return job.rewardType === 'xp' ? `+ ${amount} XP` : `+ ${amount}`
  }

  const statementEntries = [
    ...completedJobsHistory
      .filter((job) => job.rewardType !== 'xp')
      .map((job) => ({
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
    .filter((entry) => (
      entry.type === 'out'
      && (entry.status === 'approved' || entry.status === 'fulfilled')
      && rewardHistory.some(
        (request) => request.id === entry.id.replace('reward:', '') && request.requestKind === 'purchase',
      )
    ))
    .reduce((sum, entry) => sum + entry.amount, 0)

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

  function displaySavingsQuestStatus(status) {
    if (status === 'ready_to_claim') {
      return '🎉 Goal unlocked'
    }
    if (status === 'completed') {
      return '🏆 You did it'
    }
    if (status === 'countered') {
      return '🤝 Counter offer'
    }
    if (status === 'pending_parent_approval') {
      return '⏳ Waiting on parent'
    }
    return '🚀 Saving'
  }

  function normalizeJobLimitKey(title) {
    return (title || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
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
          && (item.status === 'pending' || item.status === 'approved' || item.status === 'fulfilled'),
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

    if (nextTab === 'rules' && hasUnreadHouseRulesUpdate && houseRulesSnapshot && familyId && childId) {
      const rulesSeenKey = `family-economy-house-rules-seen:${familyId}:${childId}`
      localStorage.setItem(rulesSeenKey, houseRulesSnapshot)
      setHasUnreadHouseRulesUpdate(false)
    }

    if (nextTab === 'jobs' && hasUnreadJobsUpdate && familyId && resolvedChild?.id && latestVisibleJobCreatedAtMs) {
      localStorage.setItem(jobsSeenKey, String(latestVisibleJobCreatedAtMs))
    }

    if (nextTab === 'rewards' && hasUnreadRewardsUpdate && familyId && resolvedChild?.id && latestRewardCreatedAtMs) {
      localStorage.setItem(rewardsSeenKey, String(latestRewardCreatedAtMs))
    }
  }

  useEffect(() => {
    if (!familyId || !resolvedChild?.id || !kidSessionReady) {
      return
    }

    const jobsSeenKey = `family-economy-jobs-seen:${familyId}:${resolvedChild.id}`
    const rewardsSeenKey = `family-economy-rewards-seen:${familyId}:${resolvedChild.id}`

    if (latestVisibleJobCreatedAtMs > 0) {
      if (seenJobsAtMs === 0) {
        localStorage.setItem(jobsSeenKey, String(latestVisibleJobCreatedAtMs))
      }
    }

    if (latestRewardCreatedAtMs > 0) {
      if (seenRewardsAtMs === 0) {
        localStorage.setItem(rewardsSeenKey, String(latestRewardCreatedAtMs))
      }
    }
  }, [
    familyId,
    resolvedChild?.id,
    kidSessionReady,
    latestVisibleJobCreatedAtMs,
    latestRewardCreatedAtMs,
    jobsSeenKey,
    rewardsSeenKey,
    seenJobsAtMs,
    seenRewardsAtMs,
  ])

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
      <TopStatusBar title="Child Profile" actionLabel="End Session" onAction={handleExitProfile} />
      <main className="phone-content kid-session-shell">
        {kidSessionReady ? (
          <>
            <KidProfileHeader
              dashboard={dashboard}
              profileName={resolvedChild?.displayName || dashboard.profileName}
              achievementsEnabled={achievementsEnabled}
              familyRecognitionEnabled={familyRecognitionEnabled}
              topHeroBadges={topHeroBadges}
              earnedBadgeCount={allEarnedBadges.length}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              hasUnreadHouseRulesUpdate={hasUnreadHouseRulesUpdate}
              hasUnreadJobsUpdate={hasUnreadJobsUpdate}
              hasUnreadRewardsUpdate={hasUnreadRewardsUpdate}
            />
          </>
        ) : null}

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

        {showUnlockGate ? (
          <section className="panel kid-lock-card">
            <p className="unlock-welcome-kicker">
              {resolvedChild?.avatar || '🌟'} {resolvedChild?.displayName ? `${resolvedChild.displayName}'s space` : 'Your space'}
            </p>
            <p className="panel-label unlock-welcome-title">
              {resolvedChild?.displayName
                ? `Welcome back, ${resolvedChild.displayName}`
                : 'Welcome back'}
            </p>
            <p className="panel-muted unlock-welcome-copy">
              {childHasSessionCode
                ? 'Enter your 4-digit code to jump back into your dashboard.'
                : 'Create your 4-digit code so your dashboard stays protected.'}
            </p>
            {childHasSessionCode ? (
              <>
                <form className="auth-form kid-lock-form" onSubmit={handleUnlockSession}>
                  <KidPinCodeField
                    value={sessionCodeInput}
                    onChange={setSessionCodeInput}
                    showCode={showSessionCode}
                    onToggleShow={() => setShowSessionCode((current) => !current)}
                  />
                  <button type="submit" className="claim-button kid-lock-button">Unlock</button>
                </form>
              </>
            ) : resolvedChild?.allowChildSetSessionCode ? (
              <>
                <form className="auth-form kid-lock-form" onSubmit={handleCreateChildSessionCode}>
                  <KidPinCodeField
                    value={sessionCodeInput}
                    onChange={setSessionCodeInput}
                    showCode={showSessionCode}
                    onToggleShow={() => setShowSessionCode((current) => !current)}
                    placeholder="Create 4-digit code"
                  />
                  <button type="submit" className="claim-button kid-lock-button">Save Code</button>
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
          <section className="panel kid-lock-card kid-pin-setup-card">
            <p className="panel-label">Set PIN</p>
            <p className="panel-muted">
              You can set a 4-digit PIN to protect your session next time.
            </p>
            <form className="auth-form kid-lock-form" onSubmit={handleCreateChildSessionCode}>
              <KidPinCodeField
                value={sessionCodeInput}
                onChange={setSessionCodeInput}
                showCode={showSessionCode}
                onToggleShow={() => setShowSessionCode((current) => !current)}
                placeholder="Create 4-digit code"
              />
              <button type="submit" className="claim-button kid-lock-button">
                Save My PIN
              </button>
            </form>
          </section>
        ) : null}

        {!loading && !error && (!requiresSessionCode || sessionUnlocked) && activeTab === 'overview' ? (
          <>
            <BalanceCard credits={dashboard.balance.credits} />
            <StreakCard days={dashboard.streakDays} />

            <section className={isGoalCelebrationState ? 'panel kid-savings-overview-panel savings-celebration-panel celebration-pop' : 'panel kid-savings-overview-panel'}>
              <div className="panel-title-row">
                <p className="panel-label">Savings Quest</p>
                <span className="limit-chip panel-title-chip">Goal slot: {activeChildGoal ? 1 : 0}/1</span>
              </div>
              <p className="panel-muted savings-quest-intro">Stack fictional credits toward your next reward.</p>
              {!activeChildGoal && !pendingChildGoalRequest ? (
                <p className="panel-muted">No active quest yet. Pick a reward and start your credit goal.</p>
              ) : null}
              {pendingChildGoalRequest ? (
                <p className="panel-muted">Your quest request is waiting for parent approval.</p>
              ) : (
                <>
                  {activeChildGoal ? (
                    <>
                      <p className="panel-muted savings-quest-goal-name">🎯 {activeChildGoal.name}</p>
                      <div className="limit-chip-row">
                        <span className="limit-chip">
                          {displaySavingsQuestStatus(activeChildGoal.status)}
                        </span>
                        <span className="limit-chip">
                          {Math.max(0, Number(activeChildGoal.target) - Number(activeChildGoal.saved || 0)) === 0
                            ? 'Goal reached! ✨'
                            : `${Math.max(0, Number(activeChildGoal.target) - Number(activeChildGoal.saved || 0))} credits to go`}
                        </span>
                      </div>
                      <p className="panel-muted">
                        {activeChildGoal.saved}/{activeChildGoal.target} credits ({childGoalProgress}% complete)
                      </p>
                      {childGoalWaitingApproval ? (
                        <p className="panel-muted">Amazing work. Quest complete and waiting for a parent high-five.</p>
                      ) : null}
                      {childGoalCompleted ? (
                        <p className="panel-muted">Huge win. You completed this quest and can start a new dream anytime.</p>
                      ) : null}
                      <ProgressTrack value={childGoalProgress} light label="Savings quest progress" />
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
                  Start A Savings Quest
                </button>
              ) : null}
            </section>

            <section className="panel">
              <div className="panel-title-row">
                <p className="panel-label">Quick Jobs</p>
                <span className="limit-chip panel-title-chip">Pool jobs: {blockingPoolJobs.length}/{maxActivePoolClaimsPerChild}</span>
              </div>
              <div className="limit-chip-row">
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
                          <span className="mission-reward">{formatJobReward(job)}</span>
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
                <span className="limit-chip">Fulfilled: {fulfilledRewardCount}</span>
                <span className="limit-chip">Denied: {deniedRewardCount}</span>
              </div>
              {rewardSnapshotItems.length === 0 ? (
                <p className="panel-muted">No reward activity yet.</p>
              ) : (
                <ul className="kid-job-list" style={{ marginTop: '0.75rem' }}>
                  {rewardSnapshotItems.slice(0, 5).map((item) => (
                    <li key={`reward-snapshot:${item.id}`} className="kid-job-item">
                      <div className="kid-job-main">
                        <span className="mission-main">{item.rewardTitle}</span>
                        <span className="job-status-label">
                          {item.status === 'approved' && item.requestKind === 'proposal'
                            ? 'Approved idea, ready to claim'
                            : null}
                          {item.status === 'approved' && item.requestKind === 'purchase'
                            ? 'Approved, waiting to be fulfilled'
                            : null}
                          {item.status === 'fulfilled' ? 'Fulfilled' : null}
                          {item.status === 'pending' ? 'Pending review' : null}
                          {item.status === 'countered' ? 'Countered' : null}
                          {item.status === 'denied' ? 'Denied' : null}
                        </span>
                      </div>
                      <div className="kid-job-side">
                        <span className={`kid-job-state kid-job-state-${getRequestTone(item.status)}`}>
                          {displayRequestStatus(item.status)}
                        </span>
                        <span className="mission-reward">{item.cost}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="claim-button panel-action-button"
                onClick={() => setActiveTab('rewards')}
              >
                Go To Rewards
              </button>
            </section>

            {achievementsEnabled || familyRecognitionEnabled ? (
              <section className="panel">
                <p className="panel-label">Achievements + Recognition</p>
                <p className="panel-muted">
                  You have earned {allEarnedBadges.length} badge{allEarnedBadges.length === 1 ? '' : 's'} so far.
                </p>
                <div className="limit-chip-row" style={{ marginTop: '0.35rem' }}>
                  {achievementsEnabled ? (
                    <span className="limit-chip">🏅 Achievements: {achievementBadgeCount}</span>
                  ) : null}
                  {familyRecognitionEnabled ? (
                    <span className="limit-chip">🌟 Recognition: {recognitionBadgeCount}</span>
                  ) : null}
                  <span className="limit-chip">Active days: {dashboard.streakDays}</span>
                </div>
                {allEarnedBadges.length === 0 ? (
                  <p className="panel-muted" style={{ marginTop: '0.55rem' }}>
                    No badges yet. Helpful days and finished goals will build your badge shelf over time.
                  </p>
                ) : (
                  <ul className="kid-job-list" style={{ marginTop: '0.7rem' }}>
                    {allEarnedBadges.map((badge) => (
                      <li key={`earned:${badge.id}`} className="kid-job-item">
                        <div className="kid-job-main">
                          <span className="mission-main">{badge.icon} {badge.label}</span>
                          <span className="job-status-label">
                            {badge.category === 'achievement' ? 'Achievement unlocked' : 'Recognition earned'}
                          </span>
                        </div>
                        <div className="kid-job-side">
                          <span className="kid-job-state kid-job-state-active">
                            {badge.category === 'achievement' ? 'Achievement' : 'Recognition'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </>
        ) : null}

        {!loading && !error && (!requiresSessionCode || sessionUnlocked) && activeTab === 'rules' ? (
          <section className="panel">
            <p className="panel-label">Family News</p>
            <p className="panel-muted">Latest family updates that guide your jobs, savings, and rewards.</p>

            <div className="money-block">
              <p className="panel-label money-section-title">Family Announcement</p>
              {familyAnnouncementText ? (
                <FormattedRichText className="panel-muted" value={familyAnnouncementText} />
              ) : (
                <p className="panel-muted">No new announcement right now.</p>
              )}
            </div>

            {familyRulesText ? (
              <div className="money-block">
                <p className="panel-label money-section-title">Family Note</p>
                <FormattedRichText className="panel-muted" value={familyRulesText} />
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
            <div className="panel-title-row">
              <p className="panel-label">Jobs</p>
              <span className="limit-chip panel-title-chip">Pool claimed: {blockingPoolJobs.length}/{maxActivePoolClaimsPerChild}</span>
            </div>
            <p className="panel-muted">See Family News for current policy details.</p>
            <div className="limit-chip-row">
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
                              <span className="mission-reward">{formatJobReward(job)}</span>
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
                              <span className="mission-reward">{formatJobReward(job)}</span>
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
                              <span className="mission-reward">{formatJobReward(job)}</span>
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
                        <span className="mission-reward">{formatJobReward(job)}</span>
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
            <p className="panel-label">Credits</p>
            <p className="panel-muted">See the fictional credits you earned, saved, and spent.</p>

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
                <span className="limit-chip">Credit Wallet: {dashboard.balance.credits} credits</span>
              </div>
              {activeChildGoal ? (
                <>
                  <p className="panel-muted">{activeChildGoal.name}</p>
                  <p className="panel-muted">
                    {activeChildGoal.saved}/{activeChildGoal.target} credits ({childGoalProgress}%)
                  </p>
                  <ProgressTrack value={childGoalProgress} light label="Savings snapshot progress" />
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
                <p className="panel-muted">No credit history yet.</p>
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
            <p className="panel-muted">See Family News for current approval rules.</p>

            <div className="money-block">
              <div className="money-section-card">
                <div className="money-section-header">
                  <div className="money-section-title-row">
                    <p className="panel-label money-section-title">My Savings Goal</p>
                    <span className="limit-chip panel-title-chip">Goal slots: {activeChildGoal ? 1 : 0}/1</span>
                  </div>
                  <p className="money-section-description">
                    Save credits for one reward at a time and track your progress here.
                  </p>
                </div>
                <div className="limit-chip-row">
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
                    <div className="money-section-divider"></div>
                    <p className="money-section-description">
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
            </div>

            {childGoals.length === 0 ? (
              <p className="panel-muted">No savings goals for this child yet.</p>
            ) : (
              <ul className="kid-job-list">
                {childGoals.map((goal) => {
                  const pct = Number(goal.target) > 0
                    ? Math.round((goal.saved / goal.target) * 100)
                    : 0
                  const statusLabel = displayGoalStatus(goal.status)

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
                        <ProgressTrack value={pct} light label={`${goal.name || 'Savings goal'} progress`} />
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

            <div className="money-block">
              <div className="money-section-card money-section-card--shared">
                <div className="money-section-header">
                  <p className="panel-label money-section-title">Family Savings Goal</p>
                  <p className="money-section-description">
                    Everyone can contribute here to move the family toward one shared target.
                  </p>
                </div>
                <div className="limit-chip-row">
                  <span className="limit-chip">
                    Goal: {familySavingsGoal ? displayGoalStatus(familySavingsGoal.status) : 'Not set'}
                  </span>
                  <span className="limit-chip">Shared with all kids</span>
                </div>
                {familySavingsGoal ? (
                  <>
                    <div>
                      <p className="panel-muted" style={{ marginTop: 0 }}>
                        {familySavingsGoal.rewardTitle || familySavingsGoal.name}
                      </p>
                      <p className="panel-muted">
                        {familySavingsGoal.saved}/{familySavingsGoal.target} credits ({familySavingsGoalProgress}%)
                      </p>
                    </div>
                    <ProgressTrack value={familySavingsGoalProgress} light label="Family savings goal progress" />
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
                                  Chipped in {contributor.amount} credits
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className="panel-muted">No one has chipped in yet.</p>
                      )}
                    </div>
                    {familySavingsGoal.status === 'active' ? (
                      <form className="auth-form" onSubmit={handleContributeToFamilySavingsGoal}>
                        <div className="money-section-divider"></div>
                        <p className="money-section-description">Help the whole family reach this goal.</p>
                        <div className="money-quick-row" role="group" aria-label="Quick family contribution amounts">
                          {[10, 25, 50].map((value) => (
                            <button
                              key={value}
                              type="button"
                              className="limit-chip money-quick-chip"
                              onClick={() => setFamilyContributionAmount(String(value))}
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
                          value={familyContributionAmount}
                          onChange={(event) => setFamilyContributionAmount(event.target.value)}
                          required
                        />
                        <button
                          type="submit"
                          className="claim-button"
                          disabled={savingFamilyContribution || (Number(dashboard.balance.credits) || 0) <= 0}
                        >
                          {savingFamilyContribution ? 'Saving...' : 'Contribute to Family Goal'}
                        </button>
                      </form>
                    ) : null}
                  </>
                ) : (
                  <p className="panel-muted">No shared family savings goal is set yet.</p>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !error && (!requiresSessionCode || sessionUnlocked) && activeTab === 'rewards' ? (
          <section className="panel">
            <p className="panel-label">Rewards</p>
            <div className="limit-chip-row">
              <span className="limit-chip">Pending: {pendingRewardCount}</span>
              <span className="limit-chip">Approved: {approvedRewardCount}</span>
              <span className="limit-chip">Fulfilled: {fulfilledRewardCount}</span>
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
            {visibleRewards.length === 0 ? (
              <p className="panel-muted">No rewards for this child yet.</p>
            ) : (
              <ul className="kid-job-list">
                {visibleRewards.map((reward) => {
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
                {sortedPastRewardHistory.map((item) => (
                  
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
                      {item.status === 'redirected_to_pool' ? (
                        <p className="panel-muted">
                          Parent moved this request into the family reward pool.
                        </p>
                      ) : null}
                      {item.status === 'approved' && item.requestKind === 'proposal' && isRewardRequestActionLocked(item) ? (
                        <p className="panel-muted">
                          You already started saving for this request.
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
                      {item.status === 'approved' && item.requestKind === 'proposal' && !isRewardRequestActionLocked(item) ? (
                        <div className="button-row" style={{ marginTop: '0.35rem' }}>
                          {Number(item.cost || 0) > (Number(dashboard.balance?.credits) || 0) ? (
                            <p className="panel-muted">
                              Need {Math.max(0, Number(item.cost || 0) - (Number(dashboard.balance?.credits) || 0))} more credits to claim.
                            </p>
                          ) : null}
                          <button
                            type="button"
                            className="claim-button"
                            disabled={
                              requestingRewardId.length > 0
                              || Number(item.cost || 0) > (Number(dashboard.balance?.credits) || 0)
                            }
                            onClick={() => handleClaimApprovedReward(item)}
                          >
                            {requestingRewardId === `approved:${item.id}` ? 'Claiming...' : 'Claim Now'}
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            disabled={savingForRewardId.length > 0 || !!(activeChildGoal || pendingChildGoalRequest || childGoalCountered)}
                            onClick={() => handleCreateSavingsGoal({
                              id: item.rewardId || `proposal:${item.id}`,
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
