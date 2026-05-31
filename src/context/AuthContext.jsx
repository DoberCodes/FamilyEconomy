/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
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

function mapAuthError(error) {
  const code = error?.code || ''

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Invalid email or password.'
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

  if (code === 'auth/network-request-failed') {
    return 'Network request failed. If you use an ad blocker/privacy extension, allow identitytoolkit.googleapis.com and firestore.googleapis.com.'
  }

  if (code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
    return 'Firebase API key is invalid. Check VITE_FIREBASE_API_KEY in .env.'
  }

  return error?.message || 'Authentication failed.'
}

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(hasFirebaseConfig)
  const [parentControlsUnlocked, setParentControlsUnlocked] = useState(false)
  const [activeChildProfile, setActiveChildProfileState] = useState(null)
  const [authStatusError, setAuthStatusError] = useState('')

  const parentPinStorageKey = profile?.familyId
    ? `family-economy-parent-pin:${profile.familyId}`
    : 'family-economy-parent-pin:default'
  const activeChildStorageKey = profile?.familyId
    ? `family-economy-active-child:${profile.familyId}`
    : null

  useEffect(() => {
    if (!auth || !db || !hasFirebaseConfig) {
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user)
      setAuthStatusError('')

      if (!user) {
        setProfile(null)
        setParentControlsUnlocked(false)
        setActiveChildProfileState(null)
        setLoading(false)
        return
      }

      try {
        const profileRef = doc(db, 'users', user.uid)
        const profileSnap = await getDocFromServer(profileRef)

        if (!profileSnap.exists()) {
          setProfile(null)
          setParentControlsUnlocked(false)
          setActiveChildProfileState(null)
          setLoading(false)
          return
        }

        const profileData = profileSnap.data()
        const childKey = `family-economy-active-child:${profileData.familyId}`

        setProfile(profileData)

        try {
          const stored = localStorage.getItem(childKey)
          if (!stored) {
            setActiveChildProfileState(null)
          } else {
            const parsed = JSON.parse(stored)
            setActiveChildProfileState(parsed?.id ? parsed : null)
          }
        } catch {
          setActiveChildProfileState(null)
        }

        setParentControlsUnlocked(false)
        setLoading(false)
      } catch (error) {
        setProfile(null)
        setParentControlsUnlocked(false)
        setActiveChildProfileState(null)
        setLoading(false)
        setAuthStatusError(
          'Could not load parent profile from Firestore. If you use an ad blocker/privacy extension, allow firestore.googleapis.com.',
        )
        console.error('Failed to load auth profile from Firestore:', error)
      }
    })

    return unsubscribe
  }, [])

  async function login(email, password) {
    if (!auth) {
      throw new Error('Firebase Auth is not configured.')
    }

    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      throw new Error(mapAuthError(error), { cause: error })
    }
  }

  async function register({ email, password, displayName, familyId, role }) {
    if (!auth || !db) {
      throw new Error('Firebase Auth is not configured.')
    }

    const resolvedFamilyId = normalizeFamilyId(familyId)

    let userCredential

    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password)
    } catch (error) {
      throw new Error(mapAuthError(error), { cause: error })
    }

    const userProfile = {
      email,
      displayName,
      familyId: resolvedFamilyId,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    try {
      await setDoc(doc(db, 'users', userCredential.user.uid), userProfile)
    } catch (error) {
      throw new Error(
        error?.message || 'Could not create parent profile document.',
        { cause: error },
      )
    }

    setProfile({ ...userProfile, createdAt: new Date(), updatedAt: new Date() })
  }

  async function completeProfile({ displayName, familyId, role }) {
    if (!authUser || !db) {
      throw new Error('You must be signed in to complete profile.')
    }

    const resolvedFamilyId = normalizeFamilyId(familyId)

    const patch = {
      displayName,
      familyId: resolvedFamilyId,
      role,
      email: authUser.email,
      updatedAt: serverTimestamp(),
    }

    try {
      await setDoc(doc(db, 'users', authUser.uid), patch, { merge: true })
    } catch (error) {
      throw new Error(error?.message || 'Could not save parent profile.', {
        cause: error,
      })
    }

    setProfile((current) => ({
      ...(current || {}),
      ...patch,
      updatedAt: new Date(),
    }))
  }

  async function logout() {
    if (!auth) {
      throw new Error('Firebase Auth is not configured.')
    }

    await signOut(auth)
    setParentControlsUnlocked(false)
    setActiveChildProfileState(null)
  }

  async function unlockParentWithPassword(password) {
    if (!authUser?.email || !auth) {
      throw new Error('You must be signed in as a parent to unlock controls.')
    }

    try {
      await signInWithEmailAndPassword(auth, authUser.email, password)
      setParentControlsUnlocked(true)
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
      setProfile((current) => ({
        ...(current || {}),
        ...patch,
        updatedAt: new Date(),
      }))
    } catch (error) {
      throw new Error(mapAuthError(error), { cause: error })
    }
  }

  const setActiveChildProfile = useCallback((childProfile) => {
    if (!activeChildStorageKey) {
      setActiveChildProfileState(null)
      return
    }

    if (!childProfile?.id) {
      localStorage.removeItem(activeChildStorageKey)
      setActiveChildProfileState(null)
      return
    }

    const normalized = {
      id: childProfile.id,
      displayName: childProfile.displayName || 'Kid',
      avatar: childProfile.avatar || '🧒',
    }

    localStorage.setItem(activeChildStorageKey, JSON.stringify(normalized))
    setActiveChildProfileState(normalized)
  }, [activeChildStorageKey])

  function hasParentPin() {
    return Boolean(localStorage.getItem(parentPinStorageKey))
  }

  function setParentPin(pin) {
    const value = (pin || '').trim()

    if (!/^\d{4}$/.test(value)) {
      throw new Error('Parent PIN must be exactly 4 digits.')
    }

    localStorage.setItem(parentPinStorageKey, value)
    setParentControlsUnlocked(true)
  }

  function unlockParentControls(pin) {
    const savedPin = localStorage.getItem(parentPinStorageKey)

    if (!savedPin) {
      throw new Error('Parent PIN has not been set for this family.')
    }

    if ((pin || '').trim() !== savedPin) {
      throw new Error('Incorrect Parent PIN.')
    }

    setParentControlsUnlocked(true)
  }

  function lockParentControls() {
    setParentControlsUnlocked(false)
  }

  const value = {
    loading,
    isAuthenticated: Boolean(authUser),
    hasFirebaseConfig,
    userId: authUser?.uid || null,
    userEmail: authUser?.email || null,
    displayName: profile?.displayName || null,
    familyId: profile?.familyId || null,
    userRole: profile?.role || null,
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
    setActiveChildProfile,
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
