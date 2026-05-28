import { useEffect, useState } from 'react'

import BottomTabBar from '../../components/mobile/BottomTabBar'
import BalanceCard from '../../components/mobile/cards/BalanceCard'
import LevelCard from '../../components/mobile/cards/LevelCard'
import JobsCard from '../../components/mobile/cards/MissionsCard'
import StreakCard from '../../components/mobile/cards/StreakCard'
import { useAuth } from '../../context/AuthContext'
import { seedDashboard } from '../../data/mobileData'
import { getFamilyDashboard } from '../../services/familyEconomyService'

export default function HomePage() {
  const { familyId, userId, userRole } = useAuth()
  const [dashboard, setDashboard] = useState(seedDashboard)
  const [source, setSource] = useState('seed')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      setLoading(true)
      setError('')
      try {
        const result = await getFamilyDashboard({ familyId, userId, userRole })
        if (!mounted) {
          return
        }
        setDashboard(result.data)
        setSource(result.source)
      } catch {
        if (!mounted) {
          return
        }
        setDashboard(seedDashboard)
        setSource('seed')
        setError('Could not load Firebase data. Showing seeded data.')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [familyId, userId, userRole])

  return (
    <>
      <header className="status-row">
        <span>9:41</span>
        <span aria-hidden="true">⋯</span>
      </header>
      <main className="phone-content home-grid">
        {loading ? <p className="status-note">Loading dashboard...</p> : null}
        {!loading && source === 'seed' ? (
          <p className="status-note">
            Using seed data. Add Firebase env vars to load live data.
          </p>
        ) : null}
        {error ? <p className="status-note status-error">{error}</p> : null}

        <section className="home-col">
          <LevelCard level={dashboard.level} profileName={dashboard.profileName} />
          <BalanceCard credits={dashboard.balance.credits} />
        </section>
        <section className="home-col">
          <JobsCard jobs={dashboard.jobs} />
          <StreakCard days={dashboard.streakDays} />
        </section>
      </main>
      <BottomTabBar />
    </>
  )
}
