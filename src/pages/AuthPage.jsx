import { useState } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

function createFamilyId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `family-${crypto.randomUUID().slice(0, 8)}`
  }

  return `family-${Math.random().toString(36).slice(2, 10)}`
}

export default function AuthPage() {
  const {
    isAuthenticated,
    loading,
    hasFirebaseConfig,
    login,
    register,
    completeProfile,
    familyId,
    userRole,
    displayName: currentDisplayName,
    authStatusError,
  } = useAuth()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [newFamilyId, setNewFamilyId] = useState(() => createFamilyId())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!hasFirebaseConfig) {
    return (
      <main className="phone-content auth-wrap">
        <section className="panel auth-card">
          <h1 className="auth-title">Firebase not configured</h1>
          <p className="panel-muted">
            Add Firebase values in your .env file, then restart the dev server.
          </p>
        </section>
      </main>
    )
  }

  if (!loading && isAuthenticated && familyId && userRole) {
    return <Navigate to="/mobile/home" replace />
  }

  async function handleCompleteProfile(event) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const resolvedDisplayName = (displayName || currentDisplayName || '').trim()

      if (!resolvedDisplayName) {
        throw new Error('Display name is required.')
      }

      await completeProfile({
        displayName: resolvedDisplayName,
        familyId: newFamilyId,
        role: 'parent',
      })
    } catch (caughtError) {
      setError(caughtError.message || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (!loading && isAuthenticated && (!familyId || !userRole)) {
    return (
      <main className="phone-content auth-wrap">
        <section className="panel auth-card">
          <p className="panel-label">Complete profile</p>
          <h1 className="auth-title">Set your family and role</h1>
          <form className="auth-form" onSubmit={handleCompleteProfile}>
            <input
              className="job-input"
              placeholder={currentDisplayName ? `Display name (${currentDisplayName})` : 'Display name'}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
            <input
              className="job-input"
              placeholder="Family ID"
              value={newFamilyId}
              onChange={(event) => setNewFamilyId(event.target.value)}
              required
              readOnly
            />
            <button
              type="button"
              className="text-button"
              onClick={() => setNewFamilyId(createFamilyId())}
            >
              Generate new family ID
            </button>
            {error ? <p className="status-note status-error">{error}</p> : null}
            <button className="claim-button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (mode === 'register') {
        await register({
          email,
          password,
          displayName,
          familyId: newFamilyId,
          role: 'parent',
        })
      } else {
        await login(email, password)
      }
    } catch (caughtError) {
      setError(caughtError.message || 'Authentication failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="phone-content auth-wrap">
      <section className="panel auth-card">
        <p className="panel-label">Family Economy</p>
        <p className="panel-muted">Parent account required. App defaults to kid-safe view after sign in.</p>
        <h1 className="auth-title">
          {mode === 'register' ? 'Create parent account' : 'Parent sign in'}
        </h1>

        {authStatusError ? <p className="status-note status-error">{authStatusError}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <input
              className="job-input"
              placeholder="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          ) : null}

          <input
            className="job-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="job-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {mode === 'register' ? (
            <>
              <input
                className="job-input"
                placeholder="Family ID"
                value={newFamilyId}
                onChange={(event) => setNewFamilyId(event.target.value)}
                required
                readOnly
              />
              <button
                type="button"
                className="text-button"
                onClick={() => setNewFamilyId(createFamilyId())}
              >
                Generate new family ID
              </button>
            </>
          ) : null}

          {error ? <p className="status-note status-error">{error}</p> : null}

          <button className="claim-button" type="submit" disabled={saving}>
            {saving
              ? 'Please wait...'
              : mode === 'register'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          className="text-button"
          onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
        >
          {mode === 'register'
            ? 'Already have an account? Sign in'
            : 'Need an account? Register'}
        </button>
      </section>
    </main>
  )
}
