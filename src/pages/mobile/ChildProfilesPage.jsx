import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import {
  getHouseholdOnboardingData,
} from '../../services/familyEconomyService'

export default function ChildProfilesPage() {
  const navigate = useNavigate()
  const {
    familyId,
    userId,
    userRole,
    activeChildProfile,
    setActiveChildProfile,
  } = useAuth()

  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isParent = userRole === 'parent'

  const fetchChildren = useCallback(async () => {
    const result = await getHouseholdOnboardingData({
      familyId,
      userId,
      userRole,
    })

    return result.data.childProfiles || []
  }, [familyId, userId, userRole])

  useEffect(() => {
    let cancelled = false

    async function bootstrapChildren() {
      try {
        const childProfiles = await fetchChildren()

        if (cancelled) {
          return
        }

        setChildren(childProfiles)

        if (childProfiles.length === 0) {
          setActiveChildProfile(null)
          return
        }

        const hasCurrent = childProfiles.some((child) => child.id === activeChildProfile?.id)
        if (!hasCurrent) {
          setActiveChildProfile(null)
        }
      } catch (caughtError) {
        if (cancelled) {
          return
        }

        setError(caughtError.message || 'Could not load child profiles.')
        setChildren([])
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    bootstrapChildren()

    return () => {
      cancelled = true
    }
  }, [activeChildProfile?.id, fetchChildren, setActiveChildProfile])

  return (
    <>
      <main className="phone-content">
        <section className="panel">
          <p className="panel-label">Choose Child</p>
          <p className="panel-muted">
            Select a child tile to switch the kid-friendly view across the app.
          </p>

          {loading ? <p className="panel-muted">Loading children...</p> : null}
          {error ? <p className="status-note status-error">{error}</p> : null}

          {!loading && children.length === 0 ? (
            <p className="panel-muted">No child profiles yet.</p>
          ) : null}

          {children.length > 0 ? (
            <div className="child-tile-grid">
              {children.map((child) => {
                const isActive = child.id === activeChildProfile?.id
                return (
                  <button
                    key={child.id}
                    type="button"
                    className={isActive ? 'child-tile child-tile-active' : 'child-tile'}
                    onClick={() => {
                      setActiveChildProfile(child)
                      navigate(`/mobile/children/${child.id}`)
                    }}
                  >
                    <span className="child-tile-avatar" aria-hidden="true">
                      {child.avatar}
                    </span>
                    <strong>{child.displayName}</strong>
                    <small>Weekly goal: {child.weeklyGoalCredits}</small>
                  </button>
                )
              })}
            </div>
          ) : null}
        </section>

        {isParent ? (
          <p className="status-note">
            Add/edit child profiles from Parent tab command center.
          </p>
        ) : null}
      </main>
    </>
  )
}
