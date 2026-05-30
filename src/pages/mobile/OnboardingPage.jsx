import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import MarkdownTextArea from '../../components/shared/MarkdownTextArea'
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
  { key: 'parent-features', label: 'Parent Features' },
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
  const [jobBadgeContribution, setJobBadgeContribution] = useState('none')
  const [rewardTitle, setRewardTitle] = useState('')
  const [rewardCost, setRewardCost] = useState('150')
  const [familyAnnouncement, setFamilyAnnouncement] = useState('')
  const [childSessionSecurityEnabled, setChildSessionSecurityEnabled] = useState(false)
  const [savingsGoalApprovalMode, setSavingsGoalApprovalMode] = useState('claim_only')
  const [missedJobConsequenceEnabled, setMissedJobConsequenceEnabled] = useState(false)
  const [missedJobPenaltyCredits, setMissedJobPenaltyCredits] = useState('0')
  const [missedJobTimingEnabled, setMissedJobTimingEnabled] = useState(false)
  const [missedJobDefaultHours, setMissedJobDefaultHours] = useState('24')
  const [failedJobCheckConsequenceEnabled, setFailedJobCheckConsequenceEnabled] = useState(false)
  const [failedJobCheckPenaltyCredits, setFailedJobCheckPenaltyCredits] = useState('0')
  const [maxActivePoolClaimsPerChild, setMaxActivePoolClaimsPerChild] = useState('1')
  const [allowClaimingWithPendingChecks, setAllowClaimingWithPendingChecks] = useState(false)
  const [dynamicPricingEnabled, setDynamicPricingEnabled] = useState(false)
  const [dynamicPricingWindowPeriod, setDynamicPricingWindowPeriod] = useState('week')
  const [dynamicPricingDemandWeight, setDynamicPricingDemandWeight] = useState('10')
  const [dynamicPricingScarcityWeight, setDynamicPricingScarcityWeight] = useState('20')
  const [achievementsEnabled, setAchievementsEnabled] = useState(true)
  const [familyRecognitionEnabled, setFamilyRecognitionEnabled] = useState(true)
  const [achievementFirstGoalTarget, setAchievementFirstGoalTarget] = useState('1')
  const [achievementContributorCreditsTarget, setAchievementContributorCreditsTarget] = useState('100')
  const [achievementHelperJobsTarget, setAchievementHelperJobsTarget] = useState('3')
  const [achievementReadingJobsTarget, setAchievementReadingJobsTarget] = useState('5')
  const [recognitionStreakDaysTarget, setRecognitionStreakDaysTarget] = useState('3')
  const [recognitionHelpingHandJobsTarget, setRecognitionHelpingHandJobsTarget] = useState('1')
  const [recognitionGoalGetterTarget, setRecognitionGoalGetterTarget] = useState('1')
  const [savingParentFeatures, setSavingParentFeatures] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [currentStep, setCurrentStep] = useState(0)

  const isParent = userRole === 'parent'
  const maxReachableStep = wizardSteps.length - 1
  const activeStep = Math.min(currentStep, maxReachableStep)

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

        if (typeof result.data.family?.familyAnnouncement === 'string') {
          setFamilyAnnouncement(result.data.family.familyAnnouncement)
        }

        setChildSessionSecurityEnabled(Boolean(result.data.family?.childSessionSecurityEnabled))
        setSavingsGoalApprovalMode(result.data.family?.savingsGoalApprovalMode || 'claim_only')
        setMissedJobConsequenceEnabled(Boolean(result.data.family?.missedJobConsequenceEnabled))
        setMissedJobPenaltyCredits(String(result.data.family?.missedJobPenaltyCredits || 0))
        setMissedJobTimingEnabled(Boolean(result.data.family?.missedJobTimingEnabled))
        setMissedJobDefaultHours(String(result.data.family?.missedJobDefaultHours || 24))
        setFailedJobCheckConsequenceEnabled(Boolean(result.data.family?.failedJobCheckConsequenceEnabled))
        setFailedJobCheckPenaltyCredits(String(result.data.family?.failedJobCheckPenaltyCredits || 0))
        setMaxActivePoolClaimsPerChild(String(result.data.family?.maxActivePoolClaimsPerChild || 1))
        setAllowClaimingWithPendingChecks(Boolean(result.data.family?.allowClaimingWithPendingChecks))
        setDynamicPricingEnabled(Boolean(result.data.family?.dynamicPricingEnabled))
        setDynamicPricingWindowPeriod(result.data.family?.dynamicPricingWindowPeriod || 'week')
        setDynamicPricingDemandWeight(String(result.data.family?.dynamicPricingDemandWeight || 10))
        setDynamicPricingScarcityWeight(String(result.data.family?.dynamicPricingScarcityWeight || 20))
        setAchievementsEnabled(result.data.family?.achievementsEnabled !== false)
        setFamilyRecognitionEnabled(result.data.family?.familyRecognitionEnabled !== false)
        setAchievementFirstGoalTarget(String(result.data.family?.achievementFirstGoalTarget || 1))
        setAchievementContributorCreditsTarget(String(result.data.family?.achievementContributorCreditsTarget || 100))
        setAchievementHelperJobsTarget(String(result.data.family?.achievementHelperJobsTarget || 3))
        setAchievementReadingJobsTarget(String(result.data.family?.achievementReadingJobsTarget || 5))
        setRecognitionStreakDaysTarget(String(result.data.family?.recognitionStreakDaysTarget || 3))
        setRecognitionHelpingHandJobsTarget(String(result.data.family?.recognitionHelpingHandJobsTarget || 1))
        setRecognitionGoalGetterTarget(String(result.data.family?.recognitionGoalGetterTarget || 1))

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

      if (typeof result.data.family?.familyAnnouncement === 'string') {
        setFamilyAnnouncement(result.data.family.familyAnnouncement)
      }

      setChildSessionSecurityEnabled(Boolean(result.data.family?.childSessionSecurityEnabled))
      setSavingsGoalApprovalMode(result.data.family?.savingsGoalApprovalMode || 'claim_only')
      setMissedJobConsequenceEnabled(Boolean(result.data.family?.missedJobConsequenceEnabled))
      setMissedJobPenaltyCredits(String(result.data.family?.missedJobPenaltyCredits || 0))
      setMissedJobTimingEnabled(Boolean(result.data.family?.missedJobTimingEnabled))
      setMissedJobDefaultHours(String(result.data.family?.missedJobDefaultHours || 24))
      setFailedJobCheckConsequenceEnabled(Boolean(result.data.family?.failedJobCheckConsequenceEnabled))
      setFailedJobCheckPenaltyCredits(String(result.data.family?.failedJobCheckPenaltyCredits || 0))
      setMaxActivePoolClaimsPerChild(String(result.data.family?.maxActivePoolClaimsPerChild || 1))
      setAllowClaimingWithPendingChecks(Boolean(result.data.family?.allowClaimingWithPendingChecks))
      setDynamicPricingEnabled(Boolean(result.data.family?.dynamicPricingEnabled))
      setDynamicPricingWindowPeriod(result.data.family?.dynamicPricingWindowPeriod || 'week')
      setDynamicPricingDemandWeight(String(result.data.family?.dynamicPricingDemandWeight || 10))
      setDynamicPricingScarcityWeight(String(result.data.family?.dynamicPricingScarcityWeight || 20))
      setAchievementsEnabled(result.data.family?.achievementsEnabled !== false)
      setFamilyRecognitionEnabled(result.data.family?.familyRecognitionEnabled !== false)
      setAchievementFirstGoalTarget(String(result.data.family?.achievementFirstGoalTarget || 1))
      setAchievementContributorCreditsTarget(String(result.data.family?.achievementContributorCreditsTarget || 100))
      setAchievementHelperJobsTarget(String(result.data.family?.achievementHelperJobsTarget || 3))
      setAchievementReadingJobsTarget(String(result.data.family?.achievementReadingJobsTarget || 5))
      setRecognitionStreakDaysTarget(String(result.data.family?.recognitionStreakDaysTarget || 3))
      setRecognitionHelpingHandJobsTarget(String(result.data.family?.recognitionHelpingHandJobsTarget || 1))
      setRecognitionGoalGetterTarget(String(result.data.family?.recognitionGoalGetterTarget || 1))

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
        {
          title: jobTitle,
          points: Number(jobPoints) || 0,
          badgeContribution: jobBadgeContribution,
        },
        { familyId, userId, userRole },
      )
      setJobTitle('')
      setJobPoints('50')
      setJobBadgeContribution('none')
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

  async function handleSaveParentFeatures(event) {
    event.preventDefault()
    setSavingParentFeatures(true)
    setError('')
    setStatus('')

    try {
      await createHousehold(
        {
          profileName: householdName,
          familyRules,
          familyAnnouncement,
          childSessionSecurityEnabled,
          savingsGoalApprovalMode,
          missedJobConsequenceEnabled,
          missedJobPenaltyCredits: Number(missedJobPenaltyCredits) || 0,
          missedJobTimingEnabled,
          missedJobDefaultHours: Number(missedJobDefaultHours) || 24,
          failedJobCheckConsequenceEnabled,
          failedJobCheckPenaltyCredits: Number(failedJobCheckPenaltyCredits) || 0,
          maxActivePoolClaimsPerChild: Number(maxActivePoolClaimsPerChild) || 1,
          allowClaimingWithPendingChecks,
          dynamicPricingEnabled,
          dynamicPricingWindowPeriod,
          dynamicPricingDemandWeight: Number(dynamicPricingDemandWeight) || 0,
          dynamicPricingScarcityWeight: Number(dynamicPricingScarcityWeight) || 0,
          achievementsEnabled,
          familyRecognitionEnabled,
          achievementFirstGoalTarget: Math.max(1, Number(achievementFirstGoalTarget) || 1),
          achievementContributorCreditsTarget: Math.max(1, Number(achievementContributorCreditsTarget) || 100),
          achievementHelperJobsTarget: Math.max(1, Number(achievementHelperJobsTarget) || 3),
          achievementReadingJobsTarget: Math.max(1, Number(achievementReadingJobsTarget) || 5),
          recognitionStreakDaysTarget: Math.max(1, Number(recognitionStreakDaysTarget) || 3),
          recognitionHelpingHandJobsTarget: Math.max(1, Number(recognitionHelpingHandJobsTarget) || 1),
          recognitionGoalGetterTarget: Math.max(1, Number(recognitionGoalGetterTarget) || 1),
        },
        { familyId, userId, userRole, userEmail },
      )

      setStatus('Parent feature settings saved.')
      await loadOnboarding()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not save parent feature settings.')
    } finally {
      setSavingParentFeatures(false)
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
          Next step
        </button>
      </div>
    )
  }

  function renderCurrentStep() {
    if (!isParent) {
      return null
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
              <MarkdownTextArea
                placeholder="Ex: Finish jobs before screen time. Be kind. Keep your room tidy."
                value={familyRules}
                onChange={setFamilyRules}
                rows={4}
                disabled={savingHousehold || loading}
              />
            </label>
            <div className="button-row">
              <button
                type="submit"
                className="claim-button"
                disabled={savingHousehold || loading}
              >
                {savingHousehold ? 'Saving...' : familyExists ? 'Update basics' : 'Save basics'}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setCurrentStep(1)}
                disabled={!familyExists}
              >
                Continue
              </button>
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
              <button
                type="button"
                className="text-button"
                onClick={() => setCurrentStep(2)}
              >
                Skip for now
              </button>
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
            <label className="form-field">
              <span className="form-label">Badge contribution</span>
              <select
                className="job-input"
                value={jobBadgeContribution}
                onChange={(event) => setJobBadgeContribution(event.target.value)}
              >
                <option value="none">None</option>
                <option value="helper">Helper</option>
                <option value="reading">Reading</option>
              </select>
            </label>
            <div className="button-row">
              <button
                type="submit"
                className="claim-button"
                disabled={addingJob || loading || childProfiles.length === 0}
              >
                {addingJob ? 'Adding...' : 'Add starter job'}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setCurrentStep(3)}
              >
                Skip for now
              </button>
            </div>
          </form>

          {jobs.length > 0 ? (
            <ul className="profile-list">
              {jobs.map((job) => (
                <li key={job.id} className="profile-list-item">
                  <span>{job.title}</span>
                  <span className="job-status-label">{job.points} credits</span>
                  <span className="job-status-label">
                    {job.badgeContribution === 'helper'
                      ? 'Helper tag'
                      : job.badgeContribution === 'reading'
                        ? 'Reading tag'
                        : 'No tag'}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )
    }

    if (activeStep === 3) {
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
            <button
              type="button"
              className="text-button"
              onClick={() => setCurrentStep(4)}
            >
              Skip for now
            </button>
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
      <section className="panel onboarding-panel">
        <div className="onboarding-step-header">
          <div>
            <p className="panel-label">Step 5: Parent features (optional)</p>
            <p className="panel-muted">
              Configure announcement, security, savings approvals, and smart pricing now or skip for later.
            </p>
          </div>
          <span className="job-status-label">Optional</span>
        </div>

        <form className="auth-form" onSubmit={handleSaveParentFeatures}>
          <label className="form-field">
            <span className="form-label">Family announcement</span>
            <MarkdownTextArea
              placeholder="Ex: Grandparents visit Saturday."
              value={familyAnnouncement}
              onChange={setFamilyAnnouncement}
              rows={5}
              disabled={savingParentFeatures}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Child session lock</span>
            <select
              className="job-input"
              value={childSessionSecurityEnabled ? 'on' : 'off'}
              onChange={(event) => setChildSessionSecurityEnabled(event.target.value === 'on')}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </label>

          <label className="form-field">
            <span className="form-label">Savings approval mode</span>
            <select
              className="job-input"
              value={savingsGoalApprovalMode}
              onChange={(event) => setSavingsGoalApprovalMode(event.target.value)}
            >
              <option value="claim_only">Approve claim only</option>
              <option value="create_and_claim">Approve create and claim</option>
              <option value="no_approval">No parent approval</option>
            </select>
          </label>

          <label className="form-field">
            <span className="form-label">Missed job consequence</span>
            <select
              className="job-input"
              value={missedJobConsequenceEnabled ? 'on' : 'off'}
              onChange={(event) => setMissedJobConsequenceEnabled(event.target.value === 'on')}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </label>

          {missedJobConsequenceEnabled ? (
            <>
              <label className="form-field">
                <span className="form-label">Missed job penalty credits</span>
                <input
                  className="job-input"
                  type="number"
                  min="0"
                  value={missedJobPenaltyCredits}
                  onChange={(event) => setMissedJobPenaltyCredits(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Missed job timer mode</span>
                <select
                  className="job-input"
                  value={missedJobTimingEnabled ? 'timed' : 'manual'}
                  onChange={(event) => setMissedJobTimingEnabled(event.target.value === 'timed')}
                >
                  <option value="manual">Manual</option>
                  <option value="timed">Timed</option>
                </select>
              </label>
              {missedJobTimingEnabled ? (
                <label className="form-field">
                  <span className="form-label">Default missed hours</span>
                  <input
                    className="job-input"
                    type="number"
                    min="1"
                    value={missedJobDefaultHours}
                    onChange={(event) => setMissedJobDefaultHours(event.target.value)}
                  />
                </label>
              ) : null}
            </>
          ) : null}

          <label className="form-field">
            <span className="form-label">Failed job check consequence</span>
            <select
              className="job-input"
              value={failedJobCheckConsequenceEnabled ? 'on' : 'off'}
              onChange={(event) => setFailedJobCheckConsequenceEnabled(event.target.value === 'on')}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </label>

          {failedJobCheckConsequenceEnabled ? (
            <label className="form-field">
              <span className="form-label">Failed check penalty credits</span>
              <input
                className="job-input"
                type="number"
                min="0"
                value={failedJobCheckPenaltyCredits}
                onChange={(event) => setFailedJobCheckPenaltyCredits(event.target.value)}
              />
            </label>
          ) : null}

          <label className="form-field">
            <span className="form-label">Max active pool claims per child</span>
            <input
              className="job-input"
              type="number"
              min="1"
              value={maxActivePoolClaimsPerChild}
              onChange={(event) => setMaxActivePoolClaimsPerChild(event.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Pending checks count toward limits</span>
            <select
              className="job-input"
              value={allowClaimingWithPendingChecks ? 'no' : 'yes'}
              onChange={(event) => setAllowClaimingWithPendingChecks(event.target.value === 'no')}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>

          <label className="form-field">
            <span className="form-label">Dynamic reward pricing</span>
            <select
              className="job-input"
              value={dynamicPricingEnabled ? 'on' : 'off'}
              onChange={(event) => setDynamicPricingEnabled(event.target.value === 'on')}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
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
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Demand weight %</span>
                <input
                  className="job-input"
                  type="number"
                  min="0"
                  value={dynamicPricingDemandWeight}
                  onChange={(event) => setDynamicPricingDemandWeight(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Scarcity weight %</span>
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

          <label className="form-field">
            <span className="form-label">Achievements cards</span>
            <select
              className="job-input"
              value={achievementsEnabled ? 'on' : 'off'}
              onChange={(event) => setAchievementsEnabled(event.target.value === 'on')}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>

          <label className="form-field">
            <span className="form-label">Family recognition cards</span>
            <select
              className="job-input"
              value={familyRecognitionEnabled ? 'on' : 'off'}
              onChange={(event) => setFamilyRecognitionEnabled(event.target.value === 'on')}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>

          <label className="form-field">
            <span className="form-label">First Goal badge target</span>
            <input
              className="job-input"
              type="number"
              min="1"
              value={achievementFirstGoalTarget}
              onChange={(event) => setAchievementFirstGoalTarget(event.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Contributor badge target (credits)</span>
            <input
              className="job-input"
              type="number"
              min="1"
              value={achievementContributorCreditsTarget}
              onChange={(event) => setAchievementContributorCreditsTarget(event.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Helper badge target (helper-tagged jobs)</span>
            <input
              className="job-input"
              type="number"
              min="1"
              value={achievementHelperJobsTarget}
              onChange={(event) => setAchievementHelperJobsTarget(event.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Reading badge target (reading-tagged jobs)</span>
            <input
              className="job-input"
              type="number"
              min="1"
              value={achievementReadingJobsTarget}
              onChange={(event) => setAchievementReadingJobsTarget(event.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Streak recognition target (days)</span>
            <input
              className="job-input"
              type="number"
              min="1"
              value={recognitionStreakDaysTarget}
              onChange={(event) => setRecognitionStreakDaysTarget(event.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Helping Hand recognition target</span>
            <input
              className="job-input"
              type="number"
              min="1"
              value={recognitionHelpingHandJobsTarget}
              onChange={(event) => setRecognitionHelpingHandJobsTarget(event.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Goal Getter recognition target</span>
            <input
              className="job-input"
              type="number"
              min="1"
              value={recognitionGoalGetterTarget}
              onChange={(event) => setRecognitionGoalGetterTarget(event.target.value)}
            />
          </label>

          <div className="button-row">
            <button type="submit" className="claim-button" disabled={savingParentFeatures || !familyExists}>
              {savingParentFeatures ? 'Saving...' : 'Save Parent Features'}
            </button>
            <button type="button" className="text-button" onClick={() => navigate('/mobile/home')} disabled={!familyExists}>
              Finish Setup
            </button>
          </div>
        </form>
      </section>
    )
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-hero panel">
        <p className="panel-label">Family Economy Setup</p>
        <h1 className="auth-title">Build your family’s first experience</h1>
        <p className="panel-muted">
          Set up household basics, child profiles, starter jobs/rewards, and parent controls.
          You can skip optional steps and refine everything later in Parent settings.
        </p>
        <p className="wizard-step-counter">
          Step {activeStep + 1} of {wizardSteps.length}
        </p>
        <div className="onboarding-progress">
          {wizardSteps.map((step, index) => {
            const isComplete =
              (index === 0 && familyExists) ||
              (index === 1 && childProfiles.length > 0) ||
              (index === 2 && jobs.length > 0) ||
              (index === 3 && rewards.length > 0) ||
              (index < activeStep)
            const isActive = activeStep === index

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