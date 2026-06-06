import { useEffect, useState } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import BottomTabBar from './components/mobile/BottomTabBar'
import PhoneFrame from './components/mobile/PhoneFrame'
import TopStatusBar from './components/mobile/TopStatusBar'
import SplashScreen from './components/shared/SplashScreen'
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
import { isBlockedByClientSignal } from './utils/errorUtils'

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
  const { loading, isAuthenticated, isParentAuthenticated, userRole, familyId, userId, activeChildProfile, authStatusError } =
    useAuth()
  const location = useLocation()
  const [loadingTimedOut, setLoadingTimedOut] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const AUTH_LOADING_TIMEOUT_MS = 8000
  const ONBOARDING_TIMEOUT_MS = 7000
  const blockedByClient = isBlockedByClientSignal(authStatusError)

  useEffect(() => {
    if (!loading) {
      setLoadingTimedOut(false)
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setLoadingTimedOut(true)
    }, AUTH_LOADING_TIMEOUT_MS)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [loading, AUTH_LOADING_TIMEOUT_MS])

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
      let timeoutId
      try {
        const result = await Promise.race([
          getHouseholdOnboardingData({
            familyId,
            userId,
            userRole,
          }),
          new Promise((_, reject) => {
            timeoutId = window.setTimeout(() => {
              reject(new Error('Onboarding request timed out.'))
            }, ONBOARDING_TIMEOUT_MS)
          }),
        ])

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
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        if (active) {
          setCheckingOnboarding(false)
        }
      }
    }

    checkOnboarding()

    return () => {
      active = false
    }
  }, [loading, isAuthenticated, userRole, familyId, userId, location.pathname, ONBOARDING_TIMEOUT_MS])

  if ((loading && !loadingTimedOut) || checkingOnboarding) {
    return (
      <SplashScreen
        message="Loading secure parent session..."
        error={
          blockedByClient
            ? 'Browser privacy/ad-block settings are blocking Firebase requests. Allow firestore.googleapis.com and identitytoolkit.googleapis.com for this site.'
            : ''
        }
      />
    )
  }

  if (!isParentAuthenticated) {
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
  const { isAuthenticated, userRole, parentControlsUnlocked, lockParentControls } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
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

  useEffect(() => {
    const shouldShowBanner = showParentShell && parentControlsUnlocked
    document.body.classList.toggle('parent-session-active', shouldShowBanner)

    return () => {
      document.body.classList.remove('parent-session-active')
    }
  }, [showParentShell, parentControlsUnlocked])

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

  const headerActionLabel = parentControlsUnlocked ? 'Lock Parent' : 'Enable Parent'

  function handleHeaderAction() {
    if (parentControlsUnlocked) {
      lockParentControls()
      return
    }

    navigate('/mobile/profile')
  }

  return (
    <>
      <TopStatusBar
        title={topTitleByPath[pathname] || 'Family Economy'}
        actionLabel={headerActionLabel}
        onAction={handleHeaderAction}
      />
      {parentControlsUnlocked ? (
        <div className="parent-session-banner" role="status" aria-live="polite">
          Parent Session Active
        </div>
      ) : null}
      <BottomTabBar />
    </>
  )
}

function SplashPreviewGate() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const showSplashPreview = searchParams.get('splash') === '1' || searchParams.get('loading') === '1'

  if (showSplashPreview) {
    return (
      <SplashScreen
        message="Splash preview"
        detail="Remove ?splash=1 to continue into the app."
      />
    )
  }

  return (
    <>
      <ShellChrome />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<MobileAppRoutes />} />
      </Routes>
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
          <SplashPreviewGate />
        </PhoneFrame>
      </AuthProvider>
    </Router>
  )
}

export default App
