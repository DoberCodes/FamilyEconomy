import { useCallback, useEffect, useState } from 'react'

import {
  getFamilyDashboard,
  getFamilyStoreData,
  getHouseholdOnboardingData,
} from '../services/familyEconomyService'
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
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const dashboardSelectedChildId = actor.isParent ? null : actor.selectedChildId

  const fetchHomeData = useCallback(async () => {
    const [dashboardResult, storeResult, onboardingResult] = await Promise.all([
      getFamilyDashboard({
        familyId: actor.familyId,
        userId: actor.effectiveUserId,
        userRole: actor.effectiveRole,
        selectedChildId: dashboardSelectedChildId,
      }),
      getFamilyStoreData({
        familyId: actor.familyId,
        userId: actor.effectiveUserId,
        userRole: actor.effectiveRole,
        selectedChildId: dashboardSelectedChildId,
      }),
      getHouseholdOnboardingData({
        familyId: actor.familyId,
        userId: actor.effectiveUserId,
        userRole: actor.effectiveRole,
      }),
    ])

    return {
      dashboard: dashboardResult.data,
      store: storeResult.data,
      childProfiles: onboardingResult.data.childProfiles || EMPTY_ARRAY,
      family: onboardingResult.data.family || null,
    }
  }, [actor.effectiveRole, actor.effectiveUserId, actor.familyId, dashboardSelectedChildId])

  const loadHomeData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
    }
    setError('')

    try {
      const nextData = await fetchHomeData()
      setData(nextData)
      return { ok: true, data: nextData, error: null }
    } catch (caughtError) {
      const message = caughtError?.message || 'Could not load family data right now.'
      setData(null)
      setError(message)
      return { ok: false, data: null, error: message, cause: caughtError }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [fetchHomeData])

  useEffect(() => {
    let active = true

    async function run() {
      setLoading(true)
      setError('')

      try {
        const nextData = await fetchHomeData()
        if (active) {
          setData(nextData)
        }
      } catch (caughtError) {
        if (active) {
          setData(null)
          setError(caughtError?.message || 'Could not load family data right now.')
        }
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
  }, [fetchHomeData])

  const family = data?.family || null

  return {
    ...actor,
    loading,
    error,
    refresh: loadHomeData,
    dashboard: data?.dashboard || EMPTY_DASHBOARD,
    store: data?.store || EMPTY_STORE,
    childProfiles: data?.childProfiles || EMPTY_ARRAY,
    familyDashboardTopCardsEnabled: family?.familyDashboardTopCardsEnabled !== false,
    achievementsEnabled: family?.achievementsEnabled !== false,
    familyRecognitionEnabled: family?.familyRecognitionEnabled !== false,
  }
}
