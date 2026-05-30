import { useEffect, useState } from 'react'

import { useAuth } from '../../context/AuthContext'
import {
  getFamilyStoreData,
  requestReward,
} from '../../services/familyEconomyService'

const requestStatusText = {
  pending: 'Pending',
  approved: 'Approved',
  fulfilled: 'Fulfilled',
  countered: 'Countered',
  denied: 'Denied',
}

export default function StorePage() {
  const {
    familyId,
    userId,
    userRole,
    activeChildProfile,
  } = useAuth()
  const effectiveRole = userRole || 'kid'
  const effectiveUserId = userId || 'kid-device'

  const [rewards, setRewards] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState('')
  const [error, setError] = useState('')

  async function refreshStore() {
    const result = await getFamilyStoreData({
      familyId,
      userId: effectiveUserId,
      userRole: effectiveRole,
      selectedChildId: activeChildProfile?.id,
    })
    setRewards(result.data.rewards)
    setRequests(result.data.requests)
  }

  useEffect(() => {
    let mounted = true

    async function loadStore() {
      setLoading(true)
      setError('')

      try {
        const result = await getFamilyStoreData({
          familyId,
          userId: effectiveUserId,
          userRole: effectiveRole,
          selectedChildId: activeChildProfile?.id,
        })

        if (!mounted) {
          return
        }

        setRewards(result.data.rewards)
        setRequests(result.data.requests)
      } catch (caughtError) {
        if (!mounted) {
          return
        }
        setError(caughtError.message || 'Could not load store right now.')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadStore()

    return () => {
      mounted = false
    }
  }, [familyId, effectiveRole, effectiveUserId, activeChildProfile?.id])

  async function handleRequestReward(reward) {
    setError('')
    setActioningId(reward.id)
    try {
      await requestReward(reward, {
        familyId,
        userId: effectiveUserId,
        userRole: effectiveRole,
        selectedChildId: activeChildProfile?.id,
      })
      await refreshStore()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not submit reward request.')
    } finally {
      setActioningId('')
    }
  }

  return (
    <>
      <main className="phone-content">
        {loading ? <p className="status-note">Loading store...</p> : null}
        {error ? <p className="status-note status-error">{error}</p> : null}

        {effectiveRole === 'parent' && activeChildProfile ? (
          <p className="status-note">
            Kid-friendly view child: {activeChildProfile.avatar} {activeChildProfile.displayName}
          </p>
        ) : null}

        {effectiveRole === 'parent' && !activeChildProfile ? (
          <p className="status-note">
            Choose a child in Kids tab to view child-specific rewards.
          </p>
        ) : null}

        <section className="panel">
          <p className="panel-label">Rewards Store</p>
          <ul className="mission-list">
            {rewards.map((reward) => (
              <li key={reward.id}>
                <span className="mission-main">🎁 {reward.title}</span>
                <span className="mission-reward">{reward.cost}</span>
                {effectiveRole === 'kid' ? (
                  <button
                    type="button"
                    className="claim-button"
                    onClick={() => handleRequestReward(reward)}
                    disabled={actioningId === reward.id}
                  >
                    {actioningId === reward.id ? 'Sending...' : 'Request'}
                  </button>
                ) : (
                  <span className="job-status-label">Requests are managed in Parent tab</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {effectiveRole !== 'parent' ? (
          <section className="panel">
            <p className="panel-label">My Reward Requests</p>
            {requests.length === 0 ? (
              <p className="panel-muted">No requests yet.</p>
            ) : (
              <ul className="mission-list">
                {requests
                  .filter((item) => item.requestedBy === effectiveUserId)
                  .map((request) => (
                    <li key={request.id}>
                      <span className="mission-main">{request.rewardTitle}</span>
                      <span className="job-status-label">
                        {requestStatusText[request.status] || request.status}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        ) : null}
      </main>
    </>
  )
}
