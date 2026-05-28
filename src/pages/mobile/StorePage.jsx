import { useEffect, useState } from 'react'

import BottomTabBar from '../../components/mobile/BottomTabBar'
import { useAuth } from '../../context/AuthContext'
import {
  getFamilyStoreData,
  requestReward,
  reviewRewardRequest,
} from '../../services/familyEconomyService'

const requestStatusText = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
}

export default function StorePage() {
  const { familyId, userId, userRole, parentControlsUnlocked } = useAuth()
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
  }, [familyId, effectiveRole, effectiveUserId])

  async function handleRequestReward(reward) {
    setError('')
    setActioningId(reward.id)
    try {
      await requestReward(reward, {
        familyId,
        userId: effectiveUserId,
        userRole: effectiveRole,
      })
      await refreshStore()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not submit reward request.')
    } finally {
      setActioningId('')
    }
  }

  async function handleReview(requestId, decision) {
    setError('')
    setActioningId(requestId)
    try {
      await reviewRewardRequest(requestId, decision, {
        familyId,
        userId: effectiveUserId,
        userRole: effectiveRole,
      })
      await refreshStore()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not review request.')
    } finally {
      setActioningId('')
    }
  }

  const pendingRequests = requests.filter((item) => item.status === 'pending')

  return (
    <>
      <header className="status-row">
        <span>9:41</span>
        <span className="page-title">Store</span>
      </header>
      <main className="phone-content">
        {loading ? <p className="status-note">Loading store...</p> : null}
        {error ? <p className="status-note status-error">{error}</p> : null}

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
                  <span className="job-status-label">Approval required</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {effectiveRole === 'parent' ? (
          <section className="panel">
            <div className="panel-head">
              <p className="panel-label">Reward Requests</p>
              {parentControlsUnlocked ? (
                <span className="job-status-label">Parent controls unlocked</span>
              ) : (
                <span className="job-status-label">Locked</span>
              )}
            </div>

            {pendingRequests.length === 0 ? (
              <p className="panel-muted">No pending requests.</p>
            ) : (
              <ul className="mission-list">
                {pendingRequests.map((request) => (
                  <li key={request.id}>
                    <span className="mission-main">
                      {request.rewardTitle} ({request.cost})
                    </span>
                    {parentControlsUnlocked ? (
                      <div className="button-row">
                        <button
                          type="button"
                          className="claim-button"
                          disabled={actioningId === request.id}
                          onClick={() => handleReview(request.id, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="claim-button claim-button-deny"
                          disabled={actioningId === request.id}
                          onClick={() => handleReview(request.id, 'denied')}
                        >
                          Deny
                        </button>
                      </div>
                    ) : (
                      <span className="job-status-label">
                        Unlock parent controls in Profile
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
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
        )}
      </main>
      <BottomTabBar />
    </>
  )
}
