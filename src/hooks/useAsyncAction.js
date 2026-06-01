import { useCallback, useState } from 'react'

export default function useAsyncAction({ defaultErrorMessage = 'Something went wrong.' } = {}) {
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')

  const clearError = useCallback(() => {
    setError('')
  }, [])

  const run = useCallback(async (operation, options = {}) => {
    const nextBusyKey = options.busyKey || 'default'
    const errorMessage = options.errorMessage || defaultErrorMessage

    setError('')
    setBusyKey(nextBusyKey)

    try {
      const result = await operation()
      return { ok: true, result, error: null }
    } catch (caughtError) {
      const nextError = caughtError?.message || errorMessage
      setError(nextError)
      if (options.throwOnError) {
        throw caughtError
      }
      return { ok: false, result: undefined, error: nextError, cause: caughtError }
    } finally {
      setBusyKey('')
    }
  }, [defaultErrorMessage])

  return {
    busy: Boolean(busyKey),
    busyKey,
    error,
    setError,
    clearError,
    run,
  }
}
