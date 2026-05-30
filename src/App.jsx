import { useEffect, useState } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import BottomTabBar from './components/mobile/BottomTabBar'
import PhoneFrame from './components/mobile/PhoneFrame'
import TopStatusBar from './components/mobile/TopStatusBar'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import ChildProfilesPage from './pages/mobile/ChildProfilesPage'
import HomePage from './pages/mobile/HomePage'
import KidProfilePage from './pages/mobile/KidProfilePage'
import JobsPage from './pages/mobile/MissionsPage'
import OnboardingPage from './pages/mobile/OnboardingPage'
import ProfilePage from './pages/mobile/ProfilePage'
import SavingsPage from './pages/mobile/SavingsPage'
import StorePage from './pages/mobile/StorePage'
import { getHouseholdOnboardingData } from './services/familyEconomyService'

function resolveUiTheme(pathname, userRole) {
  if (userRole === 'kid') {
    return 'theme-playful'
  }

  if (
    pathname === '/mobile/home'
    || pathname === '/mobile/jobs'
    || pathname === '/mobile/store'
    || pathname === '/mobile/savings'
    || /^\/mobile\/children\/.+/.test(pathname)
  ) {
    return 'theme-playful'
  }

  return 'theme-parent'
}

function UiThemeSync() {
  const { userRole } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const classList = document.body.classList
    classList.remove('theme-parent', 'theme-playful')
    classList.add(resolveUiTheme(location.pathname, userRole))

    return () => {
      classList.remove('theme-parent', 'theme-playful')
    }
  }, [location.pathname, userRole])

  return null
}

function MobileAppRoutes() {
  const { loading, isAuthenticated, userRole, familyId, userId, activeChildProfile } =
    useAuth()
  const location = useLocation()
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    let active = true

    async function checkOnboarding() {
      if (loading || !isAuthenticated || userRole !== 'parent' || !familyId) {
        if (active) {
          setNeedsOnboarding(false)
          setCheckingOnboarding(false)
        }
        return
      }

      setCheckingOnboarding(true)
      try {
        const result = await getHouseholdOnboardingData({
          familyId,
          userId,
          userRole,
        })

        if (!active) {
          return
        }

        const hasFamily = result.data.familyExists
        setNeedsOnboarding(!hasFamily)
      } catch {
        if (!active) {
          return
        }
        setNeedsOnboarding(true)
      } finally {
        if (active) {
          setCheckingOnboarding(false)
        }
      }
    }

    checkOnboarding()

    return () => {
      active = false
    }
  }, [loading, isAuthenticated, userRole, familyId, userId, location.pathname])

  if (loading || checkingOnboarding) {
    return (
      <main className="phone-content auth-wrap">
        <section className="panel auth-card">
          <p className="panel-label">Family Economy</p>
          <p className="panel-muted">Loading secure parent session...</p>
        </section>
      </main>
    )
  }

  if (!isAuthenticated || userRole !== 'parent') {
    return <Navigate to="/auth" replace />
  }

  if (needsOnboarding && location.pathname !== '/mobile/onboarding') {
    return <Navigate to="/mobile/onboarding" replace />
  }

  const requiresSelectedChild =
    location.pathname === '/mobile/jobs' ||
    location.pathname === '/mobile/store' ||
    location.pathname === '/mobile/savings'

  if (userRole === 'parent' && requiresSelectedChild && !activeChildProfile?.id) {
    return <Navigate to="/mobile/children" replace />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/mobile/home" replace />} />
      <Route path="/mobile/home" element={<HomePage />} />
      <Route path="/mobile/children" element={<ChildProfilesPage />} />
      <Route path="/mobile/children/:childId" element={<KidProfilePage />} />
      <Route path="/mobile/missions" element={<Navigate to="/mobile/jobs" replace />} />
      <Route path="/mobile/jobs" element={<JobsPage />} />
      <Route path="/mobile/store" element={<StorePage />} />
      <Route path="/mobile/savings" element={<SavingsPage />} />
      <Route path="/mobile/onboarding" element={<OnboardingPage />} />
      <Route path="/mobile/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/mobile/home" replace />} />
    </Routes>
  )
}

function ShellChrome() {
  const { isAuthenticated, userRole, logout } = useAuth()
  const location = useLocation()
  const { pathname } = location

  const parentNavPaths = new Set([
    '/mobile/home',
    '/mobile/children',
    '/mobile/jobs',
    '/mobile/store',
    '/mobile/savings',
    '/mobile/profile',
  ])

  const showParentShell = isAuthenticated && userRole === 'parent' && parentNavPaths.has(pathname)

  if (!showParentShell) {
    return null
  }

  const topTitleByPath = {
    '/mobile/home': 'Family Dashboard',
    '/mobile/children': 'Kids',
    '/mobile/jobs': 'Jobs',
    '/mobile/store': 'Store',
    '/mobile/savings': 'Savings',
    '/mobile/profile': 'Parent',
  }

  const isParentProfileRoute = pathname === '/mobile/profile'

  return (
    <>
      <TopStatusBar
        title={topTitleByPath[pathname] || 'Family Economy'}
        actionLabel={isParentProfileRoute ? 'Sign out Parent' : undefined}
        onAction={isParentProfileRoute ? logout : undefined}
      />
      <BottomTabBar />
    </>
  )
}

function App() {
  const Router = import.meta.env.VITE_USE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter

  return (
    <Router>
      <AuthProvider>
        <UiThemeSync />
        <PhoneFrame>
          <ShellChrome />
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<MobileAppRoutes />} />
          </Routes>
        </PhoneFrame>
      </AuthProvider>
    </Router>
  )
}

export default App
