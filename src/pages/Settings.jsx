import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Users, Shield, Mail, Edit2, Loader2, Search, X, Save, AlertCircle, CheckCircle2, Lock, Database, Trash2 } from 'lucide-react'
import CadastrosBase from './Cadastros'

function Alert({ type, msg }) {
  if (!msg) return null
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-red-50 border-red-200 text-red-700',
  }
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm mb-4 ${styles[type]}`}>
      <Icon size={15} className="shrink-0" />
      {msg}
    </div>
  )
}

export default function Settings() {
  const { profile: currentUserProfile, fetchAllProfiles, updateUserProfile, sendPasswordReset, deleteUser } = useAuth()
  
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [alertMsg, setAlertMsg] = useState({ type: '', msg: '' })
  
  // Tabs State
  const [activeTab, setActiveTab] = useState('usuarios') // 'usuarios' | 'cadastros'
  
  // Modal State
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ role: 'visualizador', is_active: true })
  const [savingEdit, setSavingEdit] = useState(false)

  const isAdmin = currentUserProfile?.role === 'admin'

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const data = await fetchAllProfiles()
      setUsers(data)
    } catch (err) {
      setAlertMsg({ type: 'error', msg: 'Erro ao carregar usuários: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(email) {
    if (!window.confirm(`Enviar e-mail de redefinição de senha para ${email}?`)) return
    
    try {
      await sendPasswordReset(email)
      setAlertMsg({ type: 'success', msg: `E-mail de recuperação enviado para ${email}` })
    } catch (err) {
      setAlertMsg({ type: 'error', msg: 'Erro ao enviar e-mail: ' + err.message })
    }
  }

  async function handleDeleteUser(user) {
    const name = user.full_name || user.nome || user.email
    if (!window.confirm(`Excluir permanentemente o usuário "${name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteUser(user.id)
      setAlertMsg({ type: 'success', msg: `Usuário "${name}" excluído com sucesso.` })
      loadUsers()
    } catch (err) {
      setAlertMsg({ type: 'error', msg: 'Erro ao excluir usuário: ' + err.message })
    }
  }

  function openEditModal(user) {
    setEditingUser(user)
    setEditForm({
      role: user.role || 'viewer',
      is_active: user.is_active ?? true
    })
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setSavingEdit(true)
    try {
      await updateUserProfile(editingUser.id, editForm)
      setAlertMsg({ type: 'success', msg: `Permissões de ${editingUser.nome || editingUser.full_name} atualizadas.` })
      setEditingUser(null)
      loadUsers() // Reload list to show changes
    } catch (err) {
      setAlertMsg({ type: 'error', msg: 'Erro ao atualizar: ' + err.message })
    } finally {
      setSavingEdit(false)
    }
  }

  const filteredUsers = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.full_name || u.nome || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={22} className="text-blue-500" />
            Gestão de Acessos
          </h2>
          <p className="text-sm text-slate-500">Gerencie os usuários do sistema, permissões e senhas.</p>
        </div>

        {!isAdmin && activeTab === 'usuarios' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl">
            <Lock size={15} />
            Apenas administradores podem editar acessos.
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-colors border-b-2 -mb-px ${
            activeTab === 'usuarios'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Users size={16} />
          Usuários e Acessos
        </button>
        <button
          onClick={() => setActiveTab('cadastros')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-colors border-b-2 -mb-px ${
            activeTab === 'cadastros'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Database size={16} />
          Cadastros Base (Opções)
        </button>
      </div>

      <Alert type={alertMsg.type} msg={alertMsg.msg} />

      {activeTab === 'usuarios' && (
        <div className="space-y-6">
          {/* Users Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário' : 'usuários'}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Grupo de Acesso</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Carregando usuários...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-slate-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const name = user.full_name || user.nome || 'Sem Nome'
                  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                  const isSelf = currentUserProfile?.id === user.id

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
                              {initials}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-800 flex items-center gap-2">
                              {name}
                              {isSelf && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Você</span>}
                            </p>
                            <p className="text-xs text-slate-500">{user.email || 'Sem e-mail'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Shield size={14} className={user.role === 'admin' ? 'text-purple-500' : 'text-slate-400'} />
                          <span className="capitalize text-slate-700 font-medium">
                            {user.role || 'Visualizador'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_active !== false ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetPassword(user.email)}
                            disabled={!isAdmin && !isSelf}
                            title="Enviar link de redefinição de senha"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Mail size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(user)}
                            disabled={!isAdmin}
                            title="Editar permissões"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={!isAdmin || isSelf}
                            title={isSelf ? 'Não é possível excluir sua própria conta' : 'Excluir usuário'}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}

      {activeTab === 'cadastros' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <CadastrosBase />
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && activeTab === 'usuarios' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Editar Permissões</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{editingUser.full_name || editingUser.nome}</p>
                <p className="text-xs text-slate-500">{editingUser.email}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Grupo de Acesso</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 transition-colors"
                >
                  <option value="admin">Administrador (Total Acesso)</option>
                  <option value="user">Editor (Cadastra/Edita)</option>
                  <option value="viewer">Visualizador (Apenas Leitura)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <label className="text-sm font-medium text-slate-800 block">Conta Ativa</label>
                  <p className="text-xs text-slate-500">Se desativado, o usuário não pode acessar o sistema.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={editForm.is_active}
                    onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {currentUserProfile?.id === editingUser.id && !editForm.is_active && (
                <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                  <AlertCircle size={12} /> Você está desativando sua própria conta!
                </p>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
