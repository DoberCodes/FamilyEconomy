export function normalizeErrorMessage(error, fallback = '') {
  if (typeof error === 'string' && error.trim()) {
    return error.trim()
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim()
  }

  if (typeof error?.cause?.message === 'string' && error.cause.message.trim()) {
    return error.cause.message.trim()
  }

  if (error && typeof error === 'object') {
    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== '{}') {
        return serialized
      }
    } catch {
      return fallback
    }
  }

  return fallback
}

export function isBlockedByClientSignal(value) {
  const text = normalizeErrorMessage(value, '').toLowerCase()
  return text.includes('err_blocked_by_client') || text.includes('blocked by client')
}
