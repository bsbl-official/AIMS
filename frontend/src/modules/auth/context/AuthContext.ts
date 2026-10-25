import { createContext } from 'react'
import type { CurrentUser } from '../auth.types'

export type AuthContextValue = {
  user: CurrentUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  can: (permission: string) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
