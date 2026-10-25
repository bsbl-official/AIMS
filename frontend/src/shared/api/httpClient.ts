const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

let getAccessToken: () => string | null = () => null
let refreshAccessToken: (() => Promise<string | null>) | null = null

export function configureAuthentication(
  tokenGetter: () => string | null,
  tokenRefresher: () => Promise<string | null>,
) {
  getAccessToken = tokenGetter
  refreshAccessToken = tokenRefresher
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
  }
}

export async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const accessToken = getAccessToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  })

  if (response.status === 401 && retry && refreshAccessToken && !path.startsWith('/auth/')) {
    const nextToken = await refreshAccessToken()
    if (nextToken) return request<T>(path, init, false)
  }

  if (!response.ok) {
    const details = await response.json().catch(() => undefined)
    const message = typeof details === 'object' && details && 'detail' in details
      ? String(details.detail)
      : `Request failed with status ${response.status}`
    throw new ApiError(message, response.status, details)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
