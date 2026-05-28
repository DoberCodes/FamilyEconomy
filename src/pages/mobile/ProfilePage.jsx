import { useEffect, useState } from 'react'

import BottomTabBar from '../../components/mobile/BottomTabBar'
import { useAuth } from '../../context/AuthContext'
import {
  createGoal,
  createHousehold,
  createJob,
  createReward,
  clearChildSessionCode,
  getFamilyDashboard,
  getFamilyJobCheckRequests,
  getFamilyStoreData,
  getHouseholdOnboardingData,
  reviewJobCheckRequest,
  reviewRewardRequest,
  setChildAllowSessionCode,
  setChildSessionSecurity,
  updateGoal,
  updateJob,
  updateReward,
} from '../../services/familyEconomyService'

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
    lockParentControls,
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
    dynamicPricingEnabled: false,
    dynamicPricingWindowPeriod: 'week',
    dynamicPricingDemandWeight: 10,
    dynamicPricingScarcityWeight: 20,
  })
  const [childSessionSecurityEnabled, setChildSessionSecurityEnabled] = useState(false)
  const [activeDialog, setActiveDialog] = useState('')
  const [dialogBusy, setDialogBusy] = useState(false)
  const [jobs, setJobs] = useState([])
  const [jobCheckRequests, setJobCheckRequests] = useState([])
  const [rewards, setRewards] = useState([])
  const [rewardRequests, setRewardRequests] = useState([])
  const [goals, setGoals] = useState([])
  const [jobTitle, setJobTitle] = useState('')
  const [jobPoints, setJobPoints] = useState('50')
  const [jobLimitCount, setJobLimitCount] = useState('')
  const [jobLimitPeriod, setJobLimitPeriod] = useState('week')
  const [jobFamilyLimitCount, setJobFamilyLimitCount] = useState('')
  const [jobFamilyLimitPeriod, setJobFamilyLimitPeriod] = useState('week')
  const [jobRepeatMode, setJobRepeatMode] = useState('none')
  const [rewardTitle, setRewardTitle] = useState('')
  const [rewardCost, setRewardCost] = useState('150')
  const [rewardRepeatMode, setRewardRepeatMode] = useState('recur')
  const [rewardLimitCount, setRewardLimitCount] = useState('')
  const [rewardLimitPeriod, setRewardLimitPeriod] = useState('day')
  const [rewardFamilyLimitCount, setRewardFamilyLimitCount] = useState('')
  const [rewardFamilyLimitPeriod, setRewardFamilyLimitPeriod] = useState('day')
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('500')
  const [jobScopeChildId, setJobScopeChildId] = useState('')
  const [rewardScopeChildId, setRewardScopeChildId] = useState('')
  const [goalScopeChildId, setGoalScopeChildId] = useState('')
  const [editingJobId, setEditingJobId] = useState('')
  const [editingRewardId, setEditingRewardId] = useState('')
  const [editingGoalId, setEditingGoalId] = useState('')
  const [reviewingRequestId, setReviewingRequestId] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [familyRules, setFamilyRules] = useState('')
  const [dynamicPricingEnabled, setDynamicPricingEnabled] = useState(false)
  const [dynamicPricingWindowPeriod, setDynamicPricingWindowPeriod] = useState('week')
  const [dynamicPricingDemandWeight, setDynamicPricingDemandWeight] = useState('10')
  const [dynamicPricingScarcityWeight, setDynamicPricingScarcityWeight] = useState('20')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isParent = isAuthenticated && userRole === 'parent'

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
            dynamicPricingEnabled: Boolean(result.data.family?.dynamicPricingEnabled),
            dynamicPricingWindowPeriod: result.data.family?.dynamicPricingWindowPeriod || 'week',
            dynamicPricingDemandWeight: Number(result.data.family?.dynamicPricingDemandWeight) || 10,
            dynamicPricingScarcityWeight: Number(result.data.family?.dynamicPricingScarcityWeight) || 20,
          })
          setChildSessionSecurityEnabled(
            Boolean(result.data.family?.childSessionSecurityEnabled),
          )
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

    async function refreshPendingCounts() {
      if (!isParent || !parentControlsUnlocked || !familyId) {
        return
      }

      try {
        const [storeResult, checkResult] = await Promise.all([
          getFamilyStoreData({ familyId, userId, userRole, selectedChildId: null }),
          getFamilyJobCheckRequests({ familyId, userId, userRole, selectedChildId: null }),
        ])

        if (cancelled) {
          return
        }

        setRewardRequests(storeResult.data.requests || [])
        setJobCheckRequests(checkResult.data.requests || [])
      } catch {
        if (!cancelled) {
          setRewardRequests([])
          setJobCheckRequests([])
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

  async function handleToggleChildAllowSessionCode(childId, allowed) {
    setSaving(true)
    setError('')

    try {
      await setChildAllowSessionCode(childId, allowed, { familyId, userId, userRole })

      const result = await getHouseholdOnboardingData({ familyId, userId, userRole })
      setChildProfiles(result.data.childProfiles || [])
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

      const result = await getHouseholdOnboardingData({ familyId, userId, userRole })
      setChildProfiles(result.data.childProfiles || [])
    } catch (caughtError) {
      setError(caughtError.message || 'Could not clear child PIN.')
    } finally {
      setSaving(false)
    }
  }

  async function loadDialogData() {
    const [dashboardResult, storeResult, checkResult] = await Promise.all([
      getFamilyDashboard({ familyId, userId, userRole, selectedChildId: null }),
      getFamilyStoreData({ familyId, userId, userRole, selectedChildId: null }),
      getFamilyJobCheckRequests({ familyId, userId, userRole, selectedChildId: null }),
    ])

    setJobs(dashboardResult.data.jobs)
    setGoals(dashboardResult.data.goals)
    setRewards(storeResult.data.rewards)
    setRewardRequests(storeResult.data.requests)
    setJobCheckRequests(checkResult.data.requests)
  }

  async function openDialog(dialog) {
    setActiveDialog(dialog)
    setError('')

    if (
      dialog === 'jobs'
      || dialog === 'rewards'
      || dialog === 'savings'
      || dialog === 'requests'
    ) {
      if (dialog === 'jobs') {
        setJobScopeChildId('')
      }
      if (dialog === 'rewards') {
        setRewardScopeChildId('')
      }
      if (dialog === 'savings') {
        setGoalScopeChildId('')
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
      setDynamicPricingEnabled(Boolean(familySummary.dynamicPricingEnabled))
      setDynamicPricingWindowPeriod(familySummary.dynamicPricingWindowPeriod || 'week')
      setDynamicPricingDemandWeight(String(familySummary.dynamicPricingDemandWeight || 10))
      setDynamicPricingScarcityWeight(String(familySummary.dynamicPricingScarcityWeight || 20))
    }
  }

  function closeDialog() {
    setActiveDialog('')
  }

  async function handleCreateJob(event) {
    event.preventDefault()
    setDialogBusy(true)
    setError('')

    try {
      const payload = {
        title: jobTitle,
        points: Number(jobPoints) || 0,
        childId: jobScopeChildId || null,
        claimLimitCount: Number(jobLimitCount) || 0,
        claimLimitPeriod: jobLimitPeriod,
        familyClaimLimitCount: Number(jobFamilyLimitCount) || 0,
        familyClaimLimitPeriod: jobFamilyLimitPeriod,
        autoRecreate: jobRepeatMode === 'recur',
      }

      if (editingJobId) {
        await updateJob(editingJobId, payload, { familyId, userId, userRole })
      } else {
        await createJob(payload, { familyId, userId, userRole })
      }

      setEditingJobId('')
      setJobTitle('')
      setJobPoints('50')
      setJobLimitCount('')
      setJobLimitPeriod('week')
      setJobFamilyLimitCount('')
      setJobFamilyLimitPeriod('week')
      setJobRepeatMode('none')
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
      const payload = {
        title: rewardTitle,
        cost: Number(rewardCost) || 0,
        childId: rewardScopeChildId || null,
        repeatMode: rewardRepeatMode,
        claimLimitCount: Number(rewardLimitCount) || 0,
        claimLimitPeriod: rewardLimitPeriod,
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
      setRewardRepeatMode('recur')
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

  async function handleCreateGoal(event) {
    event.preventDefault()
    setDialogBusy(true)
    setError('')

    try {
      const payload = {
        name: goalName,
        target: Number(goalTarget) || 0,
        childId: goalScopeChildId || null,
      }

      if (editingGoalId) {
        await updateGoal(editingGoalId, payload, { familyId, userId, userRole })
      } else {
        await createGoal(payload, { familyId, userId, userRole })
      }

      setEditingGoalId('')
      setGoalName('')
      setGoalTarget('500')
      await loadDialogData()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not create savings goal.')
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
          childSessionSecurityEnabled,
          dynamicPricingEnabled,
          dynamicPricingWindowPeriod,
          dynamicPricingDemandWeight: Number(dynamicPricingDemandWeight) || 0,
          dynamicPricingScarcityWeight: Number(dynamicPricingScarcityWeight) || 0,
        },
        { familyId, userId, userRole },
      )
      setFamilySummary({
        profileName: householdName,
        familyRules,
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

  async function handleReviewRewardRequest(requestId, decision) {
    setDialogBusy(true)
    setReviewingRequestId(`reward:${requestId}`)
    setError('')

    try {
      await reviewRewardRequest(requestId, decision, { familyId, userId, userRole })
      await loadDialogData()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not review reward request.')
    } finally {
      setReviewingRequestId('')
      setDialogBusy(false)
    }
  }

  function startEditJob(job) {
    setEditingJobId(job.id)
    setJobTitle(job.title || '')
    setJobPoints(String(job.points || 0))
    setJobScopeChildId(job.childId || '')
    setJobLimitCount(job.claimLimitCount > 0 ? String(job.claimLimitCount) : '')
    setJobLimitPeriod(job.claimLimitPeriod || 'week')
    setJobFamilyLimitCount(job.familyClaimLimitCount > 0 ? String(job.familyClaimLimitCount) : '')
    setJobFamilyLimitPeriod(job.familyClaimLimitPeriod || 'week')
    setJobRepeatMode(job.autoRecreate ? 'recur' : 'none')
  }

  function startEditReward(reward) {
    setEditingRewardId(reward.id)
    setRewardTitle(reward.title || '')
    setRewardCost(String(reward.cost || 0))
    setRewardScopeChildId(reward.childId || '')
    setRewardRepeatMode(reward.repeatMode === 'once' ? 'once' : 'recur')
    setRewardLimitCount(reward.claimLimitCount > 0 ? String(reward.claimLimitCount) : '')
    setRewardLimitPeriod(reward.claimLimitPeriod || 'day')
    setRewardFamilyLimitCount(
      reward.familyClaimLimitCount > 0 ? String(reward.familyClaimLimitCount) : '',
    )
    setRewardFamilyLimitPeriod(reward.familyClaimLimitPeriod || 'day')
  }

  function startEditGoal(goal) {
    setEditingGoalId(goal.id)
    setGoalName(goal.name || '')
    setGoalTarget(String(goal.target || 0))
    setGoalScopeChildId(goal.childId || '')
  }

  function cancelEditJob() {
    setEditingJobId('')
    setJobTitle('')
    setJobPoints('50')
    setJobScopeChildId('')
    setJobLimitCount('')
    setJobLimitPeriod('week')
    setJobFamilyLimitCount('')
    setJobFamilyLimitPeriod('week')
    setJobRepeatMode('none')
  }

  function cancelEditReward() {
    setEditingRewardId('')
    setRewardTitle('')
    setRewardCost('150')
    setRewardScopeChildId('')
    setRewardRepeatMode('recur')
    setRewardLimitCount('')
    setRewardLimitPeriod('day')
    setRewardFamilyLimitCount('')
    setRewardFamilyLimitPeriod('day')
  }

  function cancelEditGoal() {
    setEditingGoalId('')
    setGoalName('')
    setGoalTarget('500')
    setGoalScopeChildId('')
  }

  const pendingJobCheckRequests = jobCheckRequests.filter((request) => request.status === 'pending')
  const pendingRewardRequests = rewardRequests.filter((request) => request.status === 'pending')
  const pendingRequestsCount = pendingJobCheckRequests.length + pendingRewardRequests.length

  return (
    <>
      <header className="status-row">
        <span>9:41</span>
        <span className="page-title">Parent</span>
      </header>
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
          <section className="panel">
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

            <button type="button" className="text-button" onClick={logout}>
              Sign out Parent
            </button>
          </section>
        ) : null}

        {isParent && parentControlsUnlocked ? (
          <>
            <section className="panel">
              <p className="panel-label">Parent Command Center</p>
              <p className="panel-muted">{displayName || 'Parent account'}</p>
              <p className="panel-muted">{userEmail}</p>
              <p className="panel-muted">Family: {familyId}</p>
              <p className="panel-muted">Children configured: {childProfiles.length}</p>
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
                  Savings manager
                </button>
              </div>
            </section>

            <section className="panel">
              <p className="panel-label">Child Session Security</p>
              <p className="panel-muted">
                Status: {childSessionSecurityEnabled ? 'Enabled' : 'Disabled'}
              </p>
              <p className="panel-muted">
                When enabled, children with a PIN will be locked before entering their session.
              </p>
              <button
                type="button"
                className="claim-button"
                onClick={handleToggleChildSessionSecurity}
                disabled={saving}
              >
                {childSessionSecurityEnabled ? 'Disable Child Session Lock' : 'Enable Child Session Lock'}
              </button>

              {childProfiles.length > 0 ? (
                <ul className="profile-list">
                  {childProfiles.map((child) => (
                    <li key={child.id} className="profile-list-item">
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
              <div className="button-row">
                <button type="button" className="claim-button" onClick={lockParentControls}>
                  Lock Command Center
                </button>
                <button type="button" className="text-button" onClick={logout}>
                  Sign out Parent
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
                  {activeDialog === 'setup' ? 'Household Setup' : null}
                  {activeDialog === 'requests' ? 'Pending Requests' : null}
                  {activeDialog === 'jobs' ? 'Jobs Manager' : null}
                  {activeDialog === 'rewards' ? 'Rewards Manager' : null}
                  {activeDialog === 'savings' ? 'Savings Manager' : null}
                </p>
                <button type="button" className="text-button" onClick={closeDialog}>
                  Close
                </button>
              </div>

              {activeDialog === 'overview' ? (
                <div className="dialog-content">
                  <p className="panel-muted">Family: {familySummary.profileName || 'Not set'}</p>
                  <p className="panel-muted">Rules: {familySummary.familyRules || 'No rules yet'}</p>
                  <p className="panel-muted">
                    Dynamic pricing: {familySummary.dynamicPricingEnabled ? 'On' : 'Off'}
                  </p>
                  <p className="panel-muted">Children: {childProfiles.length}</p>
                </div>
              ) : null}

              {activeDialog === 'setup' ? (
                <form className="auth-form dialog-content" onSubmit={handleSaveHousehold}>
                  <input
                    className="job-input"
                    placeholder="Family name"
                    value={householdName}
                    onChange={(event) => setHouseholdName(event.target.value)}
                    required
                  />
                  <textarea
                    className="job-input form-textarea"
                    placeholder="Family rules"
                    value={familyRules}
                    onChange={(event) => setFamilyRules(event.target.value)}
                    rows="4"
                  />
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
                    <>
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
                      <label className="form-field">
                        <span className="form-label">Demand impact % per claim</span>
                        <input
                          className="job-input"
                          type="number"
                          min="0"
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
                          value={dynamicPricingScarcityWeight}
                          onChange={(event) => setDynamicPricingScarcityWeight(event.target.value)}
                        />
                      </label>
                    </>
                  ) : null}
                  <button type="submit" className="claim-button" disabled={dialogBusy}>
                    Save household settings
                  </button>
                </form>
              ) : null}

              {activeDialog === 'requests' ? (
                <div className="dialog-content">
                  <p className="panel-label">Job Check Requests</p>
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

                  <p className="panel-label">Reward Requests</p>
                  {pendingRewardRequests.length === 0 ? (
                    <p className="panel-muted">No pending reward requests.</p>
                  ) : (
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
                            <button
                              type="button"
                              className="claim-button"
                              disabled={dialogBusy || reviewingRequestId === `reward:${request.id}`}
                              onClick={() => handleReviewRewardRequest(request.id, 'approved')}
                            >
                              {reviewingRequestId === `reward:${request.id}` ? 'Working...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className="text-button"
                              disabled={dialogBusy || reviewingRequestId === `reward:${request.id}`}
                              onClick={() => handleReviewRewardRequest(request.id, 'denied')}
                            >
                              Deny
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ) : null}

              {activeDialog === 'jobs' ? (
                <div className="dialog-content">
                  <p className="panel-label">Pending Check Requests</p>
                  <ul className="mission-list">
                    {jobCheckRequests
                      .filter((request) =>
                        request.status === 'pending'
                          && (jobScopeChildId ? request.childId === jobScopeChildId : true),
                      )
                      .map((request) => {
                        const requestChild = childProfiles.find(
                          (profile) => profile.id === request.childId,
                        )
                        const childName = requestChild
                          ? `${requestChild.avatar} ${requestChild.displayName}`
                          : 'Child'

                        return (
                          <li key={request.id}>
                            <span className="mission-main">
                              {request.jobTitle} ({childName})
                            </span>
                            <span className="mission-reward">+ {request.points}</span>
                            <div className="button-row">
                              <button
                                type="button"
                                className="claim-button"
                                disabled={dialogBusy || reviewingRequestId === request.id}
                                onClick={() =>
                                  handleReviewJobCheckRequest(request.id, 'approved')
                                }
                              >
                                {reviewingRequestId === request.id ? 'Working...' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                className="text-button"
                                disabled={dialogBusy || reviewingRequestId === request.id}
                                onClick={() => handleReviewJobCheckRequest(request.id, 'denied')}
                              >
                                Deny
                              </button>
                            </div>
                          </li>
                        )
                      })}
                  </ul>

                  <form className="auth-form" onSubmit={handleCreateJob}>
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
                    <input
                      className="job-input"
                      type="number"
                      min="1"
                      placeholder="Points"
                      value={jobPoints}
                      onChange={(event) => setJobPoints(event.target.value)}
                      required
                    />
                    <label className="form-field">
                      <span className="form-label">Repeat</span>
                      <select
                        className="job-input"
                        value={jobRepeatMode}
                        onChange={(event) => setJobRepeatMode(event.target.value)}
                      >
                        <option value="none">One-time only</option>
                        <option value="recur">Recurring (auto add next)</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span className="form-label">Limit claims (optional)</span>
                      <div className="button-row">
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            setJobRepeatMode('recur')
                            setJobLimitCount('1')
                            setJobLimitPeriod('day')
                          }}
                        >
                          Once per day
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            setJobRepeatMode('recur')
                            setJobLimitCount('1')
                            setJobLimitPeriod('week')
                          }}
                        >
                          Once per week
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            setJobRepeatMode('recur')
                            setJobLimitCount('2')
                            setJobLimitPeriod('week')
                          }}
                        >
                          Twice per week
                        </button>
                      </div>
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
                      <span className="form-label">Family total limit (optional)</span>
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
                  <ul className="mission-list">
                    {jobs
                      .filter((job) =>
                        jobScopeChildId ? job.childId === jobScopeChildId : !job.childId,
                      )
                      .map((job) => (
                      <li key={job.id || job.title}>
                        <span className="mission-main">{job.title}</span>
                        <span className="mission-reward">+ {job.points}</span>
                        <span className="job-status-label">
                          {job.autoRecreate ? 'Recurring' : 'One-time'}
                        </span>
                        <span className="job-status-label">
                          {job.claimLimitCount > 0 && job.claimLimitPeriod
                            ? `Limit ${job.claimLimitCount}/${job.claimLimitPeriod}`
                            : 'No limit'}
                        </span>
                        <span className="job-status-label">
                          {job.familyClaimLimitCount > 0 && job.familyClaimLimitPeriod
                            ? `Family ${job.familyClaimLimitCount}/${job.familyClaimLimitPeriod}`
                            : 'No family cap'}
                        </span>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => startEditJob(job)}
                        >
                          Edit
                        </button>
                      </li>
                      ))}
                  </ul>
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
                      <span className="form-label">Repeat</span>
                      <select
                        className="job-input"
                        value={rewardRepeatMode}
                        onChange={(event) => setRewardRepeatMode(event.target.value)}
                      >
                        <option value="recur">Recurring (can request again)</option>
                        <option value="once">One-time only</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span className="form-label">Limit claims (optional)</span>
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
                    <label className="form-field">
                      <span className="form-label">Family total limit (optional)</span>
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
                            ? `Limit ${reward.claimLimitCount}/${reward.claimLimitPeriod}`
                            : 'No limit'}
                        </span>
                        <span className="job-status-label">
                          {reward.familyClaimLimitCount > 0 && reward.familyClaimLimitPeriod
                            ? `Family ${reward.familyClaimLimitCount}/${reward.familyClaimLimitPeriod}`
                            : 'No family cap'}
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
                  <form className="auth-form" onSubmit={handleCreateGoal}>
                    <label className="form-field">
                      <span className="form-label">Apply to</span>
                      <select
                        className="job-input"
                        value={goalScopeChildId}
                        onChange={(event) => setGoalScopeChildId(event.target.value)}
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
                      placeholder="Goal name"
                      value={goalName}
                      onChange={(event) => setGoalName(event.target.value)}
                      required
                    />
                    <input
                      className="job-input"
                      type="number"
                      min="1"
                      placeholder="Target"
                      value={goalTarget}
                      onChange={(event) => setGoalTarget(event.target.value)}
                      required
                    />
                    <div className="button-row">
                      <button type="submit" className="claim-button" disabled={dialogBusy}>
                        {editingGoalId ? 'Save goal' : 'Add goal'}
                      </button>
                      {editingGoalId ? (
                        <button type="button" className="text-button" onClick={cancelEditGoal}>
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </form>
                  <ul className="goal-list-simple">
                    {goals
                      .filter((goal) =>
                        goalScopeChildId ? goal.childId === goalScopeChildId : !goal.childId,
                      )
                      .map((goal) => (
                      <li key={goal.id || `${goal.childId || 'family'}:${goal.name}`}>
                        <p>{goal.name}</p>
                        <small>
                          {goal.saved}/{goal.target}
                        </small>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => startEditGoal(goal)}
                        >
                          Edit
                        </button>
                      </li>
                      ))}
                  </ul>
                </div>
              ) : null}

              {dialogBusy ? <p className="panel-muted">Working...</p> : null}
            </div>
          </section>
        ) : null}
      </main>
      <BottomTabBar />
    </>
  )
}
