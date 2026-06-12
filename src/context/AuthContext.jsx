import { createContext, useContext, useState, useEffect } from 'react'
import { apiFetch, setToken, getToken } from '../lib/api-client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }

    apiFetch('/api/auth/me')
      .then(u => { setUser(u); setProfile(u) })
      .catch(() => { setToken(null) })
      .finally(() => setLoading(false))
  }, [])

  async function signIn(email, password) {
    const { token, user } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(token)
    setUser(user)
    setProfile(user)
  }

  async function signUp(email, password, fullName) {
    const { token, user } = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    })
    setToken(token)
    setUser(user)
    setProfile(user)
  }

  async function signOut() {
    setToken(null)
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    const updated = await apiFetch('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    setProfile(updated)
    setUser(updated)
    return updated
  }

  async function updatePassword(newPassword) {
    await apiFetch('/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ password: newPassword }),
    })
  }

  // ─── Admin / gerenciamento de usuários ───────────────────────────────────

  async function fetchAllProfiles() {
    return apiFetch('/api/admin/users')
  }

  async function updateUserProfile(userId, updates) {
    const updated = await apiFetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    if (user?.id === userId) { setProfile(updated); setUser(updated) }
    return updated
  }

  async function sendPasswordReset(email) {
    const result = await apiFetch('/api/admin/send-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    return result // { tempPassword }
  }

  async function deleteUser(userId) {
    await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      updatePassword,
      fetchAllProfiles,
      updateUserProfile,
      sendPasswordReset,
      deleteUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
