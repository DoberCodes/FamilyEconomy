import {
  acceptRewardRequestTerms,
  acceptSavingsGoalCounter,
  cancelSavingsGoal,
  claimApprovedRewardProposal,
  claimJob,
  contributeToSavingsGoal,
  createChildProfile,
  createCustomRewardRequest,
  createGoal,
  createHousehold,
  createJob,
  createReward,
  declineRewardRequestTerms,
  declineSavingsGoalCounter,
  requestJobCheck,
  requestReward,
  setChildSessionCode,
} from '../services/familyEconomyService'
import { familyMutation } from './familyEconomyApiUtils'

const DASHBOARD_TAGS = ['FamilyDashboard', 'FamilyHome']
const HOUSEHOLD_TAGS = ['FamilyHome', 'HouseholdOnboarding']
const STORE_TAGS = ['FamilyDashboard', 'FamilyHome', 'FamilyStore']

export function buildFamilyMutationEndpoints(builder) {
  return {
    claimJob: familyMutation(
      builder,
      ({ jobId, context }) => claimJob(jobId, context),
      'Could not claim job.',
      DASHBOARD_TAGS,
    ),
    requestJobCheck: familyMutation(
      builder,
      ({ job, context }) => requestJobCheck(job, context),
      'Could not request a job check.',
      DASHBOARD_TAGS,
    ),
    createHousehold: familyMutation(
      builder,
      ({ household, context }) => createHousehold(household, context),
      'Could not save household details.',
      HOUSEHOLD_TAGS,
    ),
    createChildProfile: familyMutation(
      builder,
      ({ childProfile, context }) => createChildProfile(childProfile, context),
      'Could not add child profile.',
      HOUSEHOLD_TAGS,
    ),
    createJob: familyMutation(
      builder,
      ({ jobPayload, context }) => createJob(jobPayload, context),
      'Could not add starter job.',
      ['FamilyDashboard', 'FamilyHome', 'HouseholdOnboarding'],
    ),
    createReward: familyMutation(
      builder,
      ({ rewardPayload, context }) => createReward(rewardPayload, context),
      'Could not add starter reward.',
      ['FamilyStore', 'FamilyHome', 'HouseholdOnboarding'],
    ),
    requestReward: familyMutation(
      builder,
      ({ reward, context }) => requestReward(reward, context),
      'Could not submit reward request.',
      STORE_TAGS,
    ),
    createCustomRewardRequest: familyMutation(
      builder,
      ({ requestPayload, context }) => createCustomRewardRequest(requestPayload, context),
      'Could not request this reward yet.',
      STORE_TAGS,
    ),
    acceptRewardRequestTerms: familyMutation(
      builder,
      ({ requestId, context }) => acceptRewardRequestTerms(requestId, context),
      'Could not accept these reward terms.',
      STORE_TAGS,
    ),
    declineRewardRequestTerms: familyMutation(
      builder,
      ({ requestId, context }) => declineRewardRequestTerms(requestId, context),
      'Could not decline these reward terms.',
      STORE_TAGS,
    ),
    claimApprovedRewardProposal: familyMutation(
      builder,
      ({ requestId, context }) => claimApprovedRewardProposal(requestId, context),
      'Could not claim this approved reward yet.',
      STORE_TAGS,
    ),
    createGoal: familyMutation(
      builder,
      ({ goalPayload, context }) => createGoal(goalPayload, context),
      'Could not request savings goal.',
      DASHBOARD_TAGS,
    ),
    contributeToSavingsGoal: familyMutation(
      builder,
      ({ goalId, amount, context }) => contributeToSavingsGoal(goalId, amount, context),
      'Could not move credits into savings.',
      DASHBOARD_TAGS,
    ),
    cancelSavingsGoal: familyMutation(
      builder,
      ({ goalId, context }) => cancelSavingsGoal(goalId, context),
      'Could not cancel savings goal.',
      DASHBOARD_TAGS,
    ),
    acceptSavingsGoalCounter: familyMutation(
      builder,
      ({ goalId, context }) => acceptSavingsGoalCounter(goalId, context),
      'Could not accept this counter offer.',
      DASHBOARD_TAGS,
    ),
    declineSavingsGoalCounter: familyMutation(
      builder,
      ({ goalId, context }) => declineSavingsGoalCounter(goalId, context),
      'Could not decline this counter offer.',
      DASHBOARD_TAGS,
    ),
    setChildSessionCode: familyMutation(
      builder,
      ({ childId, sessionCode, context }) => setChildSessionCode(childId, sessionCode, context),
      'Could not set child session code.',
      HOUSEHOLD_TAGS,
    ),
  }
}
