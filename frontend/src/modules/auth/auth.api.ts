import { request } from '../../shared/api/httpClient'
import type { CurrentUser, TokenResponse } from './auth.types'

export const authApi = {
  login: (email: string, password: string) => request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  refresh: (refreshToken: string) => request<TokenResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }, false),
  logout: (refreshToken: string) => request<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }, false),
  me: () => request<CurrentUser>('/auth/me'),
}
