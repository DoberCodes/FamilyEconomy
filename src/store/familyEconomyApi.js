import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'

import {
  getFamilyConsequenceEvents,
  getFamilyDashboard,
  getFamilyJobCheckRequests,
  getFamilyStoreData,
  getHouseholdOnboardingData,
} from '../services/familyEconomyService'
import { familyQuery, toQueryError, getErrorMessage } from './familyEconomyApiUtils'
import { buildFamilyMutationEndpoints } from './familyEconomyMutationEndpoints'

export const familyEconomyApi = createApi({
  reducerPath: 'familyEconomyApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: [
    'FamilyDashboard',
    'FamilyHome',
    'FamilyStore',
    'HouseholdOnboarding',
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
      ['FamilyDashboard', 'FamilyStore'],
    ),
    ...buildFamilyMutationEndpoints(builder),
  }),
})

export const {
  useAcceptRewardRequestTermsMutation,
  useAcceptSavingsGoalCounterMutation,
  useCancelSavingsGoalMutation,
  useCreateChildProfileMutation,
  useClaimJobMutation,
  useClaimApprovedRewardProposalMutation,
  useCreateCustomRewardRequestMutation,
  useCreateGoalMutation,
  useCreateHouseholdMutation,
  useCreateJobMutation,
  useCreateRewardMutation,
  useDeclineRewardRequestTermsMutation,
  useDeclineSavingsGoalCounterMutation,
  useContributeToSavingsGoalMutation,
  useGetFamilyDashboardQuery,
  useGetFamilyHomeDataQuery,
  useGetFamilyStoreDataQuery,
  useGetHouseholdOnboardingDataQuery,
  useLazyGetHouseholdOnboardingDataQuery,
  useLazyGetKidProfileSessionDataQuery,
  useRequestJobCheckMutation,
  useRequestRewardMutation,
  useSetChildSessionCodeMutation,
} = familyEconomyApi

export { getErrorMessage as getFamilyEconomyQueryErrorMessage }
