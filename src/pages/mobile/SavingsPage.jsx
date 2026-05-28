import { useEffect, useState } from 'react'

import BottomTabBar from '../../components/mobile/BottomTabBar'
import { useAuth } from '../../context/AuthContext'
import { seedGoals } from '../../data/mobileData'
import { getFamilyDashboard } from '../../services/familyEconomyService'

export default function SavingsPage() {
  const { familyId, userId, userRole } = useAuth()
  const [goals, setGoals] = useState(seedGoals)

  useEffect(() => {
    let mounted = true

    async function loadGoals() {
      try {
        const result = await getFamilyDashboard({ familyId, userId, userRole })
        if (mounted) {
          setGoals(result.data.goals)
        }
      } catch {
        if (mounted) {
          setGoals(seedGoals)
        }
      }
    }

    loadGoals()

    return () => {
      mounted = false
    }
  }, [familyId, userId, userRole])

  return (
    <>
      <header className="status-row">
        <span>9:41</span>
        <span className="page-title">Savings</span>
      </header>
      <main className="phone-content">
        <section className="panel">
          <p className="panel-label">Savings Goals</p>
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
        </section>
      </main>
      <BottomTabBar />
    </>
  )
}
