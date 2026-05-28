import { useEffect, useState } from 'react'

import BottomTabBar from '../../components/mobile/BottomTabBar'
import { useAuth } from '../../context/AuthContext'
import {
  createChildProfile,
  createHousehold,
  getHouseholdOnboardingData,
} from '../../services/familyEconomyService'

export default function OnboardingPage() {
  const { familyId, userId, userRole, parentControlsUnlocked } = useAuth()

  const [loading, setLoading] = useState(true)
  const [savingHousehold, setSavingHousehold] = useState(false)
  const [addingChild, setAddingChild] = useState(false)
  const [familyExists, setFamilyExists] = useState(false)
  const [childProfiles, setChildProfiles] = useState([])
  const [householdName, setHouseholdName] = useState('')
  const [childName, setChildName] = useState('')
  const [childAvatar, setChildAvatar] = useState('🧒')
  const [weeklyGoalCredits, setWeeklyGoalCredits] = useState('300')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const isParent = userRole === 'parent'

  useEffect(() => {
    let active = true

    async function run() {
      try {
        const result = await getHouseholdOnboardingData({
          familyId,
          userId: userId || 'kid-device',
          userRole: userRole || 'kid',
        })

        if (!active) {
          return
        }

        setFamilyExists(result.data.familyExists)
        setChildProfiles(result.data.childProfiles)
        if (result.data.family?.profileName) {
          setHouseholdName(result.data.family.profileName)
        }
      } catch (caughtError) {
        if (!active) {
          return
        }
        setError(caughtError.message || 'Could not load onboarding data.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      active = false
    }
  }, [familyId, userId, userRole])

  async function loadOnboarding() {
    setLoading(true)
    setError('')

    try {
      const result = await getHouseholdOnboardingData({
        familyId,
        userId: userId || 'kid-device',
        userRole: userRole || 'kid',
      })

      setFamilyExists(result.data.familyExists)
      setChildProfiles(result.data.childProfiles)
      if (result.data.family?.profileName) {
        setHouseholdName(result.data.family.profileName)
      }
    } catch (caughtError) {
      setError(caughtError.message || 'Could not load onboarding data.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateHousehold(event) {
    event.preventDefault()

    if (!parentControlsUnlocked) {
      setError('Unlock parent controls in Profile before creating a household.')
      return
    }

    setSavingHousehold(true)
    setError('')
    setStatus('')

    try {
      await createHousehold(
        { profileName: householdName },
        {
          familyId,
          userId,
          userRole,
        },
      )
      setStatus('Household created.')
      await loadOnboarding()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not create household.')
    } finally {
      setSavingHousehold(false)
    }
  }

  async function handleAddChild(event) {
    event.preventDefault()

    if (!parentControlsUnlocked) {
      setError('Unlock parent controls in Profile before adding child profiles.')
      return
    }

    setAddingChild(true)
    setError('')
    setStatus('')

    try {
      await createChildProfile(
        {
          displayName: childName,
          avatar: childAvatar,
          weeklyGoalCredits,
        },
        {
          familyId,
          userId,
          userRole,
        },
      )
      setChildName('')
      setWeeklyGoalCredits('300')
      setStatus('Child profile added.')
      await loadOnboarding()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not add child profile.')
    } finally {
      setAddingChild(false)
    }
  }

  return (
    <>
      <header className="status-row">
        <span>9:41</span>
        <span className="page-title">Onboarding</span>
      </header>
      <main className="phone-content">
        <section className="panel">
          <p className="panel-label">Household Setup</p>
          <p className="panel-muted">
            Create your family space, then add child profiles your kids can use.
          </p>
        </section>

        {!isParent ? (
          <section className="panel">
            <p className="panel-label">Parent Access Required</p>
            <p className="panel-muted">
              Sign in as a parent and unlock parent controls in Profile first.
            </p>
          </section>
        ) : null}

        {isParent ? (
          <section className="panel">
            <div className="panel-head">
              <p className="panel-label">Family</p>
              <span className="job-status-label">
                {familyExists ? 'Created' : 'Not created'}
              </span>
            </div>
            <form className="auth-form" onSubmit={handleCreateHousehold}>
              <input
                className="job-input"
                placeholder="Family name"
                value={householdName}
                onChange={(event) => setHouseholdName(event.target.value)}
                required
              />
              <button
                type="submit"
                className="claim-button"
                disabled={savingHousehold || loading || !parentControlsUnlocked}
              >
                {savingHousehold
                  ? 'Saving...'
                  : familyExists
                    ? 'Update household'
                    : 'Create household'}
              </button>
            </form>
          </section>
        ) : null}

        {isParent && familyExists ? (
          <section className="panel">
            <p className="panel-label">Child Profiles</p>

            <form className="auth-form" onSubmit={handleAddChild}>
              <input
                className="job-input"
                placeholder="Child display name"
                value={childName}
                onChange={(event) => setChildName(event.target.value)}
                required
              />
              <input
                className="job-input"
                placeholder="Avatar emoji"
                value={childAvatar}
                onChange={(event) => setChildAvatar(event.target.value)}
                required
              />
              <input
                className="job-input"
                type="number"
                min="0"
                step="50"
                placeholder="Weekly goal credits"
                value={weeklyGoalCredits}
                onChange={(event) => setWeeklyGoalCredits(event.target.value)}
              />
              <button
                type="submit"
                className="claim-button"
                disabled={addingChild || loading || !parentControlsUnlocked}
              >
                {addingChild ? 'Adding...' : 'Add child profile'}
              </button>
            </form>

            {childProfiles.length === 0 ? (
              <p className="panel-muted">No child profiles yet.</p>
            ) : (
              <ul className="profile-list">
                {childProfiles.map((child) => (
                  <li key={child.id} className="profile-list-item">
                    <span>
                      {child.avatar} {child.displayName}
                    </span>
                    <span className="job-status-label">
                      Goal {child.weeklyGoalCredits}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {loading ? <p className="status-note">Loading onboarding...</p> : null}
        {status ? <p className="status-note">{status}</p> : null}
        {error ? <p className="status-note status-error">{error}</p> : null}
      </main>
      <BottomTabBar />
    </>
  )
}
