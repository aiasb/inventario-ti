const BUILD_URL = import.meta.env.VITE_API_URL ?? ''

export function getServerUrl() {
  return localStorage.getItem('api_server_url') || BUILD_URL
}

export function setServerUrl(url) {
  const clean = (url || '').trim().replace(/\/$/, '')
  if (clean) localStorage.setItem('api_server_url', clean)
  else localStorage.removeItem('api_server_url')
}

export function getToken() {
  return localStorage.getItem('auth_token')
}

export function setToken(token) {
  if (token) localStorage.setItem('auth_token', token)
  else localStorage.removeItem('auth_token')
}

export async function apiFetch(path, options = {}) {
  const baseUrl = getServerUrl()
  const token   = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers })

  if (res.status === 204) return null

  const body = await res.json().catch(() => ({}))

  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)

  return body
}
