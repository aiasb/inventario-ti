import { useState } from 'react'
import { X, Save, ExternalLink, Loader2, ScanBarcode } from 'lucide-react'
import { useAssets } from '../context/AssetsContext'
import { useMasterData } from '../context/MasterDataContext'
import { usePlatform } from '../hooks/usePlatform'
import BarcodeScannerModal from './BarcodeScannerModal'

const EMPTY = {
  name: '', category: '', status: '',
  serialNumber: '', brand: '', model: '', department: '', assignedTo: '',
  memory: '', storage: '',
  purchaseDate: '', warrantyExpiry: '', location: '', notes: '',
}

function Field({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

const inputClass = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white"
const selectClass = inputClass

export default function AssetForm({ asset, onClose }) {
  const { addAsset, updateAsset } = useAssets()
  const { responsaveis, setores, categorias, marcas, situacoes } = useMasterData()
  const { isAndroid } = usePlatform()
  const isEdit = !!asset

  const [form, setForm] = useState(() => {
    if (isEdit) return { ...asset }
    return {
      ...EMPTY,
      category: categorias.items[0]?.id ?? '',
      department: setores.items[0]?.nome ?? '',
    }
  })
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [showScanner, setShowScanner] = useState(false)

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
    if (form.status === 'em_uso' && !form.assignedTo) e.assignedTo = 'Responsável obrigatório quando em uso'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEdit ? 'Editar Ativo' : 'Novo Ativo'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
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
                className={`${inputClass} ${errors.name ? 'border-red-300' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </Field>
            <Field label="Número de Série" required>
              <div className="flex gap-2">
                <input
                  value={form.serialNumber}
                  onChange={e => set('serialNumber', e.target.value)}
                  placeholder="Ex: SN-DL-001"
                  className={`${inputClass} flex-1 ${errors.serialNumber ? 'border-red-300' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  title="Escanear com câmera"
                  className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 active:scale-95 transition-all"
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
              <select value={form.category} onChange={e => set('category', e.target.value)} className={selectClass}>
                <option value="">Selecione...</option>
                {categorias.items.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Marca" hint={marcas.items.length === 0 ? 'Nenhuma marca cadastrada.' : undefined}>
              <select value={form.brand} onChange={e => set('brand', e.target.value)} className={selectClass}>
                <option value="">Selecione...</option>
                {marcas.items.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
              </select>
            </Field>
          </div>

          {/* Row 3 — Modelo + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Modelo">
              <input
                value={form.model}
                onChange={e => set('model', e.target.value)}
                placeholder="Ex: Latitude 5520"
                className={inputClass}
              />
            </Field>
            <Field label="Status" hint={situacoes.items.length === 0 ? 'Nenhum status cadastrado. Vá em Cadastros > Status.' : undefined}>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={selectClass}>
                <option value="">Selecione o status...</option>
                {situacoes.items.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </Field>
          </div>

          {/* Row 4 — Memória + Disco */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Memória RAM">
              <input
                value={form.memory}
                onChange={e => set('memory', e.target.value)}
                placeholder="Ex: 16 GB DDR4"
                className={inputClass}
              />
            </Field>
            <Field label="Armazenamento (Disco)">
              <input
                value={form.storage}
                onChange={e => set('storage', e.target.value)}
                placeholder="Ex: 512 GB SSD NVMe"
                className={inputClass}
              />
            </Field>
          </div>

          {/* Row 5 — Setor + Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Setor" hint={setores.items.length === 0 ? 'Nenhum setor cadastrado.' : undefined}>
              <select value={form.department} onChange={e => set('department', e.target.value)} className={selectClass}>
                <option value="">Selecione...</option>
                {setores.items.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              </select>
            </Field>
            <Field label="Responsável" required={form.status === 'em_uso'} hint={responsaveis.items.length === 0 ? 'Nenhum responsável cadastrado.' : undefined}>
              <select value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} className={`${selectClass} ${errors.assignedTo ? 'border-red-300' : ''}`}>
                <option value="">Sem responsável</option>
                {responsaveis.items.map(r => <option key={r.id} value={r.nome}>{r.nome}</option>)}
              </select>
              {errors.assignedTo && <p className="text-xs text-red-500 mt-1">{errors.assignedTo}</p>}
            </Field>
          </div>

          {/* Row 5 — Datas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Data de Compra">
              <input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Garantia até">
              <input type="date" value={form.warrantyExpiry} onChange={e => set('warrantyExpiry', e.target.value)} className={inputClass} />
            </Field>
          </div>

          {/* Observações */}
          <Field label="Observações">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Informações adicionais..."
              className={`${inputClass} resize-none`}
            />
          </Field>

          {/* Footer */}
          <div className="flex items-center justify-end pt-2 border-t border-slate-100">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {saving
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Save size={15} />
                }
                {isEdit ? 'Salvar Alterações' : 'Cadastrar Ativo'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showScanner && (
        <BarcodeScannerModal
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
