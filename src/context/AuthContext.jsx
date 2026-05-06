import { createContext, useContext, useState, useEffect } from 'react'
import { post, get, put, patch } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)   // true while checking existing session
  const [users, setUsers] = useState([])

  const fetchUsers = async () => {
    const res = await get('/users')
    if (res.ok) setUsers(res.users.map(u => ({ ...u, id: u._id })))
  }

  useEffect(() => {
    if (currentUser?.role === 'Admin') fetchUsers()
  }, [currentUser])

  // ── On mount: if a token exists, restore session via GET /api/auth/me ──
  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    get('/auth/me')
      .then(res => {
        if (res.ok) {
          setCurrentUser(res.user)
        } else {
          // Token invalid or expired — clear it
          sessionStorage.removeItem('token')
        }
      })
      .catch(() => {
        sessionStorage.removeItem('token')
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Login ────────────────────────────────────────────────────────────────
  const login = async (username, password) => {
    const res = await post('/auth/login', { username, password })
    if (!res.ok) return { ok: false, error: res.error || 'Login failed.' }
    sessionStorage.setItem('token', res.token)
    setCurrentUser(res.user)
    return { ok: true, user: res.user }
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    sessionStorage.removeItem('token')
    setCurrentUser(null)
  }

  // ── Signup (includes admin approval in one request) ──────────────────────
  const signup = async (data) => {
    const res = await post('/auth/signup', {
      username: data.username,
      name: data.name,
      email: data.email,
      contact: data.contact,
      role: data.role,
      password: data.password,
      adminUsername: data.adminUsername,
      adminPassword: data.adminPassword,
    })
    if (!res.ok) return { ok: false, error: res.error || 'Signup failed.' }
    return { ok: true, message: res.message }
  }

  // ── Verify Admin (for the approval modal) ────────────────────────────────
  const verifyAdmin = async (username, password) => {
    const res = await post('/auth/verify-admin', { username, password })
    if (!res.ok) return { ok: false, error: res.error || 'Invalid admin credentials.' }
    return { ok: true, admin: res.admin }
  }

  // ── Update Profile ───────────────────────────────────────────────────────
  const updateProfile = async (updates) => {
    const res = await put('/auth/update-profile', updates)
    if (!res.ok) return { ok: false, error: res.error || 'Update failed.' }
    setCurrentUser(res.user)
    return { ok: true, user: res.user }
  }

  // ── Change Password ──────────────────────────────────────────────────────
  const changePassword = async (oldPassword, newPassword) => {
    const res = await put('/auth/change-password', { oldPassword, newPassword })
    if (!res.ok) return { ok: false, error: res.error || 'Password change failed.' }
    return { ok: true }
  }

  const archiveUser = async (id) => {
    const res = await patch(`/users/${id}/archive`)
    if (res.ok) setUsers(p => p.map(u => u.id === id ? { ...u, isArchived: true } : u))
  }

  const restoreUser = async (id) => {
    const res = await patch(`/users/${id}/restore`)
    if (res.ok) setUsers(p => p.map(u => u.id === id ? { ...u, isArchived: false } : u))
  }

  const adminUpdateUser = async (id, updates) => {
    const res = await put(`/users/${id}`, updates)
    if (!res.ok) return { ok: false, error: res.error || 'Update failed.' }
    setUsers(p => p.map(u => u.id === id ? { ...u, ...res.user, id: res.user._id } : u))
    return { ok: true, user: res.user }
  }

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      users,
      archiveUser,
      restoreUser,
      login,
      logout,
      signup,
      verifyAdmin,
      updateProfile,
      changePassword,
      adminUpdateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
