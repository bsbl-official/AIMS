import { request } from '../../shared/api/httpClient'
import type { CurrentUser, TokenResponse } from './auth.types'

export const authApi = {
  login: (email: string, password: string, mfaCode?: string) => request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, mfaCode }),
  }),
  refresh: () => request<TokenResponse>('/auth/refresh', {
    method: 'POST',
  }, false),
  logout: () => request<void>('/auth/logout', {
    method: 'POST',
  }, false),
  me: () => request<CurrentUser>('/auth/me'),
}
