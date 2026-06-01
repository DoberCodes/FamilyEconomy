import { createSlice } from '@reduxjs/toolkit'

import { hasFirebaseConfig } from '../lib/firebase'

function normalizeErrorText(error) {
  if (typeof error === 'string') {
    return error
  }

  if (typeof error?.message === 'string') {
    return error.message
  }

  if (typeof error?.cause?.message === 'string') {
    return error.cause.message
  }

  if (error && typeof error === 'object') {
    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== '{}') {
        return serialized
      }
    } catch {
      return 'Authentication failed.'
    }
  }

  return String(error || '')
}

const initialState = {
  loading: Boolean(hasFirebaseConfig),
  isAuthenticated: false,
  userId: null,
  userEmail: null,
  displayName: null,
  familyId: null,
  userRole: null,
  parentControlsUnlocked: false,
  activeChildProfile: null,
  authStatusError: '',
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
  resetAuthState(state) {
      state.loading = false
      state.isAuthenticated = false
      state.userId = null
      state.userEmail = null
      state.displayName = null
      state.familyId = null
      state.userRole = null
      state.parentControlsUnlocked = false
      state.activeChildProfile = null
      state.authStatusError = ''
    },
    setAuthLoading(state, action) {
      state.loading = Boolean(action.payload)
    },
    setAuthStatusError(state, action) {
      state.authStatusError = normalizeErrorText(action.payload)
    },
    setAuthProfile(state, action) {
      const profile = action.payload
      if (!profile) {
        state.isAuthenticated = false
        state.userId = null
        state.userEmail = null
        state.displayName = null
        state.familyId = null
        state.userRole = null
        state.parentControlsUnlocked = false
        state.activeChildProfile = null
        return
      }

      const resolvedUserId = profile.uid || profile.id || null
      if (!resolvedUserId) {
        state.isAuthenticated = false
        state.userId = null
        state.userEmail = null
        state.displayName = null
        state.familyId = null
        state.userRole = null
        state.parentControlsUnlocked = false
        state.activeChildProfile = null
        return
      }

      state.isAuthenticated = true
      state.userId = resolvedUserId
      state.userEmail = profile.email || state.userEmail
      state.displayName = profile.displayName || state.displayName
      state.familyId = profile.familyId || state.familyId
      state.userRole = profile.role || state.userRole
    },
    setActiveChildProfile(state, action) {
      const childProfile = action.payload
      state.activeChildProfile = childProfile || null
    },
    setParentControlsUnlocked(state, action) {
      state.parentControlsUnlocked = Boolean(action.payload)
    },
    updateProfileFields(state, action) {
      const patch = action.payload
      if (!patch) {
        return
      }
      if (typeof patch.displayName === 'string') {
        state.displayName = patch.displayName
      }
      if (typeof patch.familyId === 'string') {
        state.familyId = patch.familyId
      }
      if (typeof patch.role === 'string') {
        state.userRole = patch.role
      }
      if (typeof patch.email === 'string') {
        state.userEmail = patch.email
      }
    },
  },
})

export const {
  resetAuthState,
  setAuthLoading,
  setAuthStatusError,
  setAuthProfile,
  setActiveChildProfile,
  setParentControlsUnlocked,
  updateProfileFields,
} = authSlice.actions

export default authSlice.reducer
