import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import MarkdownTextArea from '../../components/shared/MarkdownTextArea'
import { useAuth } from '../../context/AuthContext'
import {
  onboardingJobTemplates,
  onboardingRewardTemplates,
} from '../../data/onboardingTemplates'
import useFamilyActor from '../../hooks/useFamilyActor'
import {
  useCreateChildProfileMutation,
  useCreateHouseholdMutation,
  useCreateJobMutation,
  useCreateRewardMutation,
  useLazyGetHouseholdOnboardingDataQuery,
} from '../../store/familyEconomyApi'

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

function buildJobTemplateRows() {
  return onboardingJobTemplates.map((template) => ({
    ...template,
    selected: true,
    points: String(template.points),
  }))
}

function buildRewardTemplateRows() {
  return onboardingRewardTemplates.map((template) => ({
    ...template,
    selected: true,
    cost: String(template.cost),
  }))
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { familyId, userId, userRole, isAuthenticated, login, userEmail, logout } =
    useAuth()
  const { effectiveUserId, effectiveRole } = useFamilyActor()
  const [createChildProfileMutation] = useCreateChildProfileMutation()
  const [createHouseholdMutation] = useCreateHouseholdMutation()
  const [createJobMutation] = useCreateJobMutation()
  const [createRewardMutation] = useCreateRewardMutation()
  const [loadHouseholdOnboarding] = useLazyGetHouseholdOnboardingDataQuery()

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
  const [jobTemplateRows, setJobTemplateRows] = useState(() => buildJobTemplateRows())
  const [rewardTitle, setRewardTitle] = useState('')
  const [rewardCost, setRewardCost] = useState('150')
  const [rewardTemplateRows, setRewardTemplateRows] = useState(() => buildRewardTemplateRows())
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
  const parentFirstName = (userEmail || '').split('@')[0] || 'Parent'
  const householdLabel = (householdName || '').trim() || 'your family'
  const selectedJobTemplateCount = jobTemplateRows.filter((template) => template.selected).length
  const selectedRewardTemplateCount = rewardTemplateRows.filter((template) => template.selected).length

  const applyOnboardingData = useCallback((data, options = {}) => {
    const { preserveCurrentStep = false } = options

    setFamilyExists(data.familyExists)
    setChildProfiles(data.childProfiles)
    setJobs(data.jobs)
    setRewards(data.rewards)

    if (data.family?.profileName) {
      setHouseholdName(data.family.profileName)
    }

    if (typeof data.family?.familyRules === 'string') {
      setFamilyRules(data.family.familyRules)
    }

    if (typeof data.family?.familyAnnouncement === 'string') {
      setFamilyAnnouncement(data.family.familyAnnouncement)
    }

    setChildSessionSecurityEnabled(Boolean(data.family?.childSessionSecurityEnabled))
    setSavingsGoalApprovalMode(data.family?.savingsGoalApprovalMode || 'claim_only')
    setMissedJobConsequenceEnabled(Boolean(data.family?.missedJobConsequenceEnabled))
    setMissedJobPenaltyCredits(String(data.family?.missedJobPenaltyCredits || 0))
    setMissedJobTimingEnabled(Boolean(data.family?.missedJobTimingEnabled))
    setMissedJobDefaultHours(String(data.family?.missedJobDefaultHours || 24))
    setFailedJobCheckConsequenceEnabled(Boolean(data.family?.failedJobCheckConsequenceEnabled))
    setFailedJobCheckPenaltyCredits(String(data.family?.failedJobCheckPenaltyCredits || 0))
    setMaxActivePoolClaimsPerChild(String(data.family?.maxActivePoolClaimsPerChild || 1))
    setAllowClaimingWithPendingChecks(Boolean(data.family?.allowClaimingWithPendingChecks))
    setDynamicPricingEnabled(Boolean(data.family?.dynamicPricingEnabled))
    setDynamicPricingWindowPeriod(data.family?.dynamicPricingWindowPeriod || 'week')
    setDynamicPricingDemandWeight(String(data.family?.dynamicPricingDemandWeight || 10))
    setDynamicPricingScarcityWeight(String(data.family?.dynamicPricingScarcityWeight || 20))
    setAchievementsEnabled(data.family?.achievementsEnabled !== false)
    setFamilyRecognitionEnabled(data.family?.familyRecognitionEnabled !== false)
    setAchievementFirstGoalTarget(String(data.family?.achievementFirstGoalTarget || 1))
    setAchievementContributorCreditsTarget(String(data.family?.achievementContributorCreditsTarget || 100))
    setAchievementHelperJobsTarget(String(data.family?.achievementHelperJobsTarget || 3))
    setAchievementReadingJobsTarget(String(data.family?.achievementReadingJobsTarget || 5))
    setRecognitionStreakDaysTarget(String(data.family?.recognitionStreakDaysTarget || 3))
    setRecognitionHelpingHandJobsTarget(String(data.family?.recognitionHelpingHandJobsTarget || 1))
    setRecognitionGoalGetterTarget(String(data.family?.recognitionGoalGetterTarget || 1))

    const recommendedStep = getRecommendedStepIndex(data)
    setCurrentStep((previousStep) => (
      preserveCurrentStep ? Math.max(previousStep, recommendedStep) : recommendedStep
    ))
  }, [])

  useEffect(() => {
    let active = true

    async function run() {
      try {
        const data = await loadHouseholdOnboarding({
          familyId,
          userId: effectiveUserId,
          userRole: effectiveRole,
        }).unwrap()

        if (!active) {
          return
        }

        applyOnboardingData(data)
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
  }, [familyId, effectiveUserId, effectiveRole, loadHouseholdOnboarding, applyOnboardingData])

  async function loadOnboarding(options = {}) {
    const { preserveCurrentStep = false } = options
    setLoading(true)
    setError('')

    try {
      const data = await loadHouseholdOnboarding({
        familyId,
        userId: effectiveUserId,
        userRole: effectiveRole,
      }).unwrap()

      applyOnboardingData(data, { preserveCurrentStep })
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
      await createHouseholdMutation({
        household: { profileName: householdName, familyRules },
        context: { familyId, userId, userRole },
      }).unwrap()
      setStatus('Household details saved.')
      await loadOnboarding({ preserveCurrentStep: true })
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
      await createChildProfileMutation({
        childProfile: {
          displayName: childName,
          avatar: childAvatar,
          weeklyGoalCredits,
        },
        context: { familyId, userId, userRole },
      }).unwrap()
      setChildName('')
      setWeeklyGoalCredits('300')
      setStatus('Child profile added.')
      await loadOnboarding({ preserveCurrentStep: true })
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
      await createJobMutation({
        jobPayload: {
          title: jobTitle,
          points: Number(jobPoints) || 0,
          badgeContribution: jobBadgeContribution,
        },
        context: { familyId, userId, userRole },
      }).unwrap()
      setJobTitle('')
      setJobPoints('50')
      setJobBadgeContribution('none')
      setStatus('Starter job added.')
      await loadOnboarding({ preserveCurrentStep: true })
      setCurrentStep(3)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not add starter job.')
    } finally {
      setAddingJob(false)
    }
  }

  async function handleAddSelectedJobTemplates() {
    const selectedTemplates = jobTemplateRows.filter((template) => template.selected)
    if (selectedTemplates.length === 0) {
      setError('Choose at least one starter job template.')
      return
    }

    const missingTitle = selectedTemplates.some((template) => !template.title.trim())
    if (missingTitle) {
      setError('Each selected starter job needs a title.')
      return
    }

    setAddingJob(true)
    setError('')
    setStatus('')

    try {
      await Promise.all(selectedTemplates.map((template) => (
        createJobMutation({
          jobPayload: {
            title: template.title,
            points: Number(template.points) || 0,
            badgeContribution: template.badgeContribution,
          },
          context: { familyId, userId, userRole },
        }).unwrap()
      )))
      setStatus(`${selectedTemplates.length} starter jobs added.`)
      setJobTemplateRows(buildJobTemplateRows())
      await loadOnboarding({ preserveCurrentStep: true })
      setCurrentStep(3)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not add starter jobs.')
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
      await createRewardMutation({
        rewardPayload: { title: rewardTitle, cost: Number(rewardCost) || 0 },
        context: { familyId, userId, userRole },
      }).unwrap()
      setRewardTitle('')
      setRewardCost('150')
      setStatus('Starter reward added.')
      await loadOnboarding({ preserveCurrentStep: true })
      setCurrentStep(4)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not add starter reward.')
    } finally {
      setAddingReward(false)
    }
  }

  async function handleAddSelectedRewardTemplates() {
    const selectedTemplates = rewardTemplateRows.filter((template) => template.selected)
    if (selectedTemplates.length === 0) {
      setError('Choose at least one starter reward template.')
      return
    }

    const missingTitle = selectedTemplates.some((template) => !template.title.trim())
    if (missingTitle) {
      setError('Each selected starter reward needs a title.')
      return
    }

    setAddingReward(true)
    setError('')
    setStatus('')

    try {
      await Promise.all(selectedTemplates.map((template) => (
        createRewardMutation({
          rewardPayload: {
            title: template.title,
            cost: Number(template.cost) || 0,
          },
          context: { familyId, userId, userRole },
        }).unwrap()
      )))
      setStatus(`${selectedTemplates.length} starter rewards added.`)
      setRewardTemplateRows(buildRewardTemplateRows())
      await loadOnboarding({ preserveCurrentStep: true })
      setCurrentStep(4)
    } catch (caughtError) {
      setError(caughtError.message || 'Could not add starter rewards.')
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
      await createHouseholdMutation({
        household: {
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
        context: { familyId, userId, userRole, userEmail },
      }).unwrap()

      setStatus('Parent feature settings saved.')
      await loadOnboarding({ preserveCurrentStep: true })
      navigate('/mobile/home')
    } catch (caughtError) {
      setError(caughtError.message || 'Could not save parent feature settings.')
    } finally {
      setSavingParentFeatures(false)
    }
  }

  function getParentFeaturePreset() {
    if (
      missedJobConsequenceEnabled
      && Number(missedJobPenaltyCredits) === 5
      && missedJobTimingEnabled
      && Number(missedJobDefaultHours) === 48
      && !failedJobCheckConsequenceEnabled
      && Number(failedJobCheckPenaltyCredits) === 0
    ) {
      return 'gentle'
    }

    if (
      missedJobConsequenceEnabled
      && Number(missedJobPenaltyCredits) === 15
      && missedJobTimingEnabled
      && Number(missedJobDefaultHours) === 24
      && failedJobCheckConsequenceEnabled
      && Number(failedJobCheckPenaltyCredits) === 5
    ) {
      return 'balanced'
    }

    if (
      missedJobConsequenceEnabled
      && Number(missedJobPenaltyCredits) === 30
      && missedJobTimingEnabled
      && Number(missedJobDefaultHours) === 12
      && failedJobCheckConsequenceEnabled
      && Number(failedJobCheckPenaltyCredits) === 15
    ) {
      return 'strict'
    }

    return 'custom'
  }

  function applyParentFeaturePreset(preset) {
    if (preset === 'gentle') {
      setMissedJobConsequenceEnabled(true)
      setMissedJobPenaltyCredits('5')
      setMissedJobTimingEnabled(true)
      setMissedJobDefaultHours('48')
      setFailedJobCheckConsequenceEnabled(false)
      setFailedJobCheckPenaltyCredits('0')
      return
    }

    if (preset === 'balanced') {
      setMissedJobConsequenceEnabled(true)
      setMissedJobPenaltyCredits('15')
      setMissedJobTimingEnabled(true)
      setMissedJobDefaultHours('24')
      setFailedJobCheckConsequenceEnabled(true)
      setFailedJobCheckPenaltyCredits('5')
      return
    }

    if (preset === 'strict') {
      setMissedJobConsequenceEnabled(true)
      setMissedJobPenaltyCredits('30')
      setMissedJobTimingEnabled(true)
      setMissedJobDefaultHours('12')
      setFailedJobCheckConsequenceEnabled(true)
      setFailedJobCheckPenaltyCredits('15')
    }
  }

  function updateJobTemplateRow(templateId, updates) {
    setJobTemplateRows((currentRows) => (
      currentRows.map((template) => (
        template.id === templateId ? { ...template, ...updates } : template
      ))
    ))
  }

  function updateRewardTemplateRow(templateId, updates) {
    setRewardTemplateRows((currentRows) => (
      currentRows.map((template) => (
        template.id === templateId ? { ...template, ...updates } : template
      ))
    ))
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
            <section className="onboarding-mini-dialog">
              <p className="onboarding-mini-title">Name the household</p>
              <p className="onboarding-mini-subtitle">This appears across parent and kid views.</p>
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
            </section>
            <section className="onboarding-mini-dialog">
              <p className="onboarding-mini-title">Set the tone</p>
              <p className="onboarding-mini-subtitle">Add welcome notes, rules, or expectations for {householdLabel}.</p>
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
            </section>
            <div className="button-row">
              <button
                type="button"
                className="text-button onboarding-back-button"
                disabled
              >
                Back
              </button>
              <button
                type="submit"
                className="claim-button onboarding-primary-button"
                disabled={savingHousehold || loading}
              >
                {savingHousehold ? 'Saving...' : 'Continue'}
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
            <section className="onboarding-mini-dialog">
              <p className="onboarding-mini-title">Child profile</p>
              <p className="onboarding-mini-subtitle">Start with one child and add more later.</p>
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
            </section>
            <section className="onboarding-mini-dialog">
              <p className="onboarding-mini-title">Weekly goal</p>
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
            </section>
            <div className="button-row">
              <button
                type="button"
                className="text-button onboarding-back-button"
                onClick={() => setCurrentStep(0)}
              >
                Back
              </button>
              <button
                type="submit"
                className="claim-button onboarding-primary-button"
                disabled={addingChild || loading || !familyExists}
              >
                {addingChild ? 'Saving...' : 'Continue'}
              </button>
              <button
                type="button"
                className="onboarding-skip-button"
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
          <section className="onboarding-mini-dialog">
            <p className="onboarding-mini-title">Starter job group</p>
            <p className="onboarding-mini-subtitle">Select the jobs that fit your family, adjust the credits, then add them together.</p>
            <div className="button-row">
              <button
                type="button"
                className="text-button"
                onClick={() => setJobTemplateRows((rows) => rows.map((template) => ({ ...template, selected: true })))}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setJobTemplateRows((rows) => rows.map((template) => ({ ...template, selected: false })))}
              >
                Clear
              </button>
              <button
                type="button"
                className="claim-button"
                onClick={handleAddSelectedJobTemplates}
                disabled={addingJob || loading || childProfiles.length === 0 || selectedJobTemplateCount === 0}
              >
                {addingJob ? 'Adding...' : `Add ${selectedJobTemplateCount} selected`}
              </button>
            </div>
            <ul className="profile-list onboarding-template-list onboarding-template-list-jobs">
              {jobTemplateRows.map((template) => (
                <li key={template.id} className="profile-list-item">
                  <label className="form-field">
                    <span className="form-label">
                      <input
                        type="checkbox"
                        checked={template.selected}
                        onChange={(event) => updateJobTemplateRow(template.id, { selected: event.target.checked })}
                      />{' '}
                      Include
                    </span>
                    <input
                      className="job-input"
                      value={template.title}
                      onChange={(event) => updateJobTemplateRow(template.id, { title: event.target.value })}
                      disabled={!template.selected}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Credits</span>
                    <input
                      className="job-input"
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={template.points}
                      onChange={(event) => updateJobTemplateRow(template.id, { points: event.target.value })}
                      disabled={!template.selected}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Badge</span>
                    <select
                      className="job-input"
                      value={template.badgeContribution}
                      onChange={(event) => updateJobTemplateRow(template.id, { badgeContribution: event.target.value })}
                      disabled={!template.selected}
                    >
                      <option value="none">None</option>
                      <option value="helper">Helper</option>
                      <option value="reading">Reading</option>
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          </section>
          <form className="auth-form" onSubmit={handleAddJob}>
            <section className="onboarding-mini-dialog">
              <p className="onboarding-mini-title">Job details</p>
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
            </section>
            <section className="onboarding-mini-dialog">
              <p className="onboarding-mini-title">Recognition mapping</p>
              <p className="onboarding-mini-subtitle">Optional: connect this job to helper or reading badges.</p>
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
            </section>
            <div className="button-row">
              <button
                type="button"
                className="text-button onboarding-back-button"
                onClick={() => setCurrentStep(1)}
              >
                Back
              </button>
              <button
                type="submit"
                className="claim-button onboarding-primary-button"
                disabled={addingJob || loading || childProfiles.length === 0}
              >
                {addingJob ? 'Saving...' : 'Continue'}
              </button>
              <button
                type="button"
                className="onboarding-skip-button"
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
        <section className="onboarding-mini-dialog">
          <p className="onboarding-mini-title">Starter reward group</p>
          <p className="onboarding-mini-subtitle">Pick motivating fictional-credit rewards, adjust costs, then add them together.</p>
          <div className="button-row">
            <button
              type="button"
              className="text-button"
              onClick={() => setRewardTemplateRows((rows) => rows.map((template) => ({ ...template, selected: true })))}
            >
              Select all
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setRewardTemplateRows((rows) => rows.map((template) => ({ ...template, selected: false })))}
            >
              Clear
            </button>
            <button
              type="button"
              className="claim-button"
              onClick={handleAddSelectedRewardTemplates}
              disabled={addingReward || loading || jobs.length === 0 || selectedRewardTemplateCount === 0}
            >
              {addingReward ? 'Adding...' : `Add ${selectedRewardTemplateCount} selected`}
            </button>
          </div>
          <ul className="profile-list onboarding-template-list onboarding-template-list-rewards">
            {rewardTemplateRows.map((template) => (
              <li key={template.id} className="profile-list-item">
                <label className="form-field">
                  <span className="form-label">
                    <input
                      type="checkbox"
                      checked={template.selected}
                      onChange={(event) => updateRewardTemplateRow(template.id, { selected: event.target.checked })}
                    />{' '}
                    Include
                  </span>
                  <input
                    className="job-input"
                    value={template.title}
                    onChange={(event) => updateRewardTemplateRow(template.id, { title: event.target.value })}
                    disabled={!template.selected}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Cost</span>
                  <input
                    className="job-input"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={template.cost}
                    onChange={(event) => updateRewardTemplateRow(template.id, { cost: event.target.value })}
                    disabled={!template.selected}
                  />
                </label>
              </li>
            ))}
          </ul>
        </section>
        <form className="auth-form" onSubmit={handleAddReward}>
          <section className="onboarding-mini-dialog">
            <p className="onboarding-mini-title">Reward details</p>
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
          </section>
          <div className="button-row">
            <button
              type="button"
              className="text-button onboarding-back-button"
              onClick={() => setCurrentStep(2)}
            >
              Back
            </button>
            <button
              type="submit"
              className="claim-button onboarding-primary-button"
              disabled={addingReward || loading || jobs.length === 0}
            >
              {addingReward ? 'Saving...' : 'Continue'}
            </button>
            <button
              type="button"
              className="onboarding-skip-button"
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
          <p className="panel-muted">Personalize these now for {householdLabel}, or save quickly and tune later in Parent settings.</p>

          <section className="onboarding-mini-dialog">
            <p className="onboarding-mini-title">Family communication</p>
            <p className="onboarding-mini-subtitle">Share a welcome note kids will see first.</p>
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
          </section>

          <section className="onboarding-mini-dialog">
            <p className="onboarding-mini-title">Safety and approvals</p>
            <p className="onboarding-mini-subtitle">Control lock behavior, parent review flow, and consequence rules.</p>
            <label className="form-field">
              <span className="form-label">How strict should our accountability style be?</span>
              <select
                className="job-input"
                value={getParentFeaturePreset()}
                onChange={(event) => applyParentFeaturePreset(event.target.value)}
              >
                <option value="custom">Custom</option>
                <option value="gentle">Gentle (light penalties, longer grace period)</option>
                <option value="balanced">Balanced (recommended)</option>
                <option value="strict">Strict (higher penalties, short grace period)</option>
              </select>
            </label>

          <label className="form-field">
            <span className="form-label">Should kids need a lock screen each session?</span>
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
            <span className="form-label">When should parents approve savings goals?</span>
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
            <span className="form-label">Should missed jobs trigger an automatic consequence?</span>
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
            <span className="form-label">If a parent denies a check, should credits be removed?</span>
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
            <span className="form-label">How many shared-pool jobs can one child hold at once?</span>
            <input
              className="job-input"
              type="number"
              min="1"
              value={maxActivePoolClaimsPerChild}
              onChange={(event) => setMaxActivePoolClaimsPerChild(event.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Do pending checks still consume pool slots?</span>
            <select
              className="job-input"
              value={allowClaimingWithPendingChecks ? 'no' : 'yes'}
              onChange={(event) => setAllowClaimingWithPendingChecks(event.target.value === 'no')}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          </section>

          <section className="onboarding-mini-dialog">
            <p className="onboarding-mini-title">Reward cost lessons</p>
            <p className="onboarding-mini-subtitle">Keep reward costs fixed or model simple demand and supply tradeoffs with parent-set guardrails.</p>

          <label className="form-field">
            <span className="form-label">Use educational reward cost changes?</span>
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
                <span className="form-label">Popular-choice lesson %</span>
                <input
                  className="job-input"
                  type="number"
                  min="0"
                  value={dynamicPricingDemandWeight}
                  onChange={(event) => setDynamicPricingDemandWeight(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Limited-supply lesson %</span>
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
          </section>

          <section className="onboarding-mini-dialog">
            <p className="onboarding-mini-title">Recognition and achievements</p>
            <p className="onboarding-mini-subtitle">Decide what to show and when badges unlock.</p>

          <label className="form-field">
            <span className="form-label">Show achievement cards for kids?</span>
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
            <span className="form-label">Show family recognition cards?</span>
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
          </section>

          <section className="onboarding-mini-dialog">
            <p className="onboarding-mini-title">Review before save</p>
            <p className="onboarding-mini-subtitle">Here is how {householdLabel} is currently configured.</p>
            <ul className="profile-list">
              <li className="profile-list-item">
                <span>Child session lock</span>
                <span className="job-status-label">{childSessionSecurityEnabled ? 'On' : 'Off'}</span>
              </li>
              <li className="profile-list-item">
                <span>Savings approvals</span>
                <span className="job-status-label">
                  {savingsGoalApprovalMode === 'create_and_claim'
                    ? 'Approve create + claim'
                    : savingsGoalApprovalMode === 'no_approval'
                      ? 'No approval required'
                      : 'Approve claim only'}
                </span>
              </li>
              <li className="profile-list-item">
                <span>Missed job consequence</span>
                <span className="job-status-label">
                  {missedJobConsequenceEnabled
                    ? `${Number(missedJobPenaltyCredits) || 0} credits${missedJobTimingEnabled ? ` after ${Number(missedJobDefaultHours) || 24}h` : ''}`
                    : 'Off'}
                </span>
              </li>
              <li className="profile-list-item">
                <span>Failed check consequence</span>
                <span className="job-status-label">
                  {failedJobCheckConsequenceEnabled
                    ? `${Number(failedJobCheckPenaltyCredits) || 0} credits`
                    : 'Off'}
                </span>
              </li>
              <li className="profile-list-item">
                <span>Pool slots per child</span>
                <span className="job-status-label">{Math.max(1, Number(maxActivePoolClaimsPerChild) || 1)}</span>
              </li>
              <li className="profile-list-item">
                <span>Educational pricing</span>
                <span className="job-status-label">{dynamicPricingEnabled ? 'On' : 'Off'}</span>
              </li>
              <li className="profile-list-item">
                <span>Achievement cards</span>
                <span className="job-status-label">{achievementsEnabled ? 'On' : 'Off'}</span>
              </li>
            </ul>
          </section>

          <div className="button-row">
            <button type="button" className="text-button onboarding-back-button" onClick={() => setCurrentStep(3)}>
              Back
            </button>
            <button type="submit" className="claim-button onboarding-primary-button" disabled={savingParentFeatures || !familyExists}>
              {savingParentFeatures ? 'Saving...' : 'Finish'}
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
        <h1 className="auth-title">Let’s set up {householdLabel}</h1>
        <p className="panel-muted">
          {parentFirstName}, this quick flow helps you set up a warm first experience for your kids.
          You can skip optional parts now and fine-tune everything later in Parent settings.
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
        </div>
      ) : null}

      {loading ? <p className="status-note">Loading onboarding...</p> : null}
      {status ? <p className="status-note">{status}</p> : null}
      {error ? <p className="status-note status-error">{error}</p> : null}
    </main>
  )
}
