import { useCallback, useEffect, useState } from 'react'

import useFamilyActor from './useFamilyActor'

export default function useFamilyResource(loadResource, options = {}) {
  const actor = useFamilyActor()
  const selectedChildId = options.selectedChildId ?? actor.selectedChildId
  const defaultErrorMessage = options.defaultErrorMessage || 'Could not load family data.'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const buildContext = useCallback(() => ({
    familyId: actor.familyId,
    userId: actor.effectiveUserId,
    userRole: actor.effectiveRole,
    selectedChildId,
  }), [actor.familyId, actor.effectiveRole, actor.effectiveUserId, selectedChildId])

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
    }
    setError('')

    try {
      const result = await loadResource(buildContext())
      setData(result.data)
      return { ok: true, data: result.data, error: null }
    } catch (caughtError) {
      const message = caughtError?.message || defaultErrorMessage
      setError(message)
      return { ok: false, data: null, error: message, cause: caughtError }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [buildContext, defaultErrorMessage, loadResource])

  useEffect(() => {
    let active = true

    async function run() {
      setLoading(true)
      setError('')

      try {
        const result = await loadResource(buildContext())
        if (active) {
          setData(result.data)
        }
      } catch (caughtError) {
        if (active) {
          setError(caughtError?.message || defaultErrorMessage)
          setData(null)
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
  }, [buildContext, defaultErrorMessage, loadResource])

  return {
    ...actor,
    data,
    loading,
    error,
    refresh: load,
  }
}
