import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'

import {
  getFamilyConsequenceEvents,
  getFamilyDashboard,
  getFamilyJobCheckRequests,
  getFamilyStoreData,
  getHouseholdOnboardingData,
} from '../services/familyEconomyService'
import { toQueryError, getErrorMessage } from './familyEconomyApiUtils'
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
    getFamilyDashboard: builder.query({
      async queryFn(context) {
        try {
          const result = await getFamilyDashboard(context)
          return { data: result.data }
        } catch (error) {
          return { error: toQueryError(error, 'Could not load family dashboard.') }
        }
      },
      providesTags: (_result, _error, context) => [
        { type: 'FamilyDashboard', id: context.familyId },
      ],
    }),
    getFamilyStoreData: builder.query({
      async queryFn(context) {
        try {
          const result = await getFamilyStoreData(context)
          return { data: result.data }
        } catch (error) {
          return { error: toQueryError(error, 'Could not load reward store.') }
        }
      },
      providesTags: (_result, _error, context) => [
        { type: 'FamilyStore', id: context.familyId },
      ],
    }),
    getHouseholdOnboardingData: builder.query({
      async queryFn(context) {
        try {
          const result = await getHouseholdOnboardingData(context)
          return { data: result.data }
        } catch (error) {
          return { error: toQueryError(error, 'Could not load household setup data.') }
        }
      },
      providesTags: (_result, _error, context) => [
        { type: 'HouseholdOnboarding', id: context.familyId },
      ],
    }),
    getFamilyHomeData: builder.query({
      async queryFn(context) {
        try {
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
            data: {
              dashboard: dashboardResult.data,
              store: storeResult.data,
              childProfiles: onboardingResult.data.childProfiles || [],
              family: onboardingResult.data.family || null,
            },
          }
        } catch (error) {
          return { error: toQueryError(error, 'Could not load family data right now.') }
        }
      },
      providesTags: (_result, _error, context) => [
        { type: 'FamilyHome', id: context.familyId },
        { type: 'FamilyDashboard', id: context.familyId },
        { type: 'FamilyStore', id: context.familyId },
        { type: 'HouseholdOnboarding', id: context.familyId },
      ],
    }),
    getKidProfileSessionData: builder.query({
      async queryFn(context) {
        try {
          const [dashboardResult, storeResult, checkResult, consequenceResult] = await Promise.all([
            getFamilyDashboard(context),
            getFamilyStoreData(context),
            getFamilyJobCheckRequests(context),
            getFamilyConsequenceEvents(context),
          ])

          return {
            data: {
              dashboard: dashboardResult.data,
              store: storeResult.data,
              jobCheckRequests: checkResult.data.requests || [],
              consequenceEvents: consequenceResult.data.events || [],
            },
          }
        } catch (error) {
          return { error: toQueryError(error, 'Could not load child profile data.') }
        }
      },
      providesTags: (_result, _error, context) => [
        { type: 'FamilyDashboard', id: context.familyId },
        { type: 'FamilyStore', id: context.familyId },
      ],
    }),
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
