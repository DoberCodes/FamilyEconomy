import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'

import {
  getFamilyConsequenceEvents,
  getFamilyDashboard,
  getFamilyFeedbackEntries,
  getFamilyJobCheckRequests,
  getFamilyStoreData,
  getHouseholdOnboardingData,
} from '../services/familyEconomyService'
import { familyQuery, getErrorMessage } from './familyEconomyApiUtils'
import { buildFamilyMutationEndpoints } from './familyEconomyMutationEndpoints'

async function optionalFamilyQuery(loadData, fallbackData) {
  try {
    return await loadData()
  } catch (error) {
    if (error?.code === 'permission-denied' || error?.message === 'Missing or insufficient permissions.') {
      return { data: fallbackData }
    }
    throw error
  }
}

export const familyEconomyApi = createApi({
  reducerPath: 'familyEconomyApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: [
    'FamilyDashboard',
    'FamilyFeedback',
    'FamilyHome',
    'FamilyJobChecks',
    'FamilyConsequences',
    'FamilyStore',
    'HouseholdOnboarding',
    'ParentCommandCenter',
  ],
  endpoints: (builder) => ({
    getFamilyDashboard: familyQuery(
      builder,
      async (context) => (await getFamilyDashboard(context)).data,
      'Could not load family dashboard.',
      ['FamilyDashboard'],
    ),
    getFamilyStoreData: familyQuery(
      builder,
      async (context) => (await getFamilyStoreData(context)).data,
      'Could not load reward store.',
      ['FamilyStore'],
    ),
    getHouseholdOnboardingData: familyQuery(
      builder,
      async (context) => (await getHouseholdOnboardingData(context)).data,
      'Could not load household setup data.',
      ['HouseholdOnboarding'],
    ),
    getFamilyHomeData: familyQuery(
      builder,
      async (context) => {
        const [dashboardResult, storeResult, onboardingResult] = await Promise.all([
          getFamilyDashboard(context),
          getFamilyStoreData(context),
          getHouseholdOnboardingData({
            familyId: context.familyId,
            userId: context.userId,
            userRole: context.userRole,
          }),
        ])

        return {
          dashboard: dashboardResult.data,
          store: storeResult.data,
          childProfiles: onboardingResult.data.childProfiles || [],
          family: onboardingResult.data.family || null,
        }
      },
      'Could not load family data right now.',
      ['FamilyHome', 'FamilyDashboard', 'FamilyStore', 'HouseholdOnboarding'],
    ),
    getKidProfileSessionData: familyQuery(
      builder,
      async (context) => {
        const [dashboardResult, storeResult, checkResult, consequenceResult] = await Promise.all([
          getFamilyDashboard(context),
          getFamilyStoreData(context),
          getFamilyJobCheckRequests(context),
          getFamilyConsequenceEvents(context),
        ])

        return {
          dashboard: dashboardResult.data,
          store: storeResult.data,
          jobCheckRequests: checkResult.data.requests || [],
          consequenceEvents: consequenceResult.data.events || [],
        }
      },
      'Could not load child profile data.',
      ['FamilyDashboard', 'FamilyStore', 'FamilyJobChecks', 'FamilyConsequences'],
    ),
    getParentCommandCenterData: familyQuery(
      builder,
      async (context) => {
        const parentContext = {
          ...context,
          selectedChildId: null,
        }
        const [dashboardResult, storeResult, checkResult, consequenceResult, feedbackResult] = await Promise.all([
          optionalFamilyQuery(() => getFamilyDashboard(parentContext), { jobs: [], goals: [] }),
          optionalFamilyQuery(() => getFamilyStoreData(parentContext), { rewards: [], requests: [] }),
          optionalFamilyQuery(() => getFamilyJobCheckRequests(parentContext), { requests: [] }),
          optionalFamilyQuery(() => getFamilyConsequenceEvents(parentContext), { events: [] }),
          optionalFamilyQuery(() => getFamilyFeedbackEntries(parentContext), { entries: [] }),
        ])

        return {
          jobs: dashboardResult.data.jobs || [],
          goals: dashboardResult.data.goals || [],
          rewards: storeResult.data.rewards || [],
          rewardRequests: storeResult.data.requests || [],
          jobCheckRequests: checkResult.data.requests || [],
          consequenceEvents: consequenceResult.data.events || [],
          feedbackEntries: feedbackResult.data.entries || [],
        }
      },
      'Could not load parent command center data.',
      [
        'ParentCommandCenter',
        'FamilyDashboard',
        'FamilyStore',
        'FamilyJobChecks',
        'FamilyConsequences',
        'FamilyFeedback',
      ],
    ),
    ...buildFamilyMutationEndpoints(builder),
  }),
})

export const {
  useAcceptRewardRequestTermsMutation,
  useAcceptSavingsGoalCounterMutation,
  useApproveSavingsGoalCompletionMutation,
  useCancelSavingsGoalMutation,
  useClearChildSessionCodeMutation,
  useCreateChildProfileMutation,
  useClaimJobMutation,
  useClaimApprovedRewardProposalMutation,
  useCreateCustomRewardRequestMutation,
  useCreateFeedbackEntryMutation,
  useCreateGoalMutation,
  useCreateHouseholdMutation,
  useCreateJobMutation,
  useCreateRewardMutation,
  useDeleteChildProfileMutation,
  useDeclineRewardRequestTermsMutation,
  useDeclineSavingsGoalCounterMutation,
  useDismissAllRewardNotificationsMutation,
  useDismissRewardNotificationMutation,
  useFulfillRewardRequestMutation,
  useContributeSavingsAccountToFamilyFundMutation,
  useContributeSavingsAccountToSavingsGoalMutation,
  useContributeToSavingsGoalMutation,
  useContributeToFamilyFundMutation,
  useGetFamilyDashboardQuery,
  useGetFamilyHomeDataQuery,
  useGetFamilyStoreDataQuery,
  useGetHouseholdOnboardingDataQuery,
  useGetParentCommandCenterDataQuery,
  useLazyGetHouseholdOnboardingDataQuery,
  useLazyGetKidProfileSessionDataQuery,
  useMarkJobAsMissedMutation,
  useMoveSavingsAccountToWalletMutation,
  useMoveWalletCreditsToSavingsAccountMutation,
  useRequestJobCheckMutation,
  useRequestRewardMutation,
  useResolveRewardRequestAsPoolMutation,
  useReviewJobCheckRequestMutation,
  useReviewRewardRequestMutation,
  useReviewSavingsGoalRequestMutation,
  useSetChildAllowSessionCodeMutation,
  useSetChildSessionCodeMutation,
  useSetChildSessionSecurityMutation,
  useSetFamilyAnnouncementMutation,
  useUpdateChildProfileMutation,
  useUpdateJobMutation,
  useUpdateRewardMutation,
} = familyEconomyApi

export { getErrorMessage as getFamilyEconomyQueryErrorMessage }
