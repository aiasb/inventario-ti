import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Save, Loader2, ScanBarcode, UserPlus, AlertTriangle } from 'lucide-react'
import DatePicker from './DatePicker'
import { useAssets } from '../context/AssetsContext'
import { useMasterData } from '../context/MasterDataContext'

import BarcodeScannerModal from './BarcodeScannerModal'
import CustomSelect from './CustomSelect'

const TRACKED_KEYS = [
  'name', 'category', 'status', 'serialNumber', 'brand', 'model',
  'department', 'assignedTo', 'memory', 'storage',
  'purchaseDate', 'warrantyExpiry', 'location', 'notes',
]

const EMPTY = {
  name: '', category: '', status: '',
  serialNumber: '', brand: '', model: '', department: '', assignedTo: '',
  memory: '', storage: '',
  purchaseDate: '', warrantyExpiry: '', location: '', notes: '',
}

function Field({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  )
}

const inputClass = [
  'w-full text-sm rounded-lg px-3 py-2',
  'border border-slate-200 dark:border-slate-600',
  'bg-white dark:bg-slate-800',
  'text-slate-800 dark:text-slate-100',
  'placeholder-slate-400 dark:placeholder-slate-500',
  'focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100',
  'dark:focus:border-blue-500 dark:focus:ring-blue-500/20',
].join(' ')

// ── Mini-modal de cadastro rápido de responsável ──────────────────────────────
function QuickAddResponsavel({ setores, onSave, onClose }) {
  const [nome, setNome]     = useState('')
  const [setor, setSetor]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nome.trim()) { setError('Nome obrigatório'); return }
    setSaving(true)
    try {
      await onSave({ nome: nome.trim(), setor })
    } catch (err) {
      setError(err.message ?? 'Erro ao cadastrar')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <UserPlus size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Novo Responsável</h3>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Field label="Nome completo" required>
            <input autoFocus value={nome} onChange={e => { setNome(e.target.value); setError('') }}
              placeholder="Ex: João Silva" className={inputClass} />
          </Field>
          <Field label="Setor">
            <CustomSelect value={setor} onChange={setSetor} placeholder="Selecione um setor..."
              options={setores.items.map(s => ({ value: s.nome, label: s.nome }))} />
          </Field>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {saving ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Diálogo de confirmação de saída ──────────────────────────────────────────
function ExitConfirmDialog({ saving, onSave, onDiscard, onContinue }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onContinue} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-5">

        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle size={22} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Alterações não salvas</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Deseja salvar as alterações antes de sair?
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salvar alterações
          </button>
          <button
            onClick={onDiscard}
            className="w-full px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            Descartar e sair
          </button>
          <button
            onClick={onContinue}
            className="w-full px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Continuar editando
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AssetForm({ asset, onClose }) {
  const { addAsset, updateAsset } = useAssets()
  const { responsaveis, setores, categorias, marcas, situacoes } = useMasterData()
  const emUsoId = situacoes.items.find(s => s.nome?.toLowerCase().includes('uso'))?.id ?? null

  const isEdit = !!asset

  // Snapshot of asset at open time — used for change detection
  const original = useMemo(() => {
    if (!isEdit) return null
    return {
      ...asset,
      purchaseDate:   asset.purchaseDate   ? asset.purchaseDate.split('T')[0]   : '',
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
    }
  }, []) // eslint-disable-line

  const [form, setForm] = useState(() => {
    if (isEdit) return { ...original }
    return {
      ...EMPTY,
      category:   categorias.items[0]?.id  ?? '',
      department: setores.items[0]?.nome   ?? '',
    }
  })
  const [errors, setErrors]           = useState({})
  const [saving, setSaving]           = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showQuickAdd, setShowQuickAdd]   = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Keep latest values accessible in event listeners without re-registering
  const hasChanges = isEdit && TRACKED_KEYS.some(k => String(form[k] ?? '') !== String(original[k] ?? ''))
  const hasChangesRef      = useRef(hasChanges)
  const showScannerRef     = useRef(showScanner)
  const showQuickAddRef    = useRef(showQuickAdd)
  const showExitConfirmRef = useRef(showExitConfirm)
  useEffect(() => { hasChangesRef.current      = hasChanges },      [hasChanges])
  useEffect(() => { showScannerRef.current     = showScanner },     [showScanner])
  useEffect(() => { showQuickAddRef.current    = showQuickAdd },    [showQuickAdd])
  useEffect(() => { showExitConfirmRef.current = showExitConfirm }, [showExitConfirm])

  // Intercept Android back button via popstate (more reliable than Capacitor App.addListener,
  // which has an async-handle race condition and may conflict with React Router).
  // We push a dummy history entry on mount so back fires popstate instead of navigating away.
  useEffect(() => {
    if (!isEdit) return

    window.history.pushState({ __assetForm: true }, '')

    function onPopstate() {
      // Close sub-modals first (each one re-pushes state to stay in history)
      if (showScannerRef.current) {
        setShowScanner(false)
        window.history.pushState({ __assetForm: true }, '')
        return
      }
      if (showQuickAddRef.current) {
        setShowQuickAdd(false)
        window.history.pushState({ __assetForm: true }, '')
        return
      }
      if (showExitConfirmRef.current) {
        setShowExitConfirm(false)
        window.history.pushState({ __assetForm: true }, '')
        return
      }
      // Main form: show dialog if dirty, else close
      if (hasChangesRef.current) {
        window.history.pushState({ __assetForm: true }, '')
        setShowExitConfirm(true)
      } else {
        onClose()
      }
    }

    window.addEventListener('popstate', onPopstate)
    return () => {
      window.removeEventListener('popstate', onPopstate)
      // Remove the history entry we pushed if modal is closing programmatically
      if (window.history.state?.__assetForm) {
        window.history.back()
      }
    }
  }, [isEdit]) // eslint-disable-line

  function requestClose() {
    if (isEdit && hasChanges) {
      setShowExitConfirm(true)
    } else {
      onClose()
    }
  }

  function handleScan(text) {
    set('serialNumber', text.trim())
    setShowScanner(false)
  }

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Hostname obrigatório'
    if (!form.serialNumber.trim()) e.serialNumber = 'Serial obrigatório'
    if (emUsoId && form.status === emUsoId && !form.assignedTo) e.assignedTo = 'Responsável obrigatório quando em uso'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      if (isEdit) await updateAsset(asset.id, form)
      else await addAsset(form)
      onClose()
    } catch (err) {
      console.error('Erro ao salvar ativo:', err)
      setSaving(false)
    }
  }

  async function handleSaveAndClose() {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      setShowExitConfirm(false)
      return
    }
    setSaving(true)
    try {
      await updateAsset(asset.id, form)
      onClose()
    } catch (err) {
      console.error('Erro ao salvar ativo:', err)
      setSaving(false)
      setShowExitConfirm(false)
    }
  }

  async function handleQuickAddResponsavel(data) {
    const created = await responsaveis.add(data)
    set('assignedTo', created.nome)
    setShowQuickAdd(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {isEdit ? 'Editar Ativo' : 'Novo Ativo'}
            </h2>
            {isEdit && hasChanges && (
              <p className="text-xs text-amber-500 dark:text-amber-400 mt-0.5">Alterações não salvas</p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Row 1 — Hostname + Serial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Hostname" required>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Ex: nb-ti-joao01"
                className={`${inputClass} ${errors.name ? 'border-red-300 dark:border-red-500' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </Field>
            <Field label="Número de Série" required>
              <div className="flex gap-2">
                <input
                  value={form.serialNumber}
                  onChange={e => set('serialNumber', e.target.value)}
                  placeholder="Ex: SN-DL-001"
                  className={`${inputClass} flex-1 ${errors.serialNumber ? 'border-red-300 dark:border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  title="Escanear com câmera"
                  className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 active:scale-95 transition-all"
                >
                  <ScanBarcode size={18} />
                </button>
              </div>
              {errors.serialNumber && <p className="text-xs text-red-500">{errors.serialNumber}</p>}
            </Field>
          </div>

          {/* Row 2 — Categoria + Marca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoria" hint={categorias.items.length === 0 ? 'Nenhuma categoria cadastrada.' : undefined}>
              <CustomSelect value={form.category} onChange={v => set('category', v)}
                placeholder="Selecione..." options={categorias.items.map(c => ({ value: c.id, label: c.label }))} />
            </Field>
            <Field label="Marca" hint={marcas.items.length === 0 ? 'Nenhuma marca cadastrada.' : undefined}>
              <CustomSelect value={form.brand} onChange={v => set('brand', v)}
                placeholder="Selecione..." options={marcas.items.map(m => ({ value: m.nome, label: m.nome }))} />
            </Field>
          </div>

          {/* Row 3 — Modelo + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Modelo">
              <input value={form.model} onChange={e => set('model', e.target.value)}
                placeholder="Ex: Latitude 5520" className={inputClass} />
            </Field>
            <Field label="Status" hint={situacoes.items.length === 0 ? 'Nenhum status cadastrado. Vá em Cadastros > Status.' : undefined}>
              <CustomSelect value={form.status} onChange={v => set('status', v)}
                placeholder="Selecione o status..." options={situacoes.items.map(s => ({ value: s.id, label: s.nome }))} />
            </Field>
          </div>

          {/* Row 4 — Memória + Disco */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Memória RAM">
              <input value={form.memory} onChange={e => set('memory', e.target.value)}
                placeholder="Ex: 16 GB DDR4" className={inputClass} />
            </Field>
            <Field label="Armazenamento (Disco)">
              <input value={form.storage} onChange={e => set('storage', e.target.value)}
                placeholder="Ex: 512 GB SSD NVMe" className={inputClass} />
            </Field>
          </div>

          {/* Row 5 — Setor + Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Setor" hint={setores.items.length === 0 ? 'Nenhum setor cadastrado.' : undefined}>
              <CustomSelect value={form.department} onChange={v => set('department', v)}
                placeholder="Selecione..." options={setores.items.map(s => ({ value: s.nome, label: s.nome }))} />
            </Field>
            <Field
              label="Responsável"
              required={!!emUsoId && form.status === emUsoId}
              hint={emUsoId && form.status === emUsoId ? 'Obrigatório quando o ativo está em uso.' : undefined}
            >
              <CustomSelect
                value={form.assignedTo}
                onChange={v => { set('assignedTo', v) }}
                placeholder={emUsoId && form.status === emUsoId ? 'Selecione o responsável...' : 'Sem responsável'}
                error={!!errors.assignedTo}
                options={[
                  ...(!emUsoId || form.status !== emUsoId
                    ? [{ value: '', label: 'Sem responsável' }]
                    : []),
                  ...responsaveis.items.map(r => ({ value: r.nome, label: r.nome })),
                ]}
                footerAction={{
                  label: 'Cadastrar novo responsável',
                  icon: <UserPlus size={14} />,
                  onClick: () => setShowQuickAdd(true),
                }}
              />
              {errors.assignedTo && <p className="text-xs text-red-500 mt-1">{errors.assignedTo}</p>}
            </Field>
          </div>

          {/* Row 6 — Datas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Data de Compra">
              <DatePicker value={form.purchaseDate} onChange={v => set('purchaseDate', v)} placeholder="Selecione a data" />
            </Field>
            <Field label="Garantia até">
              <DatePicker value={form.warrantyExpiry} onChange={v => set('warrantyExpiry', v)} placeholder="Selecione a data" />
            </Field>
          </div>

          {/* Observações */}
          <Field label="Observações">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={3} placeholder="Informações adicionais..."
              className={`${inputClass} resize-none`} />
          </Field>

          {/* Footer */}
          <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={requestClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {isEdit ? 'Salvar Alterações' : 'Cadastrar Ativo'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showScanner && (
        <BarcodeScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      {showQuickAdd && (
        <QuickAddResponsavel
          setores={setores}
          onSave={handleQuickAddResponsavel}
          onClose={() => setShowQuickAdd(false)}
        />
      )}

      {showExitConfirm && (
        <ExitConfirmDialog
          saving={saving}
          onSave={handleSaveAndClose}
          onDiscard={onClose}
          onContinue={() => setShowExitConfirm(false)}
        />
      )}
    </div>
  )
}
