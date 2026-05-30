import { useEffect, useState } from 'react'

import { useAuth } from '../../context/AuthContext'
import { getFamilyDashboard } from '../../services/familyEconomyService'

export default function SavingsPage() {
  const {
    familyId,
    userId,
    userRole,
    parentControlsUnlocked,
    activeChildProfile,
  } = useAuth()
  const [goals, setGoals] = useState([])
  const [error, setError] = useState('')

  async function refreshGoals() {
    const result = await getFamilyDashboard({
      familyId,
      userId,
      userRole,
      selectedChildId: activeChildProfile?.id,
    })
    setGoals(result.data.goals)
  }

  useEffect(() => {
    let mounted = true

    async function loadGoals() {
      try {
        const result = await getFamilyDashboard({
          familyId,
          userId,
          userRole,
          selectedChildId: activeChildProfile?.id,
        })
        if (mounted) {
          setGoals(result.data.goals)
        }
      } catch {
        if (mounted) {
          setGoals([])
        }
      }
    }

    loadGoals()

    return () => {
      mounted = false
    }
  }, [familyId, userId, userRole, activeChildProfile?.id])

  function displayGoalStatus(status) {
    if (status === 'completed') {
      return 'Completed'
    }
    if (status === 'pending_parent_approval') {
      return 'Pending Parent'
    }
    if (status === 'ready_to_claim') {
      return 'Ready for Parent'
    }
    if (status === 'countered') {
      return 'Countered'
    }
    if (status === 'denied') {
      return 'Denied'
    }
    return 'Saving'
  }

  const goalCounts = goals.reduce((accumulator, goal) => {
    const key = goal.status || 'active'
    accumulator[key] = (accumulator[key] || 0) + 1
    return accumulator
  }, {})

  const sortedGoals = goals
    .slice()
    .sort((left, right) => {
      const rank = {
        ready_to_claim: 0,
        active: 1,
        pending_parent_approval: 2,
        countered: 3,
        completed: 4,
      }
      const leftRank = rank[left.status] ?? 99
      const rightRank = rank[right.status] ?? 99
      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }

      const leftProgress = (Number(left.saved) || 0) / Math.max(1, Number(left.target) || 1)
      const rightProgress = (Number(right.saved) || 0) / Math.max(1, Number(right.target) || 1)
      return rightProgress - leftProgress
    })

  const spotlightGoal = sortedGoals[0] || null
  const spotlightGoalPct = spotlightGoal
    ? Math.min(100, Math.round(((Number(spotlightGoal.saved) || 0) / Math.max(1, Number(spotlightGoal.target) || 1)) * 100))
    : 0

  return (
    <>
      <main className="phone-content">
        {userRole === 'parent' && activeChildProfile ? (
          <p className="status-note">
            Kid-friendly view child: {activeChildProfile.avatar} {activeChildProfile.displayName}
          </p>
        ) : null}

        {userRole === 'parent' && !activeChildProfile ? (
          <p className="status-note">Choose a child in Kids tab before adding savings goals.</p>
        ) : null}

        {error ? <p className="status-note status-error">{error}</p> : null}

        <section className="panel">
          <p className="panel-label">Savings Goals</p>
          <div className="limit-chip-row">
            <span className="limit-chip">Active: {goalCounts.active || 0}</span>
            <span className="limit-chip">Ready: {goalCounts.ready_to_claim || 0}</span>
            <span className="limit-chip">Pending: {goalCounts.pending_parent_approval || 0}</span>
            <span className="limit-chip">Completed: {goalCounts.completed || 0}</span>
          </div>
          {spotlightGoal ? (
            <div className="money-block" style={{ marginTop: '0.6rem' }}>
              <p className="panel-label money-section-title">Goal Spotlight</p>
              <p className="panel-muted">{spotlightGoal.rewardTitle || spotlightGoal.name}</p>
              <div className="limit-chip-row">
                <span className="limit-chip">{displayGoalStatus(spotlightGoal.status)}</span>
                <span className="limit-chip">{spotlightGoal.saved}/{spotlightGoal.target} credits</span>
                <span className="limit-chip">{Math.max(0, Number(spotlightGoal.target) - Number(spotlightGoal.saved || 0))} to go</span>
              </div>
              <div className="xp-track xp-track-light">
                <span style={{ width: `${spotlightGoalPct}%` }}></span>
              </div>
            </div>
          ) : null}
          {goals.length === 0 ? (
            <p className="panel-muted">No savings goals yet. Add some after onboarding.</p>
          ) : (
            <ul className="goal-list-simple">
              {sortedGoals.map((goal) => {
                const pct = Math.round((goal.saved / goal.target) * 100)
                return (
                  <li key={goal.id || goal.name}>
                    <p>{goal.name}</p>
                    <small>
                      {goal.saved}/{goal.target} • {displayGoalStatus(goal.status)}
                    </small>
                    <div className="xp-track xp-track-light">
                      <span style={{ width: `${pct}%` }}></span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

      </main>
    </>
  )
}
