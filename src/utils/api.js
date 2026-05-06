const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const getToken = () => sessionStorage.getItem('token')

export const api = async (endpoint, options = {}) => {
  try {
    const token = getToken()

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    })

    let data
    try {
      data = await res.json()
    } catch {
      return { ok: false, error: 'Invalid JSON response' }
    }

    if (!res.ok) {
      return { ok: false, error: data?.error || data?.message || 'Request failed' }
    }

    return data

  } catch (err) {
    console.error('API ERROR:', err)
    return { ok: false, error: 'Server unreachable' }
  }
}

// helpers
export const get = (url) => api(url, { method: 'GET' })
export const post = (url, body) => api(url, { method: 'POST', body: JSON.stringify(body) })
export const put = (url, body) => api(url, { method: 'PUT', body: JSON.stringify(body) })
export const patch = (url, body) => api(url, { method: 'PATCH', body: JSON.stringify(body) })
export const del = (url) => api(url, { method: 'DELETE' })
