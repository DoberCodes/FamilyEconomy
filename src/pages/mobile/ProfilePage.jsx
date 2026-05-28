import { useState } from 'react'

import BottomTabBar from '../../components/mobile/BottomTabBar'
import { useAuth } from '../../context/AuthContext'

export default function ProfilePage() {
  const {
    displayName,
    userEmail,
    userRole,
    familyId,
    isAuthenticated,
    login,
    hasParentPin,
    parentControlsUnlocked,
    setParentPin,
    unlockParentControls,
    lockParentControls,
    logout,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState('')

  async function handleParentUnlock(event) {
    event.preventDefault()
    setError('')
    setUnlocking(true)

    try {
      await login(email, password)
      setEmail('')
      setPassword('')
    } catch {
      setError('Parent unlock failed. Check credentials and try again.')
    } finally {
      setUnlocking(false)
    }
  }

  async function handleLockParentMode() {
    setError('')
    try {
      lockParentControls()
    } catch {
      setError('Could not lock parent mode right now.')
    }
  }

  function handleSetPin(event) {
    event.preventDefault()
    setError('')

    try {
      setParentPin(newPin)
      setNewPin('')
    } catch (caughtError) {
      setError(caughtError.message || 'Could not set Parent PIN.')
    }
  }

  function handleUnlockWithPin(event) {
    event.preventDefault()
    setError('')

    try {
      unlockParentControls(pin)
      setPin('')
    } catch (caughtError) {
      setError(caughtError.message || 'Could not unlock Parent Mode.')
    }
  }

  return (
    <>
      <header className="status-row">
        <span>9:41</span>
        <span className="page-title">Profile</span>
      </header>
      <main className="phone-content">
        <section className="panel">
          <p className="panel-label">Kid Friendly Mode</p>
          <p className="panel-muted">
            Kids can use the app by default. Parent options stay protected.
          </p>
        </section>

        {isAuthenticated && userRole === 'parent' ? (
          <section className="panel">
            <p className="panel-label">Parent Mode Active</p>
            <p className="panel-muted">{displayName || 'Parent account'}</p>
            <p className="panel-muted">{userEmail}</p>
            <p className="panel-muted">Family: {familyId}</p>

            {!hasParentPin ? (
              <form className="auth-form" onSubmit={handleSetPin}>
                <p className="panel-muted">Set a 4-digit Parent PIN for quick unlock.</p>
                <input
                  className="job-input"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  placeholder="New 4-digit PIN"
                  value={newPin}
                  onChange={(event) => setNewPin(event.target.value)}
                  required
                />
                <button type="submit" className="claim-button">
                  Save Parent PIN
                </button>
              </form>
            ) : null}

            {hasParentPin && !parentControlsUnlocked ? (
              <form className="auth-form" onSubmit={handleUnlockWithPin}>
                <p className="panel-muted">Enter Parent PIN to unlock parent controls.</p>
                <input
                  className="job-input"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  placeholder="Parent PIN"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  required
                />
                <button type="submit" className="claim-button">
                  Unlock Parent Controls
                </button>
              </form>
            ) : null}

            {hasParentPin && parentControlsUnlocked ? (
              <div className="button-row">
                <button
                  type="button"
                  className="claim-button"
                  onClick={handleLockParentMode}
                >
                  Lock Parent Controls
                </button>
                <button type="button" className="text-button" onClick={logout}>
                  Sign out Parent
                </button>
              </div>
            ) : null}

            {hasParentPin && !parentControlsUnlocked ? (
              <button type="button" className="text-button" onClick={logout}>
                Sign out Parent
              </button>
            ) : null}
          </section>
        ) : (
          <section className="panel">
            <p className="panel-label">Parent Access</p>
            <p className="panel-muted">
              Unlock parent mode to manage jobs and family settings.
            </p>
            <form className="auth-form" onSubmit={handleParentUnlock}>
              <input
                className="job-input"
                type="email"
                placeholder="Parent email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <input
                className="job-input"
                type="password"
                placeholder="Parent password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {error ? <p className="status-note status-error">{error}</p> : null}
              <button type="submit" className="claim-button" disabled={unlocking}>
                {unlocking ? 'Unlocking...' : 'Unlock Parent Mode'}
              </button>
            </form>
          </section>
        )}

        {isAuthenticated && userRole === 'kid' ? (
          <section className="panel">
            <p className="panel-label">Signed in as Kid</p>
            <p className="panel-muted">{displayName || userEmail}</p>
            <button
              type="button"
              className="text-button"
              onClick={handleLockParentMode}
            >
              Sign out
            </button>
          </section>
        ) : null}

        {!isAuthenticated ? (
          <section className="panel">
            <p className="panel-label">Not Signed In</p>
            <p className="panel-muted">
              Running in kid mode with fallback context values.
            </p>
          </section>
        ) : null}

        {isAuthenticated && userRole !== 'parent' && error ? (
          <p className="status-note status-error">{error}</p>
        ) : null}
      </main>
      <BottomTabBar />
    </>
  )
}
