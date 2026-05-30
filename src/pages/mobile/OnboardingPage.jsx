import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import {
  createChildProfile,
  createHousehold,
  createJob,
  createReward,
  getHouseholdOnboardingData,
} from '../../services/familyEconomyService'

const childAvatarOptions = [
  { value: '🧒', label: 'Explorer' },
  { value: '🧑', label: 'Adventurer' },
  { value: '🌟', label: 'Superstar' },
  { value: '🚀', label: 'Rocket' },
  { value: '🦄', label: 'Unicorn' },
]

const wizardSteps = [
  { key: 'household', label: 'Household' },
  { key: 'child', label: 'Child' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'rewards', label: 'Rewards' },
]

function getRecommendedStepIndex({ familyExists, childProfiles, jobs, rewards }) {
  if (!familyExists) {
    return 0
  }

  if (childProfiles.length === 0) {
    return 1
  }

  if (jobs.length === 0) {
    return 2
  }

  if (rewards.length === 0) {
    return 3
  }

  return 4
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { familyId, userId, userRole, isAuthenticated, login, userEmail, logout } =
    useAuth()

  const [loading, setLoading] = useState(true)
  const [savingHousehold, setSavingHousehold] = useState(false)
  const [addingChild, setAddingChild] = useState(false)
  const [addingJob, setAddingJob] = useState(false)
  const [addingReward, setAddingReward] = useState(false)
  const [familyExists, setFamilyExists] = useState(false)
  const [childProfiles, setChildProfiles] = useState([])
  const [jobs, setJobs] = useState([])
  const [rewards, setRewards] = useState([])
  const [householdName, setHouseholdName] = useState('')
  const [familyRules, setFamilyRules] = useState('')
  const [childName, setChildName] = useState('')
  const [childAvatar, setChildAvatar] = useState('🧒')
  const [weeklyGoalCredits, setWeeklyGoalCredits] = useState('300')
  const [jobTitle, setJobTitle] = useState('')
  const [jobPoints, setJobPoints] = useState('50')
  const [rewardTitle, setRewardTitle] = useState('')
  const [rewardCost, setRewardCost] = useState('150')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [currentStep, setCurrentStep] = useState(0)

  const isParent = userRole === 'parent'
  const onboardingComplete =
    familyExists && childProfiles.length > 0 && jobs.length > 0 && rewards.length > 0
  const recommendedStep = getRecommendedStepIndex({
    familyExists,
    childProfiles,
    jobs,
    rewards,
  })
  const maxReachableStep = onboardingComplete ? 4 : recommendedStep
  const activeStep = currentStep >= 4 ? 4 : Math.min(currentStep, maxReachableStep)

  useEffect(() => {
    let active = true

    async function run() {
      try {
        const result = await getHouseholdOnboardingData({
          familyId,
          userId: userId || 'kid-device',
          userRole: userRole || 'kid',
        })

        if (!active) {
          return
        }

        setFamilyExists(result.data.familyExists)
        setChildProfiles(result.data.childProfiles)
        setJobs(result.data.jobs)
        setRewards(result.data.rewards)

        if (result.data.family?.profileName) {
          setHouseholdName(result.data.family.profileName)
        }

        if (typeof result.data.family?.familyRules === 'string') {
          setFamilyRules(result.data.family.familyRules)
        }

        setCurrentStep(getRecommendedStepIndex(result.data))
      } catch (caughtError) {
        if (!active) {
          return
        }
        setError(caughtError.message || 'Could not load onboarding data.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      active = false
    }
  }, [familyId, userId, userRole])

  async function loadOnboarding() {
    setLoading(true)
    setError('')

    try {
      const result = await getHouseholdOnboardingData({
        familyId,
        userId: userId || 'kid-device',
        userRole: userRole || 'kid',
      })

      setFamilyExists(result.data.familyExists)
      setChildProfiles(result.data.childProfiles)
      setJobs(result.data.jobs)
      setRewards(result.data.rewards)

      if (result.data.family?.profileName) {
        setHouseholdName(result.data.family.profileName)
      }

      if (typeof result.data.family?.familyRules === 'string') {
        setFamilyRules(result.data.family.familyRules)
      }

      setCurrentStep(getRecommendedStepIndex(result.data))
    } catch (caughtError) {
      setError(caughtError.message || 'Could not load onboarding data.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateHousehold(event) {
    event.preventDefault()
    setSavingHousehold(true)
    setError('')
    setStatus('')

    try {
      await createHousehold(
        { profileName: householdName, familyRules },
        { familyId, userId, userRole },
      )
      setStatus('Household details saved.')
      await loadOnboarding()
      setCurrentStep(1)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not save household details.')
    } finally {
      setSavingHousehold(false)
    }
  }

  async function handleAddChild(event) {
    event.preventDefault()
    setAddingChild(true)
    setError('')
    setStatus('')

    try {
      await createChildProfile(
        {
          displayName: childName,
          avatar: childAvatar,
          weeklyGoalCredits,
        },
        { familyId, userId, userRole },
      )
      setChildName('')
      setWeeklyGoalCredits('300')
      setStatus('Child profile added.')
      await loadOnboarding()
      setCurrentStep(2)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not add child profile.')
    } finally {
      setAddingChild(false)
    }
  }

  async function handleAddJob(event) {
    event.preventDefault()
    setAddingJob(true)
    setError('')
    setStatus('')

    try {
      await createJob(
        { title: jobTitle, points: Number(jobPoints) || 0 },
        { familyId, userId, userRole },
      )
      setJobTitle('')
      setJobPoints('50')
      setStatus('Starter job added.')
      await loadOnboarding()
      setCurrentStep(3)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not add starter job.')
    } finally {
      setAddingJob(false)
    }
  }

  async function handleAddReward(event) {
    event.preventDefault()
    setAddingReward(true)
    setError('')
    setStatus('')

    try {
      await createReward(
        { title: rewardTitle, cost: Number(rewardCost) || 0 },
        { familyId, userId, userRole },
      )
      setRewardTitle('')
      setRewardCost('150')
      setStatus('Starter reward added.')
      await loadOnboarding()
      setCurrentStep(4)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not add starter reward.')
    } finally {
      setAddingReward(false)
    }
  }

  async function handleParentSignIn(event) {
    event.preventDefault()
    setUnlocking(true)
    setError('')
    setStatus('')

    try {
      await login(email, password)
      setEmail('')
      setPassword('')
      setStatus('Parent signed in. Continue with setup below.')
    } catch (caughtError) {
      setError(caughtError.message || 'Parent sign-in failed. Check credentials.')
    } finally {
      setUnlocking(false)
    }
  }

  function renderStepNavigation() {
    if (!isParent) {
      return null
    }

    return (
      <div className="wizard-nav">
        <button
          type="button"
          className="text-button"
          onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
          disabled={activeStep === 0}
        >
          Back
        </button>
        <button
          type="button"
          className="claim-button"
          onClick={() => setCurrentStep((step) => Math.min(step + 1, maxReachableStep))}
          disabled={activeStep >= maxReachableStep}
        >
          {activeStep === 3 && onboardingComplete ? 'Review completion' : 'Next step'}
        </button>
      </div>
    )
  }

  function renderCurrentStep() {
    if (!isParent) {
      return null
    }

    if (onboardingComplete && activeStep === 4) {
      return (
        <section className="panel onboarding-panel">
          <p className="panel-label">Setup complete</p>
          <p className="panel-muted">
            Your family now has the core loop in place. Move into the dashboard to keep building.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="text-button"
              onClick={() => setCurrentStep(3)}
            >
              Review previous steps
            </button>
            <button
              type="button"
              className="claim-button"
              onClick={() => navigate('/mobile/home')}
            >
              Continue to dashboard
            </button>
          </div>
        </section>
      )
    }

    if (activeStep === 0) {
      return (
        <section className="panel onboarding-panel">
          <div className="onboarding-step-header">
            <div>
              <p className="panel-label">Step 1: Household basics</p>
              <p className="panel-muted">Give your family a name and shared expectations.</p>
            </div>
            <span className="job-status-label">{familyExists ? 'Saved' : 'Required'}</span>
          </div>
          <form className="auth-form" onSubmit={handleCreateHousehold}>
            <label className="form-field">
              <span className="form-label">Family name</span>
              <input
                className="job-input"
                placeholder="Ex: The Dober Crew"
                value={householdName}
                onChange={(event) => setHouseholdName(event.target.value)}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-label">Family news, rules, or expectations</span>
              <textarea
                className="job-input form-textarea"
                placeholder="Ex: Finish jobs before screen time. Be kind. Keep your room tidy."
                value={familyRules}
                onChange={(event) => setFamilyRules(event.target.value)}
                rows="4"
              />
              <span className="form-help">
                This gives your family a shared starting playbook.
              </span>
            </label>
            <div className="button-row">
              <button
                type="submit"
                className="claim-button"
                disabled={savingHousehold || loading}
              >
                {savingHousehold ? 'Saving...' : familyExists ? 'Update basics' : 'Save basics'}
              </button>
              {familyExists ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setCurrentStep(1)}
                >
                  Continue to child setup
                </button>
              ) : null}
            </div>
          </form>
        </section>
      )
    }

    if (activeStep === 1) {
      return (
        <section className="panel onboarding-panel">
          <div className="onboarding-step-header">
            <div>
              <p className="panel-label">Step 2: Add a child profile</p>
              <p className="panel-muted">
                Start with at least one child so the app has someone to earn, save, and spend.
              </p>
            </div>
            <span className="job-status-label">{childProfiles.length} added</span>
          </div>
          <form className="auth-form" onSubmit={handleAddChild}>
            <label className="form-field">
              <span className="form-label">Child name</span>
              <input
                className="job-input"
                placeholder="Ex: Ava"
                value={childName}
                onChange={(event) => setChildName(event.target.value)}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-label">Profile icon</span>
              <select
                className="job-input"
                value={childAvatar}
                onChange={(event) => setChildAvatar(event.target.value)}
              >
                {childAvatarOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value} {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-label">Weekly earning goal</span>
              <input
                className="job-input"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="Ex: 300"
                value={weeklyGoalCredits}
                onChange={(event) => setWeeklyGoalCredits(event.target.value)}
              />
              <span className="form-help">Suggested starter goal: 300 credits per week.</span>
            </label>
            <div className="button-row">
              <button
                type="submit"
                className="claim-button"
                disabled={addingChild || loading || !familyExists}
              >
                {addingChild ? 'Adding...' : 'Add child profile'}
              </button>
              {childProfiles.length > 0 ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setCurrentStep(2)}
                >
                  Continue to starter jobs
                </button>
              ) : null}
            </div>
          </form>

          {childProfiles.length > 0 ? (
            <ul className="profile-list">
              {childProfiles.map((child) => (
                <li key={child.id} className="profile-list-item">
                  <span>
                    {child.avatar} {child.displayName}
                  </span>
                  <span className="job-status-label">Goal {child.weeklyGoalCredits}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )
    }

    if (activeStep === 2) {
      return (
        <section className="panel onboarding-panel">
          <div className="onboarding-step-header">
            <div>
              <p className="panel-label">Step 3: Add starter jobs</p>
              <p className="panel-muted">
                Add the first repeatable jobs your kids can complete right away.
              </p>
            </div>
            <span className="job-status-label">{jobs.length} added</span>
          </div>
          <form className="auth-form" onSubmit={handleAddJob}>
            <label className="form-field">
              <span className="form-label">Job title</span>
              <input
                className="job-input"
                placeholder="Ex: Make your bed"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-label">Credits earned</span>
              <input
                className="job-input"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={jobPoints}
                onChange={(event) => setJobPoints(event.target.value)}
                required
              />
            </label>
            <div className="button-row">
              <button
                type="submit"
                className="claim-button"
                disabled={addingJob || loading || childProfiles.length === 0}
              >
                {addingJob ? 'Adding...' : 'Add starter job'}
              </button>
              {jobs.length > 0 ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setCurrentStep(3)}
                >
                  Continue to rewards
                </button>
              ) : null}
            </div>
          </form>

          {jobs.length > 0 ? (
            <ul className="profile-list">
              {jobs.map((job) => (
                <li key={job.id} className="profile-list-item">
                  <span>{job.title}</span>
                  <span className="job-status-label">{job.points} credits</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )
    }

    return (
      <section className="panel onboarding-panel">
        <div className="onboarding-step-header">
          <div>
            <p className="panel-label">Step 4: Add starter rewards</p>
            <p className="panel-muted">
              Give kids something motivating to save up for from day one.
            </p>
          </div>
          <span className="job-status-label">{rewards.length} added</span>
        </div>
        <form className="auth-form" onSubmit={handleAddReward}>
          <label className="form-field">
            <span className="form-label">Reward title</span>
            <input
              className="job-input"
              placeholder="Ex: Movie night"
              value={rewardTitle}
              onChange={(event) => setRewardTitle(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span className="form-label">Reward cost</span>
            <input
              className="job-input"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={rewardCost}
              onChange={(event) => setRewardCost(event.target.value)}
              required
            />
          </label>
          <div className="button-row">
            <button
              type="submit"
              className="claim-button"
              disabled={addingReward || loading || jobs.length === 0}
            >
              {addingReward ? 'Adding...' : 'Add starter reward'}
            </button>
            {rewards.length > 0 ? (
              <button
                type="button"
                className="text-button"
                onClick={() => setCurrentStep(4)}
              >
                Review completion
              </button>
            ) : null}
          </div>
        </form>

        {rewards.length > 0 ? (
          <ul className="profile-list">
            {rewards.map((reward) => (
              <li key={reward.id} className="profile-list-item">
                <span>{reward.title}</span>
                <span className="job-status-label">{reward.cost} credits</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    )
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-hero panel">
        <p className="panel-label">Family Economy Setup</p>
        <h1 className="auth-title">Build your family’s first experience</h1>
        <p className="panel-muted">
          Finish the basics here before kids enter the app: household details, child
          profiles, starter jobs, and starter rewards.
        </p>
        <p className="wizard-step-counter">
          {onboardingComplete
            ? activeStep === 4
              ? 'All setup steps complete'
              : `Reviewing step ${activeStep + 1} of ${wizardSteps.length}`
            : `Step ${activeStep + 1} of ${wizardSteps.length}`}
        </p>
        <div className="onboarding-progress">
          {wizardSteps.map((step, index) => {
            const isComplete =
              (index === 0 && familyExists) ||
              (index === 1 && childProfiles.length > 0) ||
              (index === 2 && jobs.length > 0) ||
              (index === 3 && rewards.length > 0)
            const isActive = activeStep === index && !onboardingComplete

            return (
              <button
                key={step.key}
                type="button"
                className={
                  isComplete
                    ? 'step-pill step-pill-complete'
                    : isActive
                      ? 'step-pill step-pill-active'
                      : 'step-pill'
                }
                onClick={() => setCurrentStep(index)}
              >
                {index + 1}. {step.label}
              </button>
            )
          })}
        </div>
      </section>

      {!isParent ? (
        <section className="panel onboarding-panel">
          <p className="panel-label">Parent Access Required</p>
          <p className="panel-muted">
            Sign in with a parent account to finish onboarding.
          </p>

          {!isAuthenticated ? (
            <form className="auth-form" onSubmit={handleParentSignIn}>
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
              <button type="submit" className="claim-button" disabled={unlocking}>
                {unlocking ? 'Signing in...' : 'Sign in as Parent'}
              </button>
            </form>
          ) : (
            <>
              <p className="panel-muted">Signed in as: {userEmail || 'Unknown user'}</p>
              <button type="button" className="text-button" onClick={logout}>
                Sign out and use parent account
              </button>
            </>
          )}
        </section>
      ) : null}

      {isParent ? (
        <div className="onboarding-grid">
          {renderCurrentStep()}
          {renderStepNavigation()}
        </div>
      ) : null}

      {loading ? <p className="status-note">Loading onboarding...</p> : null}
      {status ? <p className="status-note">{status}</p> : null}
      {error ? <p className="status-note status-error">{error}</p> : null}
    </main>
  )
}