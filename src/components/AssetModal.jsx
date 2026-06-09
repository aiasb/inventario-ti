import { useState } from 'react'
import {
  X, Edit2, Trash2, Calendar, MapPin, Tag, User, Building2,
  MemoryStick, HardDrive, Wrench, Plus, Save, ArrowRight,
} from 'lucide-react'
import { useMasterData } from '../context/MasterDataContext'
import { useAssets } from '../context/AssetsContext'
import { useAuth } from '../context/AuthContext'

function normStr(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function isUpgradeMemoria(tipo) { return normStr(tipo).includes('memor') }
function isUpgradeSsd(tipo)     { return normStr(tipo).includes('ssd') || normStr(tipo).includes('armazen') }

function getTypeColor(tipo) {
  const n = normStr(tipo)
  if (n.includes('limpeza') || n.includes('pasta')) return 'bg-cyan-100 text-cyan-700 border-cyan-200'
  if (n.includes('format'))                          return 'bg-violet-100 text-violet-700 border-violet-200'
  if (n.includes('memor'))                           return 'bg-blue-100 text-blue-700 border-blue-200'
  if (n.includes('ssd') || n.includes('armazen'))   return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

function Field({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-700">{value}</p>
      </div>
    </div>
  )
}

function MaintenanceForm({ assetId, analistas, onSaved }) {
  const { addMaintenance, assets } = useAssets()
  const { periodosManutencao } = useMasterData()
  const currentAsset = assets.find(a => a.id === assetId)
  const [form, setForm] = useState({ type: '', date: '', analyst: '', newValue: '' })
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v, ...(k === 'type' ? { newValue: '' } : {}) })); setError('') }

  const needsNewValue = isUpgradeMemoria(form.type) || isUpgradeSsd(form.type)
  const newValueLabel = isUpgradeMemoria(form.type) ? 'Nova Memória RAM' : 'Novo Armazenamento (SSD)'
  const newValuePlaceholder = isUpgradeMemoria(form.type) ? 'Ex: 32 GB DDR4' : 'Ex: 1 TB SSD NVMe'
  const currentHwValue = isUpgradeMemoria(form.type)
    ? (currentAsset?.memory || '')
    : (currentAsset?.storage || '')

  async function handleSave() {
    if (!form.type) { setError('Selecione o tipo de manutenção.'); return }
    if (!form.date) { setError('Informe a data da manutenção.'); return }
    if (!form.analyst.trim()) { setError('Informe o analista responsável.'); return }
    if (needsNewValue && !form.newValue.trim()) { setError(`Informe o novo valor para ${newValueLabel}.`); return }

    const { newValue, ...maintenanceData } = form

    const assetUpdates = {}
    if (isUpgradeMemoria(form.type) && newValue.trim()) {
      assetUpdates.memory = newValue.trim()
      maintenanceData.upgradeFrom = currentHwValue || '—'
      maintenanceData.upgradeTo = newValue.trim()
    }
    if (isUpgradeSsd(form.type) && newValue.trim()) {
      assetUpdates.storage = newValue.trim()
      maintenanceData.upgradeFrom = currentHwValue || '—'
      maintenanceData.upgradeTo = newValue.trim()
    }

    try {
      await addMaintenance(assetId, maintenanceData, assetUpdates)
      onSaved()
    } catch (err) {
      setError('Erro ao salvar manutenção. Tente novamente.')
      console.error(err)
    }
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white'

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-blue-800">Nova manutenção</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo *</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
            <option value="">Selecione...</option>
            {periodosManutencao.items.map(p => (
              <option key={p.id} value={p.tipo}>{p.tipo}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data *</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Campo de novo valor para upgrades */}
      {needsNewValue && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
            {newValueLabel} * <span className="normal-case font-normal text-blue-600">(atualizará o cadastro do ativo)</span>
          </label>
          {currentHwValue && (
            <p className="text-xs text-slate-500">
              Valor atual: <span className="font-medium text-slate-700">{currentHwValue}</span>
            </p>
          )}
          <input
            type="text"
            value={form.newValue}
            onChange={e => set('newValue', e.target.value)}
            placeholder={newValuePlaceholder}
            className={`${inputCls} border-blue-300 bg-blue-50 focus:border-blue-500`}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Analista responsável *</label>
        <select value={form.analyst} onChange={e => set('analyst', e.target.value)} className={inputCls}>
          <option value="">Selecione o analista...</option>
          {analistas.map(a => (
            <option key={a.id} value={a.nome}>{a.nome} — {a.matricula}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onSaved}
          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Save size={14} />
          Salvar
        </button>
      </div>
    </div>
  )
}

export default function AssetModal({ asset: assetProp, onClose, onEdit }) {
  const { categorias, situacoes, analistas } = useMasterData()
  const { assets, deleteAsset } = useAssets()
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'user'
  const [tab, setTab] = useState('info')
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)

  // Always read the latest version of the asset from context
  const asset = assets.find(a => a.id === assetProp.id) ?? assetProp

  const status = situacoes.items.find(s => s.id === asset.status)
  const category = categorias.items.find(c => c.id === asset.category)
  const maintenances = [...(asset.maintenances ?? [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )

  const warrantyDays = asset.warrantyExpiry
    ? Math.round((new Date(asset.warrantyExpiry) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  function handleDelete() {
    if (window.confirm(`Excluir permanentemente "${asset.name}"? Esta ação não pode ser desfeita.`)) {
      deleteAsset(asset.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${category?.color ?? 'bg-slate-100 text-slate-600'}`}>
              {asset.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{asset.name}</h2>
              <p className="text-sm text-slate-400">{asset.brand} {asset.model}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <Edit2 size={14} />
                Editar
              </button>
            )}
            {canEdit && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="px-6 py-3 flex flex-wrap gap-2 border-b border-slate-100 shrink-0">
          {status && (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${status.cor}`}>
              {status.nome}
            </span>
          )}
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${category?.color}`}>
            {category?.label}
          </span>
          {warrantyDays !== null && (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              warrantyDays < 0 ? 'bg-red-100 text-red-700' :
              warrantyDays <= 90 ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {warrantyDays < 0 ? 'Garantia vencida' : `${warrantyDays}d de garantia`}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-slate-100 shrink-0">
          <button
            onClick={() => setTab('info')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === 'info' ? 'text-blue-600 border-b-2 border-blue-500 -mb-px bg-transparent' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Informações
          </button>
          <button
            onClick={() => setTab('maintenance')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === 'maintenance' ? 'text-blue-600 border-b-2 border-blue-500 -mb-px' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Wrench size={14} />
            Manutenções
            {maintenances.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-semibold">
                {maintenances.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto scrollbar-thin flex-1">

          {/* — Informações — */}
          {tab === 'info' && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field icon={Tag} label="Número de Série" value={asset.serialNumber} />
                <Field icon={Building2} label="Setor" value={asset.department} />
                <Field icon={User} label="Responsável" value={asset.assignedTo || '—'} />
                <Field icon={MapPin} label="Localização" value={asset.location} />
                <Field icon={MemoryStick} label="Memória RAM" value={asset.memory} />
                <Field icon={HardDrive} label="Armazenamento" value={asset.storage} />
                <Field
                  icon={Calendar}
                  label="Data de Compra"
                  value={asset.purchaseDate ? new Date(asset.purchaseDate + 'T00:00:00').toLocaleDateString('pt-BR') : undefined}
                />
                <Field
                  icon={Calendar}
                  label="Garantia até"
                  value={asset.warrantyExpiry ? new Date(asset.warrantyExpiry + 'T00:00:00').toLocaleDateString('pt-BR') : undefined}
                />
              </div>
              {asset.notes && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Observações</p>
                  <p className="text-sm text-slate-700">{asset.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* — Manutenções — */}
          {tab === 'maintenance' && (
            <div className="p-6 space-y-4">
              {/* Add button */}
              {canEdit && !showMaintenanceForm && (
                <button
                  onClick={() => setShowMaintenanceForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <Plus size={15} />
                  Registrar Manutenção
                </button>
              )}

              {/* Form */}
              {showMaintenanceForm && (
                <MaintenanceForm
                  assetId={asset.id}
                  analistas={analistas.items}
                  onSaved={() => setShowMaintenanceForm(false)}
                />
              )}

              {/* History */}
              {maintenances.length === 0 && !showMaintenanceForm ? (
                <div className="text-center py-10 text-slate-400">
                  <Wrench size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma manutenção registrada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {maintenances.map(m => (
                      <div key={m.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          <Wrench size={16} className="text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${getTypeColor(m.type ?? '')}`}>
                              {m.type || 'Manutenção'}
                            </span>
                          </div>
                          {/* Upgrade: antes → depois */}
                          {m.upgradeFrom && m.upgradeTo && (
                            <div className="flex items-center gap-1.5 mt-1 mb-1">
                              <span className="text-xs text-slate-400 line-through">{m.upgradeFrom}</span>
                              <ArrowRight size={11} className="text-slate-400 shrink-0" />
                              <span className="text-xs font-semibold text-emerald-700">{m.upgradeTo}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              {m.date ? new Date(m.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                            </span>
                            <span className="flex items-center gap-1">
                              <User size={11} />
                              {m.analyst || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
