import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f4f5f1] text-[#526967]">Loading your workspace...</div>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}
