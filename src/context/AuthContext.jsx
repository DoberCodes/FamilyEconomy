/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

import { auth, db, hasFirebaseConfig } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(hasFirebaseConfig)
  const [parentControlsUnlocked, setParentControlsUnlocked] = useState(false)

  const parentPinStorageKey = profile?.familyId
    ? `family-economy-parent-pin:${profile.familyId}`
    : 'family-economy-parent-pin:default'

  useEffect(() => {
    if (!auth || !db || !hasFirebaseConfig) {
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user)

      if (!user) {
        setProfile(null)
        setParentControlsUnlocked(false)
        setLoading(false)
        return
      }

      const profileRef = doc(db, 'users', user.uid)
      const profileSnap = await getDoc(profileRef)

      if (!profileSnap.exists()) {
        setProfile(null)
        setParentControlsUnlocked(false)
        setLoading(false)
        return
      }

      setProfile(profileSnap.data())
      setParentControlsUnlocked(false)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  async function login(email, password) {
    if (!auth) {
      throw new Error('Firebase Auth is not configured.')
    }

    await signInWithEmailAndPassword(auth, email, password)
  }

  async function register({ email, password, displayName, familyId, role }) {
    if (!auth || !db) {
      throw new Error('Firebase Auth is not configured.')
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    )

    const userProfile = {
      email,
      displayName,
      familyId,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    await setDoc(doc(db, 'users', userCredential.user.uid), userProfile)
    setProfile({ ...userProfile, createdAt: new Date(), updatedAt: new Date() })
  }

  async function completeProfile({ displayName, familyId, role }) {
    if (!authUser || !db) {
      throw new Error('You must be signed in to complete profile.')
    }

    const patch = {
      displayName,
      familyId,
      role,
      email: authUser.email,
      updatedAt: serverTimestamp(),
    }

    await setDoc(doc(db, 'users', authUser.uid), patch, { merge: true })
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
  }

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
    hasParentPin: hasParentPin(),
    login,
    register,
    completeProfile,
    setParentPin,
    unlockParentControls,
    lockParentControls,
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
