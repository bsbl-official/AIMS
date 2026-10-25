import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { configureAuthentication } from '../../../shared/api/httpClient'
import { authApi } from '../auth.api'
import type { CurrentUser } from '../auth.types'
import { AuthContext, type AuthContextValue } from '../context/AuthContext'
import { authSessionStore } from '../store/authSessionStore'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const refreshToken = authSessionStore.getRefreshToken()
    if (!refreshToken) return null
    try {
      const session = await authApi.refresh(refreshToken)
      authSessionStore.save(session)
      setUser(session.user)
      return session.accessToken
    } catch {
      authSessionStore.clear()
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    configureAuthentication(authSessionStore.getAccessToken, refresh)
    const restoreSession = async () => {
      if (!authSessionStore.getRefreshToken()) {
        setLoading(false)
        return
      }
      try {
        if (authSessionStore.getAccessToken()) setUser(await authApi.me())
        else await refresh()
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
      authSessionStore.save(session)
      setUser(session.user)
    },
    logout: async () => {
      const refreshToken = authSessionStore.getRefreshToken()
      authSessionStore.clear()
      setUser(null)
      if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined)
    },
    can: (permission) => Boolean(user?.superAdmin || user?.permissions.includes(permission)),
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
