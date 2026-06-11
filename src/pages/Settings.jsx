import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Users, Shield, Mail, Edit2, Loader2, Search, X, Save, AlertCircle, CheckCircle2, Lock, Database, Trash2, ImageIcon, Monitor, RotateCcw, Paintbrush, BellRing, ShieldOff, Wrench, Clock, TriangleAlert } from 'lucide-react'
import CadastrosBase from './Cadastros'
import { useBranding, DEFAULTS } from '../context/BrandingContext'
import { useAlerts } from '../context/AlertsContext'
import { usePlatform } from '../hooks/usePlatform'
import { resetData } from '../lib/api'
import { clearAllCache } from '../lib/offlineDB'

const TABS = [
  { id: 'usuarios',  icon: Users,         label: 'Usuários e Acessos', shortLabel: 'Usuários' },
  { id: 'cadastros', icon: Database,      label: 'Cadastros Base',     shortLabel: 'Cadastros' },
  { id: 'aparencia', icon: Paintbrush,    label: 'Aparência',          shortLabel: 'Aparência' },
  { id: 'alertas',   icon: BellRing,      label: 'Alertas',            shortLabel: 'Alertas' },
  { id: 'sistema',   icon: TriangleAlert, label: 'Sistema',            shortLabel: 'Sistema' },
]

const PRESET_COLORS = [
  { label: 'Azul',     color: '#3b82f6' },
  { label: 'Violeta',  color: '#8b5cf6' },
  { label: 'Verde',    color: '#10b981' },
  { label: 'Rosa',     color: '#f43f5e' },
  { label: 'Âmbar',   color: '#f59e0b' },
  { label: 'Ciano',   color: '#06b6d4' },
  { label: 'Ardósia', color: '#64748b' },
  { label: 'Vermelho',color: '#ef4444' },
]

function BrandingTab() {
  const { branding, saveBranding, resetBranding } = useBranding()
  const [form, setForm] = useState({ ...branding })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [logoError, setLogoError] = useState('')
  const logoInputRef = useRef(null)

  // Sync form when branding loads from Supabase
  useEffect(() => {
    setForm({ ...branding })
  }, [branding.companyName, branding.primaryColor, branding.logoUrl, branding.companySubtitle]) // eslint-disable-line react-hooks/exhaustive-deps

  function patch(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleLogoUpload(e) {
    setLogoError('')
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('A imagem deve ter no máximo 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => patch('logoUrl', ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      await saveBranding(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError('Erro ao salvar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!window.confirm('Restaurar todas as configurações de aparência para o padrão?')) return
    setSaving(true)
    setSaveError('')
    try {
      await resetBranding()
      setForm({ ...DEFAULTS })
    } catch (err) {
      setSaveError('Erro ao restaurar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const isPreset = PRESET_COLORS.some(p => p.color === form.primaryColor)

  return (
    <div className="p-6 space-y-8 max-w-2xl">

      {/* Identity */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Identidade da Empresa</h3>
        <p className="text-xs text-slate-400 mb-5">Nome, subtítulo e logotipo exibidos na barra lateral.</p>

        <div className="flex items-start gap-6">
          {/* Logo uploader */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50 transition-colors group"
            >
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-300 group-hover:text-blue-400 transition-colors">
                  <ImageIcon size={26} />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">Logo</span>
                </div>
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="text-[11px] text-blue-500 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                Enviar
              </button>
              {form.logoUrl && (
                <button
                  type="button"
                  onClick={() => patch('logoUrl', null)}
                  className="text-[11px] text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  Remover
                </button>
              )}
            </div>
            {logoError && <p className="text-[10px] text-red-500 text-center max-w-[80px]">{logoError}</p>}
            <p className="text-[10px] text-slate-400 text-center">PNG, SVG ou JPG<br />Máx. 2 MB</p>
          </div>

          {/* Name fields */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Nome da Empresa
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={e => patch('companyName', e.target.value)}
                maxLength={40}
                placeholder={DEFAULTS.companyName}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Subtítulo
              </label>
              <input
                type="text"
                value={form.companySubtitle}
                onChange={e => patch('companySubtitle', e.target.value)}
                maxLength={40}
                placeholder={DEFAULTS.companySubtitle}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Color themes */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Cor de Destaque</h3>
        <p className="text-xs text-slate-400 mb-5">Aplicada nos itens ativos da barra lateral e elementos de ênfase.</p>

        <div className="flex flex-wrap gap-2 mb-5">
          {PRESET_COLORS.map(({ label, color }) => (
            <button
              key={color}
              type="button"
              onClick={() => patch('primaryColor', color)}
              title={label}
              className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all ${
                form.primaryColor === color
                  ? 'border-slate-800 scale-105 shadow'
                  : 'border-transparent hover:border-slate-200 hover:scale-105'
              }`}
            >
              <span className="w-7 h-7 rounded-full shadow-sm block" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-slate-500 font-medium">{label}</span>
            </button>
          ))}

          {/* Custom color picker */}
          <label
            className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
              !isPreset
                ? 'border-slate-800 scale-105 shadow'
                : 'border-transparent hover:border-slate-200 hover:scale-105'
            }`}
            title="Cor personalizada"
          >
            <span
              className="w-7 h-7 rounded-full shadow-sm block relative overflow-hidden border border-slate-200"
              style={!isPreset ? { backgroundColor: form.primaryColor } : {
                background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
              }}
            />
            <span className="text-[10px] text-slate-500 font-medium">Custom</span>
            <input
              type="color"
              value={form.primaryColor}
              onChange={e => patch('primaryColor', e.target.value)}
              className="sr-only"
            />
          </label>
        </div>

        {/* Live preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pré-visualização</p>
          <div className="flex items-center gap-3 mb-3">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="" className="w-9 h-9 object-contain shrink-0" />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: form.primaryColor }}
              >
                <Monitor size={16} className="text-white" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {form.companyName || DEFAULTS.companyName}
              </p>
              <p className="text-xs text-slate-400">
                {form.companySubtitle || DEFAULTS.companySubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1.5 rounded-lg text-xs text-white font-semibold"
              style={{ backgroundColor: form.primaryColor }}
            >
              Item ativo
            </span>
            <span className="px-3 py-1.5 rounded-lg text-xs text-slate-500 bg-slate-200 font-medium">
              Item inativo
            </span>
          </div>
        </div>
      </section>

      {/* Actions */}
      {saveError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          <AlertCircle size={14} className="shrink-0" />
          {saveError}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          <RotateCcw size={14} />
          Restaurar padrão
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-70 ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {saving
            ? <Loader2 size={15} className="animate-spin" />
            : saved
              ? <CheckCircle2 size={15} />
              : <Save size={15} />
          }
          {saving ? 'Salvando...' : saved ? 'Aplicado!' : 'Aplicar'}
        </button>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
    </label>
  )
}

function AlertsTab() {
  const { config, saveConfig, allAlerts, periodicTypes, dismissed, dismissAlert, clearDismissed } = useAlerts()
  const [form, setForm]       = useState({ ...config })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setForm({ ...config })
  }, [config.warrantyEnabled, config.warrantyDays, config.maintenanceEnabled, config.disabledMaintenanceTypes, config.dismissReminderDays]) // eslint-disable-line react-hooks/exhaustive-deps

  function patchForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleMaintenanceType(tipo, enabled) {
    const current = form.disabledMaintenanceTypes ?? []
    const next = enabled
      ? current.filter(t => t !== tipo)
      : [...current, tipo]
    patchForm('disabledMaintenanceTypes', next)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      await saveConfig(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError('Erro ao salvar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const errorCount   = allAlerts.filter(a => a.severity === 'error').length
  const warningCount = allAlerts.filter(a => a.severity === 'warning').length

  return (
    <div className="p-6 space-y-7 max-w-2xl">

      {/* Warranty */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ShieldOff size={15} className="text-amber-500" />
              Alertas de Garantia
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Notificar quando a garantia de um ativo estiver próxima ou vencida.</p>
          </div>
          <Toggle checked={form.warrantyEnabled} onChange={v => patchForm('warrantyEnabled', v)} />
        </div>

        {form.warrantyEnabled && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-600 shrink-0">Alertar com antecedência de</span>
            <input
              type="number"
              min={1}
              max={365}
              value={form.warrantyDays}
              onChange={e => patchForm('warrantyDays', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm text-center text-slate-800 focus:outline-none focus:border-blue-400 bg-white"
            />
            <span className="text-sm text-slate-600 shrink-0">dias antes do vencimento</span>
          </div>
        )}
      </section>

      {/* Maintenance */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Wrench size={15} className="text-blue-500" />
              Alertas de Manutenção
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Notificar manutenções vencidas ou urgentes (≤ 30 dias). Ative/desative por tipo.</p>
          </div>
          <Toggle checked={form.maintenanceEnabled} onChange={v => patchForm('maintenanceEnabled', v)} />
        </div>

        {form.maintenanceEnabled && periodicTypes.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {periodicTypes.map(p => {
              const enabled = !(form.disabledMaintenanceTypes ?? []).includes(p.tipo)
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Wrench size={13} className={enabled ? 'text-blue-400' : 'text-slate-300'} />
                    <div>
                      <p className={`text-sm font-medium ${enabled ? 'text-slate-700' : 'text-slate-400'}`}>{p.tipo}</p>
                      <p className="text-xs text-slate-400">A cada {p.dias} dias</p>
                    </div>
                  </div>
                  <Toggle checked={enabled} onChange={v => toggleMaintenanceType(p.tipo, v)} />
                </div>
              )
            })}
          </div>
        )}

        {form.maintenanceEnabled && periodicTypes.length === 0 && (
          <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            Nenhum período de manutenção periódico cadastrado ainda.
          </p>
        )}
      </section>

      {/* Snooze period */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Clock size={15} className="text-slate-400" />
            Período de Reativação
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Alertas dispensados voltam a aparecer automaticamente após este período — por usuário.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-600 shrink-0">Reativar alertas dispensados após</span>
          <input
            type="number"
            min={1}
            max={365}
            value={form.dismissReminderDays}
            onChange={e => patchForm('dismissReminderDays', Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm text-center text-slate-800 focus:outline-none focus:border-blue-400 bg-white"
          />
          <span className="text-sm text-slate-600 shrink-0">
            dia{form.dismissReminderDays !== 1 ? 's' : ''}
          </span>
        </div>
      </section>

      {/* Dismissed */}
      {dismissed.length > 0 && (
        <section>
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Alertas dispensados</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {dismissed.length} oculto{dismissed.length !== 1 ? 's' : ''} — voltarão em até {config.dismissReminderDays} dia{config.dismissReminderDays !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={clearDismissed}
              className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw size={12} />
              Restaurar todos
            </button>
          </div>
        </section>
      )}

      {/* Preview */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Alertas ativos agora</h3>
          {errorCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
              {errorCount} crítico{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
              {warningCount} aviso{warningCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {allAlerts.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-sm text-slate-400">
            Nenhum alerta ativo com as configurações atuais.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {allAlerts.slice(0, 10).map(alert => (
              <div key={alert.id} className="group flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  alert.severity === 'error' ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  {alert.type === 'warranty'
                    ? <ShieldOff size={13} className={alert.severity === 'error' ? 'text-red-500' : 'text-amber-500'} />
                    : <Wrench    size={13} className={alert.severity === 'error' ? 'text-red-500' : 'text-amber-500'} />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate">{alert.assetName}</p>
                  <p className={`text-xs ${alert.severity === 'error' ? 'text-red-500' : 'text-amber-600'}`}>{alert.label}</p>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  title="Dispensar"
                  className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {allAlerts.length > 10 && (
              <div className="px-4 py-2.5 bg-slate-50 text-xs text-slate-400 text-center">
                +{allAlerts.length - 10} alertas adicionais
              </div>
            )}
          </div>
        )}
      </section>

      {/* Save */}
      {saveError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          <AlertCircle size={14} className="shrink-0" />
          {saveError}
        </div>
      )}
      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-70 ${
            saved ? 'bg-emerald-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {saving
            ? <Loader2 size={15} className="animate-spin" />
            : saved
              ? <CheckCircle2 size={15} />
              : <Save size={15} />
          }
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

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
  const { isAndroid } = usePlatform()

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

  // Reset system state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetOptions, setResetOptions] = useState({ assets: true, masterData: false, users: false })
  const [resetLog, setResetLog] = useState([])

  async function handleResetSystem() {
    setIsResetting(true)
    setResetLog([])
    const log = []
    try {
      if (resetOptions.assets) {
        log.push('Excluindo ativos e manutenções...')
        setResetLog([...log])
        await resetData({ assets: true, masterData: false })
        log.push('✓ Ativos e manutenções excluídos')
        setResetLog([...log])
      }
      if (resetOptions.masterData) {
        log.push('Excluindo dados mestres...')
        setResetLog([...log])
        await resetData({ assets: false, masterData: true })
        log.push('✓ Dados mestres excluídos')
        setResetLog([...log])
      }
      if (resetOptions.users) {
        log.push('Excluindo usuários...')
        setResetLog([...log])
        const others = users.filter(u => u.id !== currentUserProfile?.id)
        for (const u of others) {
          await deleteUser(u.id)
        }
        log.push(`✓ ${others.length} usuário(s) excluído(s)`)
        setResetLog([...log])
      }
      log.push('Limpando cache local...')
      setResetLog([...log])
      await clearAllCache()
      log.push('✓ Cache limpo')
      setResetLog([...log])
      log.push('Concluído! Recarregando...')
      setResetLog([...log])
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      log.push(`Erro: ${err.message}`)
      setResetLog([...log])
      setIsResetting(false)
    }
  }

  const filteredUsers = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.full_name || u.nome || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  })

  return (
    <div className={isAndroid ? '' : 'p-6 max-w-5xl mx-auto space-y-6'}>

      {/* Header — desktop only */}
      {!isAndroid && (
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
      )}

      {/* Tabs — Android: floating pill sticky / Desktop: underline */}
      {isAndroid ? (
        <div className="sticky top-0 z-20 px-3 pt-3 pb-2 bg-slate-50/95 backdrop-blur-sm shrink-0">
          <div className="flex gap-1.5 overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-1" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(({ id, icon: Icon, shortLabel }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-none flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === id ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                <Icon size={15} />
                {shortLabel}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-2 border-b border-slate-200 pb-px">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-colors border-b-2 -mb-px ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className={isAndroid ? 'px-3 pb-6 pt-1 space-y-4' : 'space-y-6'}>

      <Alert type={alertMsg.type} msg={alertMsg.msg} />

      {activeTab === 'usuarios' && (
        <div className="space-y-4">

          {/* Busca */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          {!isAdmin && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl">
              <Lock size={14} />
              Apenas administradores podem editar acessos.
            </div>
          )}

          {/* Android: cards / Desktop: tabela */}
          {isAndroid ? (
            <div className="space-y-3">
              {loading ? (
                <div className="py-10 text-center text-slate-400">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                  Carregando usuários...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">Nenhum usuário encontrado.</div>
              ) : filteredUsers.map(user => {
                const name     = user.full_name || user.nome || 'Sem Nome'
                const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                const isSelf   = currentUserProfile?.id === user.id
                return (
                  <div key={user.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    {/* Row 1: avatar + info + actions */}
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
                          {name}
                          {isSelf && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Você</span>}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{user.email || 'Sem e-mail'}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {(isAdmin || isSelf) && (
                          <button onClick={() => handleResetPassword(user.email)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors">
                            <Mail size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => openEditModal(user)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                            <Edit2 size={16} />
                          </button>
                        )}
                        {isAdmin && !isSelf && (
                          <button onClick={() => handleDeleteUser(user)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Row 2: role + status badges */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Shield size={13} className={user.role === 'admin' ? 'text-purple-500' : 'text-slate-400'} />
                        <span className="capitalize text-xs font-medium text-slate-600">{user.role || 'Visualizador'}</span>
                      </div>
                      <span className="text-slate-200">·</span>
                      {user.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Desktop: tabela */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500 font-medium">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário' : 'usuários'}
                </span>
              </div>
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
                        <td colSpan="4" className="py-10 text-center text-slate-400">Nenhum usuário encontrado.</td>
                      </tr>
                    ) : filteredUsers.map(user => {
                      const name     = user.full_name || user.nome || 'Sem Nome'
                      const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                      const isSelf   = currentUserProfile?.id === user.id
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
                              <span className="capitalize text-slate-700 font-medium">{user.role || 'Visualizador'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {user.is_active !== false ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Inativo
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {(isAdmin || isSelf) && (
                                <button onClick={() => handleResetPassword(user.email)}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                  <Mail size={16} />
                                </button>
                              )}
                              {isAdmin && (
                                <button onClick={() => openEditModal(user)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Edit2 size={16} />
                                </button>
                              )}
                              {isAdmin && !isSelf && (
                                <button onClick={() => handleDeleteUser(user)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cadastros' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <CadastrosBase />
        </div>
      )}

      {activeTab === 'aparencia' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <BrandingTab />
        </div>
      )}

      {activeTab === 'alertas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <AlertsTab />
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

      {/* ── Sistema ─────────────────────────────────────────────────────── */}
      {activeTab === 'sistema' && (
        <div className="space-y-4">
          {!isAdmin ? (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl">
              <Lock size={14} /> Apenas administradores podem acessar esta área.
            </div>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <TriangleAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Zona de perigo — Limpar Sistema</p>
                    <p className="text-xs text-red-500 mt-0.5">
                      Esta ação é irreversível. Os dados serão excluídos permanentemente do banco de dados.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { key: 'assets',     label: 'Ativos e manutenções',          desc: 'Remove todos os ativos cadastrados e histórico de manutenções' },
                    { key: 'masterData', label: 'Dados mestres',                  desc: 'Categorias, setores, responsáveis, marcas, analistas, situações, períodos' },
                    { key: 'users',      label: 'Usuários (exceto você)',          desc: 'Remove todas as contas de acesso exceto a sua própria' },
                  ].map(({ key, label, desc }) => (
                    <label key={key} className="flex items-start gap-3 p-3 bg-white border border-red-100 rounded-xl cursor-pointer hover:bg-red-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={resetOptions[key]}
                        onChange={e => setResetOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="mt-0.5 accent-red-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {!Object.values(resetOptions).some(Boolean) && (
                  <p className="text-xs text-slate-400 text-center">Selecione ao menos uma opção acima.</p>
                )}
              </div>

              {/* Confirmation area */}
              {Object.values(resetOptions).some(Boolean) && !isResetting && resetLog.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <p className="text-sm text-slate-600">
                    Para confirmar, digite <span className="font-bold text-red-600">LIMPAR</span> no campo abaixo:
                  </p>
                  <input
                    type="text"
                    value={resetConfirm}
                    onChange={e => setResetConfirm(e.target.value)}
                    placeholder="Digite LIMPAR"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-red-400 transition-colors"
                    autoComplete="off"
                  />
                  <button
                    onClick={handleResetSystem}
                    disabled={resetConfirm !== 'LIMPAR'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Trash2 size={15} />
                    Confirmar exclusão
                  </button>
                </div>
              )}

              {/* Progress log */}
              {(isResetting || resetLog.length > 0) && (
                <div className="bg-slate-900 rounded-2xl p-4 space-y-1 font-mono text-xs">
                  {resetLog.map((line, i) => (
                    <p key={i} className={line.startsWith('✓') ? 'text-emerald-400' : line.startsWith('Erro') ? 'text-red-400' : 'text-slate-300'}>
                      {line}
                    </p>
                  ))}
                  {isResetting && (
                    <p className="text-blue-400 flex items-center gap-1.5">
                      <Loader2 size={11} className="animate-spin" /> aguardando...
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      </div>{/* end scrollable content */}
    </div>
  )
}
