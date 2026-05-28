import { useEffect, useState } from 'react'

import BottomTabBar from '../../components/mobile/BottomTabBar'
import { useAuth } from '../../context/AuthContext'
import { createGoal, getFamilyDashboard } from '../../services/familyEconomyService'

export default function SavingsPage() {
  const {
    familyId,
    userId,
    userRole,
    parentControlsUnlocked,
    activeChildProfile,
  } = useAuth()
  const parentAccessGranted = userRole === 'parent' && parentControlsUnlocked
  const [goals, setGoals] = useState([])
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('500')
  const [savingGoal, setSavingGoal] = useState(false)
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

  async function handleCreateGoal(event) {
    event.preventDefault()
    setError('')
    setSavingGoal(true)

    try {
      await createGoal(
        {
          name: goalName,
          childId: activeChildProfile?.id || null,
          target: Number(goalTarget) || 0,
          saved: 0,
        },
        { familyId, userId, userRole },
      )

      setGoalName('')
      setGoalTarget('500')
      await refreshGoals()
    } catch (caughtError) {
      setError(caughtError.message || 'Could not create savings goal.')
    } finally {
      setSavingGoal(false)
    }
  }

  return (
    <>
      <header className="status-row">
        <span>9:41</span>
        <span className="page-title">Savings</span>
      </header>
      <main className="phone-content">
        {userRole === 'parent' && activeChildProfile ? (
          <p className="status-note">
            Kid-friendly view child: {activeChildProfile.avatar} {activeChildProfile.displayName}
          </p>
        ) : null}

        {userRole === 'parent' && !activeChildProfile ? (
          <p className="status-note">Choose a child in Kids tab before adding savings goals.</p>
        ) : null}

        {userRole === 'parent' && parentAccessGranted && activeChildProfile ? (
          <section className="panel">
            <p className="panel-label">Create Savings Goal</p>
            <form className="job-form" onSubmit={handleCreateGoal}>
              <input
                value={goalName}
                onChange={(event) => setGoalName(event.target.value)}
                className="job-input"
                placeholder="Goal name"
                required
              />
              <input
                value={goalTarget}
                onChange={(event) => setGoalTarget(event.target.value)}
                className="job-input"
                type="number"
                min="1"
                placeholder="Target credits"
                required
              />
              <button type="submit" className="claim-button" disabled={savingGoal}>
                {savingGoal ? 'Saving...' : 'Add Goal'}
              </button>
            </form>
          </section>
        ) : null}

        {error ? <p className="status-note status-error">{error}</p> : null}

        <section className="panel">
          <p className="panel-label">Savings Goals</p>
          {goals.length === 0 ? (
            <p className="panel-muted">No savings goals yet. Add some after onboarding.</p>
          ) : (
            <ul className="goal-list-simple">
              {goals.map((goal) => {
                const pct = Math.round((goal.saved / goal.target) * 100)
                return (
                  <li key={goal.name}>
                    <p>{goal.name}</p>
                    <small>
                      {goal.saved}/{goal.target}
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
      <BottomTabBar />
    </>
  )
}
