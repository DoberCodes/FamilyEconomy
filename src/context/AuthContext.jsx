/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
} from 'firebase/auth'
import { doc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore'

import { auth, db, hasFirebaseConfig } from '../lib/firebase'
import {
  resetAuthState,
  setActiveChildProfile,
  setAuthLoading,
  setAuthProfile,
  setAuthStatusError,
  setParentControlsUnlocked,
  updateProfileFields,
} from '../store/authSlice'
import {
  isParentAuthenticatedSnapshot,
  shouldCompleteProfileSnapshot,
  shouldRedirectToParentHomeSnapshot,
} from '../store/authSelectors'
import { isBlockedByClientSignal, normalizeErrorMessage } from '../utils/errorUtils'
import { serializeAuthProfile } from '../utils/serializeUtils'
import {
  consumeRegistrationInvite,
  validateRegistrationInvite,
} from '../services/registrationInviteService'

const AuthContext = createContext(null)

function createFamilyId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `family-${crypto.randomUUID().slice(0, 8)}`
  }

  return `family-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeFamilyId(value) {
  const fallback = createFamilyId()
  return (value || fallback)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

function isBlockedByClient(error) {
  return isBlockedByClientSignal(error)
}

function getReadableErrorMessage(error, fallback = 'Authentication failed.') {
  return normalizeErrorMessage(error, fallback)
}

function mapAuthError(error) {
  const code = error?.code || ''

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Invalid email or password.'
  }

  if (code === 'auth/invalid-api-key' || error?.message?.includes('invalid-api-key')) {
    return 'Firebase API key is invalid. Check VITE_FIREBASE_API_KEY and your Firebase project configuration.'
  }

  if (code === 'auth/app-not-authorized') {
    return 'This app is not authorized for Firebase Auth. Add this domain to Firebase Auth Authorized Domains.'
  }

  if (code === 'auth/requires-recent-login') {
    return 'Please confirm your current password and try again.'
  }

  if (code === 'auth/user-not-found') {
    return 'No account found for that email. Create a parent account first.'
  }

  if (code === 'auth/email-already-in-use') {
    return 'That email is already in use. Try signing in instead.'
  }

  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.'
  }

  if (code === 'auth/weak-password') {
    return 'Password is too weak. Use at least 6 characters.'
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Email/password sign-in is disabled in Firebase Auth. Enable it in Firebase Console.'
  }

  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized for Firebase Auth. Add localhost to Authorized Domains in Firebase Auth settings.'
  }

  if (code === 'auth/network-request-failed' || isBlockedByClient(error)) {
    return 'Network request failed. If you use an ad blocker/privacy extension, allow identitytoolkit.googleapis.com and firestore.googleapis.com.'
  }

  if (code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.' || error?.message?.includes('api key is invalid')) {
    return 'Firebase API key is invalid. Check VITE_FIREBASE_API_KEY in .env.'
  }

  const fallbackMessage = getReadableErrorMessage(error, 'Authentication failed.')
  const withCode = code ? `${fallbackMessage} (${code})` : fallbackMessage
  return withCode
}

export function AuthProvider({ children }) {
  const [authUser, setAuthUserState] = useState(null)
  const { loading, isAuthenticated, userId, userEmail, displayName, familyId, userRole, parentControlsUnlocked, activeChildProfile, authStatusError } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const AUTH_INIT_TIMEOUT_MS = 7000
  const PROFILE_LOAD_TIMEOUT_MS = 7000
  const authSnapshot = {
    loading,
    isAuthenticated,
    familyId,
    userRole,
  }
  const isParentAuthenticated = isParentAuthenticatedSnapshot(authSnapshot)
  const shouldRedirectToParentHome = shouldRedirectToParentHomeSnapshot(authSnapshot)
  const shouldCompleteProfile = shouldCompleteProfileSnapshot(authSnapshot)

  const parentPinStorageKey = familyId
    ? `family-economy-parent-pin:${familyId}`
    : 'family-economy-parent-pin:default'
  const activeChildStorageKey = familyId
    ? `family-economy-active-child:${familyId}`
    : null

  useEffect(() => {
    if (!auth || !db || !hasFirebaseConfig) {
      dispatch(setAuthLoading(false))
      return undefined
    }

    const authInitTimer = window.setTimeout(() => {
      dispatch(setAuthLoading(false))
    }, AUTH_INIT_TIMEOUT_MS)

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUserState(user)
      dispatch(setAuthStatusError(''))

      if (!user) {
        clearTimeout(authInitTimer)
        dispatch(resetAuthState())
        return
      }

      const basicAuthProfile = serializeAuthProfile(user, user.uid)
      dispatch(setAuthProfile(basicAuthProfile))

      let profileTimeoutId
      try {
        const profileRef = doc(db, 'users', user.uid)
        const profileSnap = await Promise.race([
          getDocFromServer(profileRef),
          new Promise((_, reject) => {
            profileTimeoutId = window.setTimeout(() => {
              reject(new Error('Profile load timeout while reading users/{uid}.'))
            }, PROFILE_LOAD_TIMEOUT_MS)
          }),
        ])

        if (!profileSnap.exists()) {
          dispatch(setParentControlsUnlocked(false))
          dispatch(setActiveChildProfile(null))
          return
        }

        const profileData = profileSnap.data()
        const safeProfile = serializeAuthProfile(profileData, profileSnap.id)
        const childKey = `family-economy-active-child:${profileData.familyId}`

        dispatch(setAuthProfile(safeProfile))

        try {
          const stored = localStorage.getItem(childKey)
          if (!stored) {
            dispatch(setActiveChildProfile(null))
          } else {
            const parsed = JSON.parse(stored)
            dispatch(setActiveChildProfile(parsed?.id ? parsed : null))
          }
        } catch {
          dispatch(setActiveChildProfile(null))
        }

        dispatch(setParentControlsUnlocked(false))
      } catch (error) {
        const blockedByClient = isBlockedByClient(error)
        dispatch(setParentControlsUnlocked(false))
        dispatch(setActiveChildProfile(null))
        dispatch(setAuthStatusError(
          blockedByClient
            ? 'Your browser is blocking Firebase requests. Allow firestore.googleapis.com and identitytoolkit.googleapis.com in your ad blocker/privacy extension.'
            : 'Could not load parent profile from Firestore. If you use an ad blocker/privacy extension, allow firestore.googleapis.com.',
        ))
        console.error('Failed to load auth profile from Firestore:', error)
      } finally {
        if (profileTimeoutId) {
          clearTimeout(profileTimeoutId)
        }
        clearTimeout(authInitTimer)
        dispatch(setAuthLoading(false))
      }
    })

    return () => {
      clearTimeout(authInitTimer)
      unsubscribe()
    }
  }, [dispatch, AUTH_INIT_TIMEOUT_MS, PROFILE_LOAD_TIMEOUT_MS])

  async function login(email, password) {
    if (!auth) {
      throw new Error('Firebase Auth is not configured.')
    }

    dispatch(setAuthStatusError(''))

    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      dispatch(setAuthStatusError(mapAuthError(error)))
      console.error('Login failed:', error)
      throw new Error(mapAuthError(error), { cause: error })
    }
  }

  async function register({ email, password, displayName, familyId, role, invitationCode }) {
    if (!auth || !db) {
      throw new Error('Firebase Auth is not configured.')
    }

    dispatch(setAuthStatusError(''))

    const resolvedFamilyId = normalizeFamilyId(familyId)
    const normalizedInviteCode = await validateRegistrationInvite(invitationCode)

    let userCredential

    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password)
    } catch (error) {
      dispatch(setAuthStatusError(mapAuthError(error)))
      console.error('Registration failed:', error)
      throw new Error(mapAuthError(error), { cause: error })
    }

    const userProfile = {
      email,
      displayName,
      familyId: resolvedFamilyId,
      role,
      registrationInviteCode: normalizedInviteCode,
      registrationInviteUsedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    try {
      await setDoc(doc(db, 'users', userCredential.user.uid), userProfile)
      await consumeRegistrationInvite(normalizedInviteCode, userCredential.user.uid)
    } catch (error) {
      dispatch(setAuthStatusError(getReadableErrorMessage(error, 'Could not create parent profile document.')))
      if (isBlockedByClient(error)) {
        throw new Error(
          'Your browser is blocking Firebase requests. Allow firestore.googleapis.com and identitytoolkit.googleapis.com in your ad blocker/privacy extension.',
          { cause: error },
        )
      }

      throw new Error(
        error?.message || 'Could not create parent profile document.',
        { cause: error },
      )
    }

    dispatch(setAuthProfile({
      id: userCredential.user.uid,
      email,
      displayName,
      familyId: resolvedFamilyId,
      role,
    }))
  }

  async function completeProfile({ displayName, familyId, role, invitationCode }) {
    if (!authUser || !db) {
      throw new Error('You must be signed in to complete profile.')
    }

    dispatch(setAuthStatusError(''))

    const resolvedFamilyId = normalizeFamilyId(familyId)
    const normalizedInviteCode = invitationCode ? await validateRegistrationInvite(invitationCode) : ''

    const patch = {
      displayName,
      familyId: resolvedFamilyId,
      role,
      email: authUser.email,
      updatedAt: serverTimestamp(),
    }

    if (normalizedInviteCode) {
      patch.registrationInviteCode = normalizedInviteCode
      patch.registrationInviteUsedAt = serverTimestamp()
    }

    try {
      await setDoc(doc(db, 'users', authUser.uid), patch, { merge: true })
      if (normalizedInviteCode) {
        await consumeRegistrationInvite(normalizedInviteCode, authUser.uid)
      }
    } catch (error) {
      dispatch(setAuthStatusError(getReadableErrorMessage(error, 'Could not save parent profile.')))
      throw new Error(error?.message || 'Could not save parent profile.', {
        cause: error,
      })
    }

    dispatch(updateProfileFields({
      displayName,
      familyId: resolvedFamilyId,
      role,
      email: authUser.email,
    }))
  }

  async function logout() {
    if (!auth) {
      throw new Error('Firebase Auth is not configured.')
    }

    await signOut(auth)
    dispatch(setParentControlsUnlocked(false))
    dispatch(setActiveChildProfile(null))
  }

  async function unlockParentWithPassword(password) {
    if (!authUser?.email || !auth) {
      throw new Error('You must be signed in as a parent to unlock controls.')
    }

    try {
      await signInWithEmailAndPassword(auth, authUser.email, password)
      dispatch(setParentControlsUnlocked(true))
    } catch (error) {
      throw new Error(mapAuthError(error), { cause: error })
    }
  }

  async function updateParentPassword(currentPassword, nextPassword) {
    if (!authUser?.email || !auth) {
      throw new Error('You must be signed in as a parent to update password.')
    }

    const normalizedCurrentPassword = String(currentPassword || '').trim()
    const normalizedNextPassword = String(nextPassword || '').trim()

    if (!normalizedCurrentPassword) {
      throw new Error('Current password is required.')
    }

    if (normalizedNextPassword.length < 6) {
      throw new Error('New password must be at least 6 characters.')
    }

    try {
      await signInWithEmailAndPassword(auth, authUser.email, normalizedCurrentPassword)
      await updatePassword(auth.currentUser, normalizedNextPassword)
    } catch (error) {
      throw new Error(mapAuthError(error), { cause: error })
    }
  }

  async function updateParentEmail(currentPassword, nextEmail) {
    if (!authUser?.email || !auth || !db) {
      throw new Error('You must be signed in as a parent to update email.')
    }

    const normalizedCurrentPassword = String(currentPassword || '').trim()
    const normalizedNextEmail = String(nextEmail || '').trim().toLowerCase()

    if (!normalizedCurrentPassword) {
      throw new Error('Current password is required.')
    }

    if (!normalizedNextEmail) {
      throw new Error('New email is required.')
    }

    try {
      await signInWithEmailAndPassword(auth, authUser.email, normalizedCurrentPassword)
      await updateEmail(auth.currentUser, normalizedNextEmail)

      const patch = {
        email: normalizedNextEmail,
        updatedAt: serverTimestamp(),
      }

      await setDoc(doc(db, 'users', authUser.uid), patch, { merge: true })
      dispatch(updateProfileFields({
        ...patch,
        updatedAt: new Date(),
      }))
    } catch (error) {
      throw new Error(mapAuthError(error), { cause: error })
    }
  }

  const setActiveChildProfileLocal = useCallback((childProfile) => {
    if (!activeChildStorageKey) {
      dispatch(setActiveChildProfile(null))
      return
    }

    if (!childProfile?.id) {
      localStorage.removeItem(activeChildStorageKey)
      dispatch(setActiveChildProfile(null))
      return
    }

    const normalized = {
      id: childProfile.id,
      displayName: childProfile.displayName || 'Kid',
      avatar: childProfile.avatar || '🧒',
    }

    localStorage.setItem(activeChildStorageKey, JSON.stringify(normalized))
    dispatch(setActiveChildProfile(normalized))
  }, [activeChildStorageKey, dispatch])

  function hasParentPin() {
    return Boolean(localStorage.getItem(parentPinStorageKey))
  }

  function setParentPin(pin) {
    const value = (pin || '').trim()

    if (!/^\d{4}$/.test(value)) {
      throw new Error('Parent PIN must be exactly 4 digits.')
    }

    localStorage.setItem(parentPinStorageKey, value)
    dispatch(setParentControlsUnlocked(true))
  }

  function unlockParentControls(pin) {
    const savedPin = localStorage.getItem(parentPinStorageKey)

    if (!savedPin) {
      throw new Error('Parent PIN has not been set for this family.')
    }

    if ((pin || '').trim() !== savedPin) {
      throw new Error('Incorrect Parent PIN.')
    }

    dispatch(setParentControlsUnlocked(true))
  }

  function lockParentControls() {
    dispatch(setParentControlsUnlocked(false))
  }

  const value = {
    loading,
    isAuthenticated,
    isParentAuthenticated,
    shouldRedirectToParentHome,
    shouldCompleteProfile,
    hasFirebaseConfig,
    userId,
    userEmail,
    displayName,
    familyId,
    userRole,
    parentControlsUnlocked,
    activeChildProfile,
    authStatusError,
    hasParentPin: hasParentPin(),
    login,
    register,
    completeProfile,
    setParentPin,
    unlockParentControls,
    unlockParentWithPassword,
    updateParentPassword,
    updateParentEmail,
    lockParentControls,
    setActiveChildProfile: setActiveChildProfileLocal,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
