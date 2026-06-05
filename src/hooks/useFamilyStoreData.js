import { useCallback } from 'react'

import {
  getFamilyEconomyQueryErrorMessage,
  useGetFamilyStoreDataQuery,
} from '../store/familyEconomyApi'
import useFamilyActor from './useFamilyActor'

const EMPTY_ARRAY = Object.freeze([])

export default function useFamilyStoreData(options = {}) {
  const actor = useFamilyActor()
  const selectedChildId = options.selectedChildId ?? actor.selectedChildId
  const defaultErrorMessage = options.defaultErrorMessage || 'Could not load reward store.'
  const query = useGetFamilyStoreDataQuery({
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
    rewards: data?.rewards || EMPTY_ARRAY,
    requests: data?.requests || EMPTY_ARRAY,
    fundTaxSettings: data?.fundTaxSettings || {
      familyFundEnabled: true,
      familyFundSalesTaxEnabled: false,
      familyFundSalesTaxPercent: 0,
    },
  }
}
