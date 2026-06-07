import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import EmptyState from '../../components/shared/EmptyState'
import StatusNote from '../../components/shared/StatusNote'
import useChildProfiles from '../../hooks/useChildProfiles'

export default function ChildProfilesPage() {
  const navigate = useNavigate()
  const {
    children,
    loading,
    error,
    activeChildProfile,
    setActiveChildProfile,
  } = useChildProfiles({ defaultErrorMessage: 'Could not load child profiles.' })
  const activeChildId = activeChildProfile?.id || ''
  const hasActiveChild = Boolean(activeChildProfile)

  useEffect(() => {
    if (loading) {
      return
    }

    if (children.length === 0 && hasActiveChild) {
      setActiveChildProfile(null)
      return
    }

    const hasCurrent = children.some((child) => child.id === activeChildId)
    if (hasActiveChild && !hasCurrent) {
      setActiveChildProfile(null)
    }
  }, [activeChildId, children, hasActiveChild, loading, setActiveChildProfile])

  return (
    <>
      <main className="phone-content child-profiles-grid">
        <section className="panel child-chooser-panel">
          <p className="panel-label">Choose Child</p>
          <p className="panel-muted">
            Pick who is using the kid view.
          </p>

          <EmptyState className="child-chooser-state">{loading ? 'Loading children...' : ''}</EmptyState>
          <StatusNote tone="error">{error}</StatusNote>

          {!loading && children.length === 0 ? (
            <EmptyState className="child-chooser-state">No child profiles yet.</EmptyState>
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
                  </button>
                )
              })}
            </div>
          ) : null}
        </section>

      </main>
    </>
  )
}
