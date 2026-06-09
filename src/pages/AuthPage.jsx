import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import SplashScreen from '../components/shared/SplashScreen'
import { useAuth } from '../context/AuthContext'
import { validateRegistrationInvite } from '../services/registrationInviteService'
import { isBlockedByClientSignal, normalizeErrorMessage } from '../utils/errorUtils'

const authLogoSrc = `${import.meta.env.BASE_URL}verticalnotag.png`
const demoParentEmail = String(import.meta.env.VITE_DEMO_PARENT_EMAIL || 'demo@familyeconomy.app').trim()
const demoParentPassword = String(import.meta.env.VITE_DEMO_PARENT_PASSWORD || 'FamilyDemo123!').trim()
const showDemoLogin = import.meta.env.VITE_SHOW_DEMO_LOGIN !== 'false'
const earlyAccessEmail = 'doberfamilyventures@gmail.com'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const hasInviteUrlPrompt =
    searchParams.has('invite') || searchParams.has('inviteCode') || searchParams.has('code')
  const urlInviteCode = String(
    searchParams.get('invite') || searchParams.get('inviteCode') || searchParams.get('code') || '',
  ).trim()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [newFamilyId, setNewFamilyId] = useState(() => createFamilyId())
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [validatedInviteCode, setValidatedInviteCode] = useState('')
  const [checkingInvite, setCheckingInvite] = useState(false)
  const [showEarlyAccessForm, setShowEarlyAccessForm] = useState(false)
  const [earlyAccessName, setEarlyAccessName] = useState('')
  const [earlyAccessEmailValue, setEarlyAccessEmailValue] = useState('')
  const [earlyAccessFamily, setEarlyAccessFamily] = useState('')
  const [earlyAccessMessage, setEarlyAccessMessage] = useState('')
  const [earlyAccessStatus, setEarlyAccessStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const authStatusText = normalizeErrorMessage(authStatusError, '')
  const localErrorText = normalizeErrorMessage(error, '')
  const blockedByClient =
    isBlockedByClientSignal(authStatusText) || isBlockedByClientSignal(localErrorText)
  const registrationUnlocked = validatedInviteCode.length > 0

  useEffect(() => {
    let cancelled = false

    async function validateUrlInvite() {
      if (!hasInviteUrlPrompt) {
        return
      }

      setValidatedInviteCode('')

      if (!urlInviteCode) {
        setShowInviteForm(true)
        return
      }

      setCheckingInvite(true)
      setError('')

      try {
        const normalizedInviteCode = await validateRegistrationInvite(urlInviteCode)

        if (cancelled) {
          return
        }

        setValidatedInviteCode(normalizedInviteCode)
        setInviteCode(normalizedInviteCode)
        setShowInviteForm(false)
        setMode('register')
        setPassword('')
      } catch (caughtError) {
        if (cancelled) {
          return
        }

        setMode('login')
        setShowInviteForm(true)
        setError(normalizeErrorMessage(caughtError, 'That invitation code is not active.'))
      } finally {
        if (!cancelled) {
          setCheckingInvite(false)
        }
      }
    }

    if (!hasFirebaseConfig) {
      return
    }

    validateUrlInvite()

    return () => {
      cancelled = true
    }
  }, [hasFirebaseConfig, hasInviteUrlPrompt, urlInviteCode])

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
        invitationCode: validatedInviteCode || urlInviteCode || inviteCode,
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
        if (!registrationUnlocked) {
          throw new Error('Use an invitation link or enter your invitation code first.')
        }

        await register({
          email,
          password,
          displayName,
          role: 'parent',
          invitationCode: validatedInviteCode,
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
    setValidatedInviteCode('')

    const nextInviteCode = inviteCode.trim()

    if (!nextInviteCode) {
      setError('Enter your invitation code.')
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('invite', nextInviteCode)
    nextSearchParams.delete('inviteCode')
    nextSearchParams.delete('code')
    setSearchParams(nextSearchParams, { replace: true })
    setShowInviteForm(false)
    setPassword('')
  }

  function handleReturnToLogin() {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('invite')
    nextSearchParams.delete('inviteCode')
    nextSearchParams.delete('code')
    setSearchParams(nextSearchParams, { replace: true })
    setMode('login')
    setShowInviteForm(false)
    setInviteCode('')
    setValidatedInviteCode('')
    setError('')
  }

  function handleUseDemoLogin() {
    setMode('login')
    setEmail(demoParentEmail)
    setPassword(demoParentPassword)
    setDisplayName('')
    setError('')
  }

  function handleCloseEarlyAccessDialog() {
    setShowEarlyAccessForm(false)
    setEarlyAccessStatus('')
  }

  function handleEarlyAccessRequest(event) {
    event.preventDefault()
    setError('')

    const requestName = earlyAccessName.trim()
    const requestEmail = earlyAccessEmailValue.trim()
    const requestFamily = earlyAccessFamily.trim()
    const requestMessage = earlyAccessMessage.trim()

    const body = [
      'Early access request',
      '',
      `Parent name: ${requestName || 'Not provided'}`,
      `Email: ${requestEmail || 'Not provided'}`,
      `Family / context: ${requestFamily || 'Not provided'}`,
      '',
      'Message:',
      requestMessage || 'Not provided',
    ].join('\n')

    const mailtoUrl = `mailto:${earlyAccessEmail}?subject=${encodeURIComponent('Family Economy early access request')}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
    setEarlyAccessStatus('Your email app should open with the request ready to send.')
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
            <p className="auth-demo-copy">Try Family Economy using a sample household.</p>
            <p className="auth-demo-copy">This demo resets periodically.</p>
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
            {showInviteForm ? (
              <form className="auth-invite-form" onSubmit={handleUnlockInvite}>
                <p className="auth-access-prompt-label">Invited family?</p>
                <input
                  className="job-input"
                  placeholder="Invitation code"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                />
                    <button className="text-button" type="submit">
                      {checkingInvite ? 'Checking...' : 'Enter your code'}
                    </button>
                  </form>
            ) : (
              <div className="auth-access-prompt">
                <span>Invited family?</span>
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={() => setShowInviteForm(true)}
                >
                  Enter your code
                </button>
              </div>
            )}
            <div className="auth-access-prompt">
              <span>Need access?</span>
              <button
                type="button"
                className="auth-inline-link"
                onClick={() => {
                  setShowEarlyAccessForm(true)
                  setEarlyAccessStatus('')
                }}
              >
                Request early access
              </button>
            </div>
          </div>
        )}
      </section>

      {showEarlyAccessForm ? (
        <div
          className="auth-access-dialog-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseEarlyAccessDialog()
            }
          }}
        >
          <section
            className="auth-access-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="early-access-title"
          >
            <div className="panel-head">
              <div>
                <p className="auth-access-title">Early access</p>
                <h2 id="early-access-title" className="auth-access-heading">Request an invite</h2>
              </div>
              <button
                type="button"
                className="dialog-close-button"
                onClick={handleCloseEarlyAccessDialog}
                aria-label="Close early access dialog"
              >
                <span aria-hidden="true">X</span>
              </button>
            </div>
            <p className="auth-access-copy">
              Tell us a little about your family and what you want to try. This opens a ready-to-send email.
            </p>
            <form className="auth-access-request-form" onSubmit={handleEarlyAccessRequest}>
              <input
                className="job-input"
                placeholder="Parent name"
                value={earlyAccessName}
                onChange={(event) => setEarlyAccessName(event.target.value)}
              />
              <input
                className="job-input"
                type="email"
                placeholder="Email"
                value={earlyAccessEmailValue}
                onChange={(event) => setEarlyAccessEmailValue(event.target.value)}
                required
              />
              <input
                className="job-input"
                placeholder="Family size or ages"
                value={earlyAccessFamily}
                onChange={(event) => setEarlyAccessFamily(event.target.value)}
              />
              <textarea
                className="job-input auth-access-textarea"
                placeholder="What would you like to try Family Economy for?"
                value={earlyAccessMessage}
                onChange={(event) => setEarlyAccessMessage(event.target.value)}
                rows={4}
              />
              {earlyAccessStatus ? (
                <p className="auth-access-status">{earlyAccessStatus}</p>
              ) : null}
              <div className="auth-access-button-row">
                <button className="claim-button" type="submit">
                  Send request
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={handleCloseEarlyAccessDialog}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
