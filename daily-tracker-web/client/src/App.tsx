import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { DashboardLayout } from './pages/dashboard/Layout'
import { Notes } from './pages/dashboard/Notes'
import { Reminders } from './pages/dashboard/Reminders'
import { Breaks } from './pages/dashboard/Breaks'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<Navigate to="notes" replace />} />
            <Route path="notes" element={<Notes />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="breaks" element={<Breaks />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
