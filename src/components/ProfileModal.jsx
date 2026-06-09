import { useState } from 'react'
import { X, Save, Loader2, User, Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Camera } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const inputCls = 'w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors'

function Alert({ type, msg }) {
  if (!msg) return null
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-red-50 border-red-200 text-red-700',
  }
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm ${styles[type]}`}>
      <Icon size={15} className="shrink-0" />
      {msg}
    </div>
  )
}

export default function ProfileModal({ onClose }) {
  const { user, profile, updateProfile, updatePassword } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)

  const [profileMsg, setProfileMsg] = useState({ type: '', msg: '' })
  const [pwdMsg, setPwdMsg] = useState({ type: '', msg: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  const initials = (fullName || user?.email || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg({ type: '', msg: '' })
    try {
      await updateProfile({ full_name: fullName, username, avatar_url: avatarUrl })
      setProfileMsg({ type: 'success', msg: 'Perfil atualizado com sucesso!' })
    } catch (err) {
      setProfileMsg({ type: 'error', msg: err.message })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwdMsg({ type: '', msg: '' })
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', msg: 'Nova senha deve ter ao menos 6 caracteres.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', msg: 'As senhas não coincidem.' })
      return
    }
    setSavingPwd(true)
    try {
      await updatePassword(newPassword)
      setPwdMsg({ type: 'success', msg: 'Senha alterada com sucesso!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwdMsg({ type: 'error', msg: err.message })
    } finally {
      setSavingPwd(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <User size={16} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Editar Perfil</h2>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                  onError={() => setAvatarUrl('')}
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold border-2 border-slate-200">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <p className="text-xs text-slate-400">Cole a URL de uma imagem abaixo</p>
          </div>

          {/* ── Dados do perfil ── */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Informações Pessoais</h3>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Nome completo</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="João Silva"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Nome de usuário</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="joaosilva"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Mail size={12} />
                  E-mail
                </div>
              </label>
              <input
                value={user?.email ?? ''}
                disabled
                className={`${inputCls} bg-slate-50 text-slate-400 cursor-not-allowed`}
              />
              <p className="text-xs text-slate-400 mt-1">O e-mail não pode ser alterado aqui.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">URL do avatar (opcional)</label>
              <input
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
            </div>

            <Alert type={profileMsg.type} msg={profileMsg.msg} />

            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {savingProfile ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Salvar perfil
            </button>
          </form>

          <hr className="border-slate-100" />

          {/* ── Alterar senha ── */}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Lock size={14} />
              Alterar Senha
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Nova senha</label>
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={`${inputCls} pr-10`}
                />
                <button type="button" onClick={() => setShowNewPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Confirmar nova senha</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className={`${inputCls} pr-10`}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Alert type={pwdMsg.type} msg={pwdMsg.msg} />

            <button
              type="submit"
              disabled={savingPwd || !newPassword}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {savingPwd ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              Alterar senha
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
