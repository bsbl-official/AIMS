import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { configureAuthentication } from '../../../shared/api/httpClient'
import { authApi } from '../auth.api'
import type { CurrentUser } from '../auth.types'
import { AuthContext, type AuthContextValue } from '../context/AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const session = await authApi.refresh()
      setUser(session.user)
      return true
    } catch {
      setUser(null)
      return false
    }
  }, [])

  useEffect(() => {
    configureAuthentication(refresh)
    localStorage.removeItem('account_bm_access_token')
    localStorage.removeItem('account_bm_refresh_token')
    const restoreSession = async () => {
      try {
        setUser(await authApi.me())
      } catch {
        await refresh()
      } finally {
        setLoading(false)
      }
    }
    void restoreSession()
  }, [refresh])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: async (email, password) => {
      const session = await authApi.login(email, password)
      setUser(session.user)
    },
    logout: async () => {
      setUser(null)
      await authApi.logout().catch(() => undefined)
    },
    can: (permission) => Boolean(user?.superAdmin || user?.permissions.includes(permission)),
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
