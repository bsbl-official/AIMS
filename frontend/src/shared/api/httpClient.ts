const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const apiUrl = (path: string) => `${API_BASE_URL}${path}`

let refreshAccessToken: (() => Promise<boolean>) | null = null
let activeRefresh: Promise<boolean> | null = null
let csrfToken: string | null = null
let csrfRequest: Promise<string> | null = null

export function configureAuthentication(tokenRefresher: () => Promise<boolean>) {
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
  const method = (init.method ?? 'GET').toUpperCase()
  const requiresCsrf = !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)
  const token = requiresCsrf ? await getCsrfToken() : null
  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (init.body instanceof FormData) headers.delete('Content-Type')
  else if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('X-XSRF-TOKEN', token)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (response.status === 401 && retry && refreshAccessToken && !path.startsWith('/auth/')) {
    if (!activeRefresh) {
      activeRefresh = refreshAccessToken().finally(() => { activeRefresh = null })
    }
    const refreshed = await activeRefresh
    if (refreshed) return request<T>(path, init, false)
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

export async function requestBlob(path: string, retry = true): Promise<Blob> {
  const response = await fetch(apiUrl(path), { credentials: 'include', headers: { Accept: '*/*' } })
  if (response.status === 401 && retry && refreshAccessToken) {
    if (!activeRefresh) activeRefresh = refreshAccessToken().finally(() => { activeRefresh = null })
    if (await activeRefresh) return requestBlob(path, false)
  }
  if (!response.ok) throw new ApiError(`Request failed with status ${response.status}`, response.status)
  return response.blob()
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  if (!csrfRequest) {
    csrfRequest = fetch(`${API_BASE_URL}/auth/csrf`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new ApiError('Unable to initialize request security', response.status)
        const body = await response.json() as { token: string }
        csrfToken = body.token
        return body.token
      })
      .finally(() => { csrfRequest = null })
  }
  return csrfRequest
}
