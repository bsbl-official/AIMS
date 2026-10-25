import type { TokenResponse } from '../auth.types'

const ACCESS_TOKEN_KEY = 'account_bm_access_token'
const REFRESH_TOKEN_KEY = 'account_bm_refresh_token'

export const authSessionStore = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  save: (session: TokenResponse) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}
