import { toDateValue } from './dateUtils'

export function serializeDate(value) {
  const date = toDateValue(value)
  return date ? date.toISOString() : null
}

export function serializeAuthProfile(profile, id = null) {
  if (!profile || typeof profile !== 'object') {
    return null
  }

  return {
    id: String(id || profile.uid || profile.id || '').trim() || null,
    email: String(profile.email || '').trim() || null,
    displayName: String(profile.displayName || '').trim() || null,
    familyId: String(profile.familyId || '').trim() || null,
    role: profile.role || null,
    createdAt: serializeDate(profile.createdAt),
    updatedAt: serializeDate(profile.updatedAt),
  }
}
