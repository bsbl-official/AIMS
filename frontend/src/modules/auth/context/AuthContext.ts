import { createContext } from 'react'
import type { CurrentUser } from '../auth.types'

export type AuthContextValue = {
  user: CurrentUser | null
  loading: boolean
  login: (email: string, password: string, mfaCode?: string) => Promise<void>
  logout: () => Promise<void>
  reloadUser: () => Promise<void>
  can: (permission: string) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
