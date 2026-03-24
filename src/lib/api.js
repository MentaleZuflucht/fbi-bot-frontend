const API_BASE = '/api'

export function getToken() {
  return sessionStorage.getItem('fbi_token')
}

export function setToken(token) {
  sessionStorage.setItem('fbi_token', token)
}

export function clearToken() {
  sessionStorage.removeItem('fbi_token')
}

export function isAuthenticated() {
  return !!getToken()
}

export async function login(password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Login failed')
  }
  const data = await res.json()
  setToken(data.access_token)
  return data
}

export function logout() {
  clearToken()
  window.location.href = '/login'
}

export async function gql(query, variables = {}) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  const json = await res.json()
  if (json.errors) {
    const msg = json.errors[0].message
    if (msg.includes('Authentication required')) {
      clearToken()
      window.location.href = '/login'
    }
    throw new Error(msg)
  }
  return json.data
}
