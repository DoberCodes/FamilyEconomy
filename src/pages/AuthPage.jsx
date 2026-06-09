import { useState } from 'react'
import { Navigate } from 'react-router-dom'

import SplashScreen from '../components/shared/SplashScreen'
import { useAuth } from '../context/AuthContext'
import { isBlockedByClientSignal, normalizeErrorMessage } from '../utils/errorUtils'

const authLogoSrc = `${import.meta.env.BASE_URL}verticalnotag.png`
const registrationInviteCode = String(import.meta.env.VITE_REGISTRATION_INVITE_CODE || '').trim()
const demoParentEmail = String(import.meta.env.VITE_DEMO_PARENT_EMAIL || 'demo@familyeconomy.app').trim()
const demoParentPassword = String(import.meta.env.VITE_DEMO_PARENT_PASSWORD || 'FamilyDemo123!').trim()
const showDemoLogin = import.meta.env.VITE_SHOW_DEMO_LOGIN !== 'false'

function createFamilyId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `family-${crypto.randomUUID().slice(0, 8)}`
  }

  return `family-${Math.random().toString(36).slice(2, 10)}`
}

export default function AuthPage() {
  const {
    // isAuthenticated,
    loading,
    hasFirebaseConfig,
    login,
    register,
    completeProfile,
    shouldRedirectToParentHome,
    shouldCompleteProfile,
    // familyId,
    // userRole,
    displayName: currentDisplayName,
    authStatusError,
  } = useAuth()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [newFamilyId, setNewFamilyId] = useState(() => createFamilyId())
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [registrationUnlocked, setRegistrationUnlocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const authStatusText = normalizeErrorMessage(authStatusError, '')
  const localErrorText = normalizeErrorMessage(error, '')
  const blockedByClient =
    isBlockedByClientSignal(authStatusText) || isBlockedByClientSignal(localErrorText)
  const registrationInviteEnabled = registrationInviteCode.length > 0

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

  if (shouldRedirectToParentHome) {
    return <Navigate to="/mobile/home" replace />
  }

  if (loading) {
    return <SplashScreen message="Loading parent sign in..." />
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
      setError(normalizeErrorMessage(caughtError, 'Could not save profile.'))
    } finally {
      setSaving(false)
    }
  }

  if (shouldCompleteProfile) {
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
            {localErrorText ? <p className="status-note status-error">{localErrorText}</p> : null}
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
        if (!registrationInviteEnabled || !registrationUnlocked) {
          throw new Error('Parent registration is invite-only right now.')
        }

        await register({
          email,
          password,
          displayName,
          role: 'parent',
        })
      } else {
        await login(email, password)
      }
    } catch (caughtError) {
      setError(normalizeErrorMessage(caughtError, 'Authentication failed.'))
    } finally {
      setSaving(false)
    }
  }

  function handleUnlockInvite(event) {
    event.preventDefault()
    setError('')

    if (!registrationInviteEnabled) {
      setError('Parent registration is invite-only right now.')
      return
    }

    if (inviteCode.trim() !== registrationInviteCode) {
      setError('That invitation code is not valid.')
      return
    }

    setRegistrationUnlocked(true)
    setShowInviteForm(false)
    setMode('register')
    setPassword('')
  }

  function handleReturnToLogin() {
    setMode('login')
    setRegistrationUnlocked(false)
    setShowInviteForm(false)
    setInviteCode('')
    setError('')
  }

  function handleUseDemoLogin() {
    setMode('login')
    setEmail(demoParentEmail)
    setPassword(demoParentPassword)
    setDisplayName('')
    setError('')
  }

  return (
    <main className="auth-screen">
      <section className="auth-brand-hero" aria-label="Family Economy">
        <img className="auth-brand-logo" src={authLogoSrc} alt="Family Economy" />
      </section>

      <section className="auth-card auth-login-panel">
        <p className="auth-kicker">{mode === 'register' ? 'Private Invite' : 'Parent Access'}</p>
        <h1 className="auth-title">
          {mode === 'register' ? 'Create parent account' : 'Welcome back'}
        </h1>
        {blockedByClient ? (
          <p className="status-note status-error">
            Browser privacy/ad-block settings are blocking Firebase requests. Allow
            firestore.googleapis.com and identitytoolkit.googleapis.com for this site.
          </p>
        ) : null}

        {authStatusText ? (
          <p className="status-note status-error">{authStatusText}</p>
        ) : null}

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
          <div className="credential-input-wrap">
            <input
              className="job-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="credential-icon-button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <span className="credential-icon" aria-hidden="true">{showPassword ? '👁' : '🙈'}</span>
            </button>
          </div>

          {localErrorText ? <p className="status-note status-error">{localErrorText}</p> : null}

          <button className="claim-button" type="submit" disabled={saving}>
            {saving
              ? 'Please wait...'
              : mode === 'register'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        {showDemoLogin && mode === 'login' ? (
          <section className="auth-demo-panel" aria-label="Demo login credentials">
            <p className="auth-demo-title">Demo account</p>
            <p className="auth-demo-copy">Resettable sample household for product walkthroughs.</p>
            <dl className="auth-demo-credentials">
              <div>
                <dt>Email</dt>
                <dd>{demoParentEmail}</dd>
              </div>
              <div>
                <dt>Password</dt>
                <dd>{demoParentPassword}</dd>
              </div>
            </dl>
            <button type="button" className="auth-demo-fill" onClick={handleUseDemoLogin}>
              Use demo login
            </button>
          </section>
        ) : null}

        {mode === 'register' ? (
          <button
            type="button"
            className="auth-mode-link"
            onClick={handleReturnToLogin}
          >
            Already have an account? Sign in
          </button>
        ) : (
          <div className="auth-private-access">
            {registrationInviteEnabled ? (
              <>
                {showInviteForm ? (
                  <form className="auth-invite-form" onSubmit={handleUnlockInvite}>
                    <input
                      className="job-input"
                      placeholder="Invitation code"
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                    />
                    <button className="text-button" type="submit">
                      Unlock registration
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="auth-mode-link"
                    onClick={() => setShowInviteForm(true)}
                  >
                    Have an invitation code?
                  </button>
                )}
              </>
            ) : (
              <p className="auth-private-note">
                New parent accounts are invite-only right now.
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
