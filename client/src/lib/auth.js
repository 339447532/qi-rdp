const API_BASE_URL = import.meta.env.VITE_SIGNAL_SERVER_URL || 'http://localhost:3000'
const AUTH_STORAGE_KEY = 'qi-rdp-auth'

export function getApiBaseUrl() {
  return API_BASE_URL
}

export function loadStoredAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function persistAuth(auth) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })

  const data = await response.json()
  if (!response.ok || data.success === false) {
    throw new Error(data.message || '请求失败')
  }

  return data
}

export async function registerAccount(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loginAccount(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchCurrentUser(token) {
  return request('/auth/me', {
    method: 'GET',
    token,
  })
}

export async function updateRecentConnectionFavorite(token, targetUserId, favorite) {
  return request(`/auth/recent-connections/${targetUserId}/favorite`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ favorite }),
  })
}
