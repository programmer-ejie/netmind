export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

const toQueryString = (params = {}) => {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })

  const value = query.toString()
  return value ? `?${value}` : ''
}

export const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

export async function apiRequest(path, options = {}) {
  const body = options.body && typeof options.body !== 'string'
    ? JSON.stringify(options.body)
    : options.body

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    body,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (response.status === 204) return null

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with ${response.status}`)
  }

  return payload
}

export const listResource = async (resource, params = {}) => (
  unwrapList(await apiRequest(`/${resource}${toQueryString(params)}`))
)

export const getResource = (resource, id) => apiRequest(`/${resource}/${id}`)

export const createResource = (resource, body) => (
  apiRequest(`/${resource}`, { method: 'POST', body })
)

export const updateResource = (resource, id, body) => (
  apiRequest(`/${resource}/${id}`, { method: 'PATCH', body })
)

export const deleteResource = (resource, id) => (
  apiRequest(`/${resource}/${id}`, { method: 'DELETE' })
)

export const registerUser = async (body) => {
  const payload = await apiRequest('/auth/register', { method: 'POST', body })
  return payload.user || payload
}

export const registerCoachWithTemporaryPassword = async (body) => {
  const payload = await apiRequest('/auth/register-coach', { method: 'POST', body })
  return payload.user || payload
}

export const loginUser = async (body) => apiRequest('/auth/login', { method: 'POST', body })

export const readSavedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('netmind_user') || 'null')
  } catch {
    return null
  }
}

export const saveUser = (user) => {
  if (user) localStorage.setItem('netmind_user', JSON.stringify(user))
}
