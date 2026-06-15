import { useState, useEffect, useCallback } from 'react'
import { Users, ServerCog, Plus, Edit2, Trash2, RefreshCw, Wifi, WifiOff, CheckCircle2, XCircle, Loader2, X, Save, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { useMasterData } from '../context/MasterDataContext'
import { useAssets } from '../context/AssetsContext'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api-client'
import CrudTable from '../components/cadastros/CrudTable'

// ─── LDAP Helpers ─────────────────────────────────────────────────────────────

const LDAP_DEFAULTS = {
  nome: '', host: '', porta: 389, usar_ssl: false,
  base_dn: '', bind_dn: '', bind_password: '',
  filtro: '(&(objectClass=user)(objectCategory=person))',
  attr_nome: 'displayName', attr_email: 'mail',
  attr_setor: 'department', attr_telefone: 'telephoneNumber',
  sync_intervalo_h: 24, ativo: true,
}

function fmtDate(str) {
  if (!str) return null
  return new Date(str).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const inputCls = 'w-full text-sm rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 dark:focus:border-blue-500'

function LdapField({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{hint}</p>}
    </div>
  )
}

// ─── LDAP Server Form Modal ────────────────────────────────────────────────────

function LdapServerModal({ server, onSave, onClose }) {
  const [form, setForm]       = useState(server ? { ...server, bind_password: '••••••••' } : { ...LDAP_DEFAULTS })
  const [saving, setSaving]   = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showPass, setShowPass]     = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors]   = useState({})

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'usar_ssl') next.porta = v ? 636 : 389
      return next
    })
    setErrors(e => ({ ...e, [k]: null }))
    setTestResult(null)
  }

  function validate() {
    const e = {}
    if (!form.nome?.trim())  e.nome    = 'Obrigatório'
    if (!form.host?.trim())  e.host    = 'Obrigatório'
    if (!form.base_dn?.trim()) e.base_dn = 'Obrigatório'
    if (!form.bind_dn?.trim()) e.bind_dn = 'Obrigatório'
    if (!server && !form.bind_password?.trim()) e.bind_password = 'Obrigatório'
    return e
  }

  async function handleTest() {
    if (!server) { setTestResult({ ok: false, error: 'Salve o servidor antes de testar.' }); return }
    setTesting(true); setTestResult(null)
    try {
      const res = await apiFetch(`/api/ldap/servidores/${server.id}/test`, { method: 'POST' })
      setTestResult(res)
    } catch (err) {
      setTestResult({ ok: false, error: err.message })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setErrors({ _global: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ServerCog size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {server ? 'Editar Servidor LDAP' : 'Novo Servidor LDAP'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {errors._global && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2">{errors._global}</p>
          )}

          {/* Identificação */}
          <LdapField label="Nome do servidor" required>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Domínio Principal (CACU-AD)"
              className={`${inputCls} ${errors.nome ? 'border-red-300' : ''}`} />
            {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
          </LdapField>

          {/* Conexão */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <LdapField label="Host / Endereço" required>
                <input value={form.host} onChange={e => set('host', e.target.value)}
                  placeholder="Ex: 192.168.1.100 ou ad.empresa.com"
                  className={`${inputCls} ${errors.host ? 'border-red-300' : ''}`} />
                {errors.host && <p className="text-xs text-red-500">{errors.host}</p>}
              </LdapField>
            </div>
            <LdapField label="Porta">
              <input type="number" value={form.porta} onChange={e => set('porta', Number(e.target.value))}
                className={inputCls} />
            </LdapField>
          </div>

          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <div className={`w-10 h-5 rounded-full transition-colors ${form.usar_ssl ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              onClick={() => set('usar_ssl', !form.usar_ssl)}>
              <div className={`w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-transform ${form.usar_ssl ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-200">Usar SSL/TLS (LDAPS)</span>
          </label>

          {/* Base DN */}
          <LdapField label="Base DN" required hint="Raiz da busca. Ex: DC=empresa,DC=local">
            <input value={form.base_dn} onChange={e => set('base_dn', e.target.value)}
              placeholder="DC=empresa,DC=local"
              className={`${inputCls} font-mono text-xs ${errors.base_dn ? 'border-red-300' : ''}`} />
            {errors.base_dn && <p className="text-xs text-red-500">{errors.base_dn}</p>}
          </LdapField>

          {/* Bind DN + Senha */}
          <LdapField label="Bind DN (conta de serviço)" required hint="Ex: CN=srv_inventario,OU=Service,DC=empresa,DC=local">
            <input value={form.bind_dn} onChange={e => set('bind_dn', e.target.value)}
              placeholder="CN=srv_inventario,DC=empresa,DC=local"
              className={`${inputCls} font-mono text-xs ${errors.bind_dn ? 'border-red-300' : ''}`} />
            {errors.bind_dn && <p className="text-xs text-red-500">{errors.bind_dn}</p>}
          </LdapField>

          <LdapField label="Senha da conta de serviço" required={!server}>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.bind_password}
                onChange={e => set('bind_password', e.target.value)}
                onFocus={e => { if (e.target.value === '••••••••') set('bind_password', '') }}
                placeholder={server ? 'Deixe em branco para manter a atual' : 'Senha da conta de serviço'}
                className={`${inputCls} pr-10 ${errors.bind_password ? 'border-red-300' : ''}`}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.bind_password && <p className="text-xs text-red-500">{errors.bind_password}</p>}
          </LdapField>

          {/* Advanced */}
          <button type="button" onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Configurações avançadas
          </button>

          {showAdvanced && (
            <div className="space-y-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <LdapField label="Filtro LDAP" hint="Filtro para buscar usuários no AD">
                <input value={form.filtro} onChange={e => set('filtro', e.target.value)}
                  className={`${inputCls} font-mono text-xs`} />
              </LdapField>

              <div className="grid grid-cols-2 gap-3">
                <LdapField label="Atributo Nome" hint="displayName ou cn">
                  <input value={form.attr_nome} onChange={e => set('attr_nome', e.target.value)} className={`${inputCls} font-mono text-xs`} />
                </LdapField>
                <LdapField label="Atributo E-mail" hint="mail">
                  <input value={form.attr_email} onChange={e => set('attr_email', e.target.value)} className={`${inputCls} font-mono text-xs`} />
                </LdapField>
                <LdapField label="Atributo Setor" hint="department">
                  <input value={form.attr_setor} onChange={e => set('attr_setor', e.target.value)} className={`${inputCls} font-mono text-xs`} />
                </LdapField>
                <LdapField label="Atributo Telefone" hint="telephoneNumber">
                  <input value={form.attr_telefone} onChange={e => set('attr_telefone', e.target.value)} className={`${inputCls} font-mono text-xs`} />
                </LdapField>
              </div>

              <LdapField label="Intervalo de sincronização (horas)" hint="0 = somente manual">
                <input type="number" min="0" max="168" value={form.sync_intervalo_h}
                  onChange={e => set('sync_intervalo_h', Number(e.target.value))} className={inputCls} />
              </LdapField>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <div className={`w-10 h-5 rounded-full transition-colors ${form.ativo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              onClick={() => set('ativo', !form.ativo)}>
              <div className={`w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-transform ${form.ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-200">Servidor ativo (sincronização automática)</span>
          </label>

          {/* Test result */}
          {testResult && (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm ${
              testResult.ok
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
            }`}>
              {testResult.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {testResult.ok ? testResult.message : testResult.error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0 gap-3">
          <button type="button" onClick={handleTest} disabled={!server || testing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors disabled:opacity-40">
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
            Testar conexão
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {server ? 'Salvar alterações' : 'Adicionar servidor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── LDAP Tab ──────────────────────────────────────────────────────────────────

function TabLdap() {
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin'
  const [servers, setServers]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(null)  // null=closed, false=new, obj=edit
  const [syncing, setSyncing]     = useState({})    // id -> bool
  const [syncResults, setSyncResults] = useState({}) // id -> result

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/api/ldap/servidores')
      .then(setServers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(form) {
    if (editing && editing.id) {
      const updated = await apiFetch(`/api/ldap/servidores/${editing.id}`, {
        method: 'PUT', body: JSON.stringify(form),
      })
      setServers(prev => prev.map(s => s.id === updated.id ? updated : s))
    } else {
      const created = await apiFetch('/api/ldap/servidores', {
        method: 'POST', body: JSON.stringify(form),
      })
      setServers(prev => [...prev, created])
    }
  }

  async function handleDelete(srv) {
    if (!window.confirm(`Excluir servidor "${srv.nome}"? Os responsáveis importados permanecerão na lista.`)) return
    await apiFetch(`/api/ldap/servidores/${srv.id}`, { method: 'DELETE' })
    setServers(prev => prev.filter(s => s.id !== srv.id))
  }

  async function handleSync(srv) {
    setSyncing(s => ({ ...s, [srv.id]: true }))
    setSyncResults(r => ({ ...r, [srv.id]: null }))
    try {
      const res = await apiFetch(`/api/ldap/servidores/${srv.id}/sync`, { method: 'POST' })
      setSyncResults(r => ({ ...r, [srv.id]: res }))
      load()
    } catch (err) {
      setSyncResults(r => ({ ...r, [srv.id]: { ok: false, error: err.message } }))
    } finally {
      setSyncing(s => ({ ...s, [srv.id]: false }))
    }
  }

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configure os servidores Active Directory para importar e sincronizar responsáveis automaticamente.
        </p>
        {canEdit && (
          <button onClick={() => setEditing(false)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors shrink-0">
            <Plus size={15} />
            Adicionar servidor
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <Loader2 size={20} className="animate-spin mr-2" /> Carregando...
        </div>
      ) : servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-3">
          <ServerCog size={36} className="opacity-30" />
          <p className="text-sm">Nenhum servidor LDAP configurado.</p>
          {canEdit && (
            <button onClick={() => setEditing(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
              <Plus size={14} /> Adicionar o primeiro servidor
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map(srv => {
            const result = syncResults[srv.id]
            return (
              <div key={srv.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="flex items-start gap-4 p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${srv.ativo ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <ServerCog size={20} className={srv.ativo ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">{srv.nome}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${srv.ativo ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        {srv.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      {srv.usar_ssl ? 'ldaps' : 'ldap'}://{srv.host}:{srv.porta}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-xs">{srv.base_dn}</span>
                      {srv.last_sync && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          Último sync: {fmtDate(srv.last_sync)}
                        </span>
                      )}
                      {srv.sync_intervalo_h > 0 && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          Auto a cada {srv.sync_intervalo_h}h
                        </span>
                      )}
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleSync(srv)} disabled={syncing[srv.id]}
                        title="Sincronizar agora"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-40">
                        {syncing[srv.id] ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        Sincronizar
                      </button>
                      <button onClick={() => setEditing(srv)} title="Editar"
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(srv)} title="Excluir"
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {result && (
                  <div className={`px-5 py-3 border-t text-sm flex items-center gap-2 ${
                    result.ok
                      ? 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/15 text-red-700 dark:text-red-300'
                  }`}>
                    {result.ok
                      ? <><CheckCircle2 size={15} /> {result.total} usuários encontrados — <strong>{result.created}</strong> criados, <strong>{result.updated}</strong> atualizados{result.skipped > 0 ? `, ${result.skipped} ignorados` : ''}</>
                      : <><XCircle size={15} /> Erro: {result.error}</>
                    }
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editing !== null && (
        <LdapServerModal
          server={editing || null}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Responsaveis() {
  const { responsaveis, setores } = useMasterData()
  const { assets } = useAssets()
  const [tab, setTab] = useState('lista')

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'setor', label: 'Setor' },
    { key: 'email', label: 'E-mail' },
    { key: 'telefone', label: 'Telefone' },
  ]

  const formFields = [
    { key: 'nome', label: 'Nome completo', required: true, placeholder: 'Ex: João Silva' },
    {
      key: 'setor',
      label: 'Setor',
      type: 'select',
      options: setores.items.map(s => ({ value: s.nome, label: s.nome })),
    },
    { key: 'email', label: 'E-mail', placeholder: 'joao@empresa.com' },
    { key: 'telefone', label: 'Telefone', placeholder: 'Ex: (17) 99999-0000' },
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <Users size={20} className="text-blue-500 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestão de Responsáveis</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pessoas atribuídas aos ativos de TI</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {[
          { id: 'lista',  label: 'Responsáveis', icon: Users },
          { id: 'ldap',   label: 'Servidores LDAP', icon: ServerCog },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'lista' && (
        <CrudTable
          title="Responsáveis"
          subtitle="Lista completa de colaboradores e contatos"
          items={[...responsaveis.items].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))}
          columns={columns}
          formFields={formFields}
          emptyForm={{ nome: '', setor: '', email: '', telefone: '' }}
          onAdd={responsaveis.add}
          onUpdate={responsaveis.update}
          onDelete={responsaveis.remove}
          searchKeys={['nome', 'setor', 'email']}
          isInUse={(item) => assets.filter(a => a.assignedTo === item.nome).length}
        />
      )}

      {tab === 'ldap' && <TabLdap />}
    </div>
  )
}
