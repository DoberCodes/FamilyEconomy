import { useCallback } from 'react'

import {
  getFamilyEconomyQueryErrorMessage,
  useGetFamilyHomeDataQuery,
} from '../store/familyEconomyApi'
import useFamilyActor from './useFamilyActor'

const EMPTY_DASHBOARD = Object.freeze({
  profileName: '',
  level: { current: 1, xp: 0, nextXp: 500 },
  balance: { credits: 0 },
  jobs: [],
  goals: [],
  streakDays: 0,
})

const EMPTY_STORE = Object.freeze({ rewards: [], requests: [] })
const EMPTY_ARRAY = Object.freeze([])

export default function useFamilyHomeData() {
  const actor = useFamilyActor()
  const dashboardSelectedChildId = actor.isParent ? null : actor.selectedChildId
  const query = useGetFamilyHomeDataQuery({
    familyId: actor.familyId,
    userId: actor.effectiveUserId,
    userRole: actor.effectiveRole,
    selectedChildId: dashboardSelectedChildId,
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
      const message = getFamilyEconomyQueryErrorMessage(caughtError, 'Could not load family data right now.')
      return { ok: false, data: null, error: message, cause: caughtError }
    }
  }, [refetch])

  const family = data?.family || null

  return {
    ...actor,
    loading: isLoading,
    refreshing: isFetching && !isLoading,
    error: getFamilyEconomyQueryErrorMessage(error, ''),
    refresh,
    dashboard: data?.dashboard || EMPTY_DASHBOARD,
    store: data?.store || EMPTY_STORE,
    childProfiles: data?.childProfiles || EMPTY_ARRAY,
    familyAnnouncement: family?.familyAnnouncement || '',
    familyFundEnabled: family?.familyFundEnabled !== false,
    familyFundName: family?.familyFundName || 'Community Funds',
    familyFundBalance: Number(family?.familyFundBalance) || 0,
    familyFundContributionHistory: family?.familyFundContributionHistory || EMPTY_ARRAY,
    familyDashboardTopCardsEnabled: family?.familyDashboardTopCardsEnabled !== false,
    achievementsEnabled: family?.achievementsEnabled !== false,
    familyRecognitionEnabled: family?.familyRecognitionEnabled !== false,
    customBadges: family?.customBadges || EMPTY_ARRAY,
    achievementFirstGoalTarget: Math.max(1, Number(family?.achievementFirstGoalTarget) || 1),
    achievementContributorCreditsTarget: Math.max(1, Number(family?.achievementContributorCreditsTarget) || 100),
    achievementHelperJobsTarget: Math.max(1, Number(family?.achievementHelperJobsTarget) || 3),
    achievementReadingJobsTarget: Math.max(1, Number(family?.achievementReadingJobsTarget) || 5),
    recognitionStreakDaysTarget: Math.max(1, Number(family?.recognitionStreakDaysTarget) || 3),
    recognitionHelpingHandJobsTarget: Math.max(1, Number(family?.recognitionHelpingHandJobsTarget) || 1),
    recognitionGoalGetterTarget: Math.max(1, Number(family?.recognitionGoalGetterTarget) || 1),
  }
}
