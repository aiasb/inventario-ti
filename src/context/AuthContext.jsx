import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // Perfil não existe ainda — cria automaticamente com dados do auth
    if (!data) {
      const { data: authData } = await supabase.auth.getUser()
      const meta = authData?.user?.user_metadata ?? {}
      const name = meta.full_name || meta.name || ''
      const email = authData?.user?.email || ''

      const { data: created } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email,
          full_name: name,
          nome: name,
          is_active: true,
          role: 'viewer',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      setProfile(created ?? null)
      return
    }

    if (data.is_active === false) {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      return
    }

    setProfile(data)
  }

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      setLoading(false)
    })

    // Ouvir mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error

    // Cria o perfil imediatamente quando não há confirmação de e-mail,
    // ou tenta criar antecipadamente (o trigger no Supabase é o complemento ideal).
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        nome: fullName,
        is_active: true,
        role: 'viewer',
        updated_at: new Date().toISOString(),
      })
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateProfile(updates) {
    if (!user) return
    
    const payload = { 
      id: user.id, 
      ...updates, 
      updated_at: new Date().toISOString() 
    }

    // Caso a tabela original já tivesse as colunas "nome" ou "email" obrigatórias
    if (updates.full_name !== undefined) {
      payload.nome = updates.full_name
    }
    if (user.email) {
      payload.email = user.email
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  // --- Admin / User Management Functions ---

  async function fetchAllProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })
    if (error) throw error
    return data
  }

  async function updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    // If updating own profile, sync state
    if (user && user.id === userId) {
      setProfile(data)
    }
    return data
  }

  async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  async function deleteUser(userId) {
    const { error } = await supabase.rpc('delete_user', { target_user_id: userId })
    if (error) throw error
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
