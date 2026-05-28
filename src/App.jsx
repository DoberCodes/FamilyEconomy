import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import PhoneFrame from './components/mobile/PhoneFrame'
import { AuthProvider } from './context/AuthContext'
import HomePage from './pages/mobile/HomePage'
import JobsPage from './pages/mobile/MissionsPage'
import ProfilePage from './pages/mobile/ProfilePage'
import SavingsPage from './pages/mobile/SavingsPage'
import StorePage from './pages/mobile/StorePage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PhoneFrame>
          <Routes>
            <Route path="/" element={<Navigate to="/mobile/home" replace />} />
            <Route path="/mobile/home" element={<HomePage />} />
            <Route path="/mobile/missions" element={<Navigate to="/mobile/jobs" replace />} />
            <Route path="/mobile/jobs" element={<JobsPage />} />
            <Route path="/mobile/store" element={<StorePage />} />
            <Route path="/mobile/savings" element={<SavingsPage />} />
            <Route path="/mobile/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/mobile/home" replace />} />
          </Routes>
        </PhoneFrame>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
