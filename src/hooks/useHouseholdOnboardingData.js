import { useCallback } from 'react'

import {
  getFamilyEconomyQueryErrorMessage,
  useGetHouseholdOnboardingDataQuery,
} from '../store/familyEconomyApi'
import useFamilyActor from './useFamilyActor'

const EMPTY_ARRAY = Object.freeze([])

export default function useHouseholdOnboardingData(options = {}) {
  const actor = useFamilyActor()
  const selectedChildId = options.selectedChildId ?? actor.selectedChildId
  const defaultErrorMessage = options.defaultErrorMessage || 'Could not load household setup data.'
  const query = useGetHouseholdOnboardingDataQuery({
    familyId: actor.familyId,
    userId: actor.effectiveUserId,
    userRole: actor.effectiveRole,
    selectedChildId,
  })
  const {
    data,
    error,
    isFetching,
    isLoading,
    refetch,
  } = query

  const refresh = useCallback(async () => {
    try {
      const nextData = await refetch().unwrap()
      return { ok: true, data: nextData, error: null }
    } catch (caughtError) {
      const message = getFamilyEconomyQueryErrorMessage(caughtError, defaultErrorMessage)
      return { ok: false, data: null, error: message, cause: caughtError }
    }
  }, [defaultErrorMessage, refetch])

  return {
    ...actor,
    selectedChildId,
    data: data || null,
    loading: isLoading,
    refreshing: isFetching && !isLoading,
    error: getFamilyEconomyQueryErrorMessage(error, ''),
    refresh,
    familyExists: Boolean(data?.familyExists),
    family: data?.family || null,
    childProfiles: data?.childProfiles || EMPTY_ARRAY,
    jobs: data?.jobs || EMPTY_ARRAY,
    rewards: data?.rewards || EMPTY_ARRAY,
  }
}
