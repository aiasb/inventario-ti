import { useState } from 'react'
import { Plus, Edit2, Trash2, Search, X, Save, Lock, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CustomSelect from '../CustomSelect'

/**
 * Generic reusable CRUD table.
 *
 * Props:
 *  - title / subtitle
 *  - items: array
 *  - columns: [{ key, label, render? }]
 *  - formFields: [{ key, label, type?, placeholder?, required?, options? }]
 *  - emptyForm: {}
 *  - onAdd(data)
 *  - onUpdate(id, data)
 *  - onDelete(id)
 *  - searchKeys: string[]
 *  - isInUse?: (item) => number   — returns count of assets using this item
 */
export default function CrudTable({
  title, subtitle, items, columns, formFields,
  emptyForm, onAdd, onUpdate, onDelete, searchKeys = [], isInUse,
}) {
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'user'
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const filtered = items.filter(item => {
    if (!search) return true
    const q = search.toLowerCase()
    return searchKeys.some(k => String(item[k] ?? '').toLowerCase().includes(q))
  })

  function openAdd() { setForm({ ...emptyForm }); setErrors({}); setFormError(''); setAdding(true); setEditing(null) }
  function openEdit(item) { setForm({ ...item }); setErrors({}); setFormError(''); setEditing(item); setAdding(false) }
  function closeForm() { setAdding(false); setEditing(null); setErrors({}); setFormError('') }

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }))
  }

  function validate() {
    const e = {}
    formFields.forEach(f => {
      if (f.required && !String(form[f.key] ?? '').trim()) e[f.key] = 'Campo obrigatório'
    })
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    setFormError('')
    try {
      if (editing) await onUpdate(editing.id, form)
      else await onAdd(form)
      closeForm()
    } catch (err) {
      setFormError('Erro ao salvar. Verifique os dados e tente novamente.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    if (isInUse) {
      const count = isInUse(item)
      if (count > 0) {
        alert(`Não é possível excluir: este registro está em uso em ${count} ativo${count > 1 ? 's' : ''} do inventário.`)
        return
      }
    }
    if (window.confirm(`Excluir "${item[formFields[0]?.key] ?? item.id}"?`)) {
      try {
        await onDelete(item.id)
      } catch (err) {
        alert('Erro ao excluir. Tente novamente.')
        console.error(err)
      }
    }
  }

  const showForm = adding || editing !== null

  const inputCls = (key) => [
    'w-full text-sm border rounded-lg px-3 py-2',
    'focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-500/20',
    'bg-white dark:bg-slate-800',
    'text-slate-800 dark:text-slate-100',
    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
    errors[key]
      ? 'border-red-300 dark:border-red-500'
      : 'border-slate-200 dark:border-slate-600',
  ].join(' ')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Novo
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-700/40 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              {editing ? 'Editar registro' : 'Novo registro'}
            </h3>
            <button
              onClick={closeForm}
              className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {formFields.map(field => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <CustomSelect
                      value={form[field.key] ?? ''}
                      onChange={v => setField(field.key, v)}
                      placeholder="Selecione..."
                      error={!!errors[field.key]}
                      options={[
                        { value: '', label: 'Selecione...' },
                        ...(field.options ?? []).map(o => ({
                          value: o.value ?? o,
                          label: o.label ?? o,
                        })),
                      ]}
                    />
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={form[field.key] ?? ''}
                      onChange={e => setField(field.key, e.target.value)}
                      placeholder={field.placeholder ?? ''}
                      rows={2}
                      className={`${inputCls(field.key)} resize-none`}
                    />
                  ) : (
                    <input
                      type={field.type ?? 'text'}
                      value={form[field.key] ?? ''}
                      onChange={e => setField(field.key, e.target.value)}
                      placeholder={field.placeholder ?? ''}
                      className={inputCls(field.key)}
                    />
                  )}
                  {errors[field.key] && (
                    <p className="text-xs text-red-500">{errors[field.key]}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              {formError && <p className="text-xs text-red-500 self-center mr-auto">{formError}</p>}
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300
                           hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600
                           disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white text-sm
                           font-medium rounded-xl transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editing ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      {searchKeys.length > 0 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:border-blue-400
                       bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600
                       text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/40">
                {columns.map(col => (
                  <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="text-center py-10 text-slate-400 dark:text-slate-500">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {col.render ? col.render(item) : (item[col.key] || '—')}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500
                                     hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {canEdit && (isInUse && isInUse(item) > 0 ? (
                        <button
                          disabled
                          className="p-1.5 rounded-lg text-amber-400 bg-amber-50 dark:bg-amber-900/20 cursor-not-allowed"
                          title={`Em uso em ${isInUse(item)} ativo(s) — não pode ser excluído`}
                        >
                          <Lock size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500
                                     hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
          </p>
        </div>
      </div>
    </div>
  )
}
