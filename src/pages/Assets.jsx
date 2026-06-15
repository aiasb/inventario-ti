import { useState, useMemo } from 'react'
import { useAssets } from '../context/AssetsContext'
import { useMasterData } from '../context/MasterDataContext'
import { useAuth } from '../context/AuthContext'
import { resolveIcon } from '../utils/categoryIcons'
import { useLocation } from 'react-router-dom'
import { usePlatform } from '../hooks/usePlatform'
import {
  Search, Plus, Filter, LayoutGrid, List,
  Edit2, Trash2, Eye, ChevronUp, ChevronDown, Download, ShieldCheck, ShieldOff, Ban, Upload,
} from 'lucide-react'
import AssetModal from '../components/AssetModal'
import AssetForm from '../components/AssetForm'
import CustomSelect from '../components/CustomSelect'
import ImportModal from '../components/ImportModal'
import { exportCSV as doExportCSV } from '../lib/exportCSV'

function isoDatePart(str) {
  return str ? str.split('T')[0] : str
}

function fmtDate(str) {
  if (!str) return '—'
  const [y, m, d] = isoDatePart(str).split('-')
  return `${d}/${m}/${y}`
}

function warrantyStatus(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = isoDatePart(dateStr).split('-').map(Number)
  const exp = new Date(y, m - 1, d)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return exp >= now
}

function WarrantyBadge({ date }) {
  if (!date) return <span className="text-slate-300 text-xs">—</span>
  const active = warrantyStatus(date)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
      active
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-600 border-red-200'
    }`}>
      {active ? <ShieldCheck size={11} /> : <ShieldOff size={11} />}
      {fmtDate(date)}
    </span>
  )
}

function StatusBadge({ statusId, situacoesItems }) {
  const s = situacoesItems.find(x => x.id === statusId)
  return s
    ? <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.cor}`}>{s.nome}</span>
    : <span className="text-slate-400 text-xs">—</span>
}

function CategoryBadge({ category, categorias }) {
  const cat = categorias.find(c => c.id?.toLowerCase() === category?.toLowerCase())
  const Icon = resolveIcon(cat?.icon)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cat?.color ?? 'bg-slate-100 text-slate-600'}`}>
      <Icon size={12} />
      {cat?.label ?? category}
    </span>
  )
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronUp size={12} className="text-slate-300" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-blue-500" />
    : <ChevronDown size={12} className="text-blue-500" />
}

export default function Assets() {
  const { assets, deleteAsset, reload } = useAssets()
  const { categorias, setores, situacoes, periodosManutencao } = useMasterData()
  const { profile } = useAuth()
  const { isAndroid } = usePlatform()
  const location = useLocation()
  const nav = location.state ?? {}
  const canEdit = profile?.role === 'admin' || profile?.role === 'user'
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState(nav.filterCategory ?? '')
  const [filterStatus, setFilterStatus] = useState(nav.filterStatus ?? '')
  const [filterDept, setFilterDept] = useState('')
  const [filterWarranty, setFilterWarranty] = useState(nav.filterWarranty ?? '')
  const [showDescartados, setShowDescartados] = useState(false)
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [view, setView] = useState('table')
  const effectiveView = isAndroid ? 'grid' : view
  const [viewingAsset, setViewingAsset] = useState(null)
  const [editingAsset, setEditingAsset] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(
    !!(nav.filterCategory || nav.filterStatus || nav.filterWarranty)
  )
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const descartadoId = useMemo(
    () => situacoes.items.find(s => s.nome?.toLowerCase() === 'descartado')?.id,
    [situacoes.items]
  )

  const descartadosCount = useMemo(
    () => descartadoId ? assets.filter(a => a.status === descartadoId).length : 0,
    [assets, descartadoId]
  )

  const filtered = useMemo(() => {
    let list = assets.filter(a => {
      if (!showDescartados && descartadoId && a.status === descartadoId && filterStatus !== descartadoId) return false
      const q = search.toLowerCase()
      const matchesSearch = !q || [a.name, a.serialNumber, a.assignedTo, a.brand, a.model, a.department]
        .some(v => v?.toLowerCase().includes(q))
      const matchesCat = !filterCategory || a.category === filterCategory
      const matchesStatus = !filterStatus || a.status === filterStatus
      const matchesDept = !filterDept || a.department === filterDept
      let matchesWarranty = true
      if (filterWarranty === 'ativa') matchesWarranty = warrantyStatus(a.warrantyExpiry) === true
      else if (filterWarranty === 'vencida') matchesWarranty = warrantyStatus(a.warrantyExpiry) === false
      else if (filterWarranty === 'sem') matchesWarranty = !a.warrantyExpiry
      return matchesSearch && matchesCat && matchesStatus && matchesDept && matchesWarranty
    })

    list.sort((a, b) => {
      const va = a[sortField] ?? ''
      const vb = b[sortField] ?? ''
      const cmp = typeof va === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [assets, search, filterCategory, filterStatus, filterDept, filterWarranty, sortField, sortDir, showDescartados, descartadoId])

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function handleDelete(asset) {
    if (window.confirm(`Deseja excluir "${asset.name}"?`)) {
      deleteAsset(asset.id)
    }
  }

  function clearFilters() {
    setFilterCategory('')
    setFilterStatus('')
    setFilterDept('')
    setFilterWarranty('')
  }

  function buildCSV(includeMaintenances = false) {
    const periodos = includeMaintenances
      ? periodosManutencao.items.filter(p => p.periodico && p.dias)
      : []

    const headers = [
      'Hostname', 'Serial', 'Categoria', 'Marca', 'Modelo', 'Status', 'Setor', 'Responsável',
      'Memória', 'Armazenamento', 'Data Compra', 'Garantia', 'Data Descarte', 'Observações',
      ...periodos.map(p => `Última ${p.tipo}`),
    ]

    const rows = filtered.map(a => {
      const cat  = categorias.items.find(c => c.id?.toLowerCase() === a.category?.toLowerCase())?.label || a.category
      const stat = situacoes.items.find(s => s.id === a.status)?.nome || a.status
      const manutCols = periodos.map(p => {
        const last = (a.maintenances ?? [])
          .filter(m => m.type === p.tipo && m.date)
          .sort((x, y) => y.date.localeCompare(x.date))[0]
        return last ? fmtDate(last.date) : ''
      })
      return [
        a.name, a.serialNumber, cat, a.brand, a.model, stat, a.department, a.assignedTo,
        a.memory, a.storage, fmtDate(a.purchaseDate), fmtDate(a.warrantyExpiry),
        fmtDate(a.discardDate),
        (a.notes || '').replace(/\n/g, ' '),
        ...manutCols,
      ]
    })

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
  }

  function exportCSV() {
    const date = new Date().toISOString().split('T')[0]
    doExportCSV(`inventario_${date}.csv`, buildCSV(false))
  }

  function exportCSVCompleto() {
    const date = new Date().toISOString().split('T')[0]
    doExportCSV(`inventario_completo_${date}.csv`, buildCSV(true))
  }

  const activeFilters = [filterCategory, filterStatus, filterDept, filterWarranty].filter(Boolean).length

  const TABLE_COLS = [
    { field: 'name', label: 'Hostname' },
    { field: 'serialNumber', label: 'Serial' },
    { field: 'category', label: 'Categoria' },
    { field: 'status', label: 'Status' },
    { field: 'department', label: 'Setor' },
    { field: 'assignedTo', label: 'Responsável' },
    { field: 'memory', label: 'Memória' },
    { field: 'storage', label: 'Armazenamento' },
    { field: 'purchaseDate', label: 'Compra' },
    { field: 'warrantyExpiry', label: 'Garantia' },
  ]

  return (
    <div className="p-6 space-y-5">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, serial, responsável, marca ou modelo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (showFilters) { setShowFilters(false); clearFilters() }
              else setShowFilters(true)
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
              showFilters || activeFilters > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={15} />
            {!isAndroid && 'Filtros'}
            {activeFilters > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full leading-none">{activeFilters}</span>
            )}
          </button>

          {descartadosCount > 0 && (
            <button
              onClick={() => setShowDescartados(v => !v)}
              title={showDescartados ? 'Ocultar descartados' : `Mostrar descartados (${descartadosCount})`}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors shrink-0 ${
                showDescartados
                  ? 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Ban size={15} />
              {!isAndroid && <span>{showDescartados ? 'Ocultar' : 'Descartados'}</span>}
              {!showDescartados && (
                <span className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs rounded-full leading-none font-bold">
                  {descartadosCount}
                </span>
              )}
            </button>
          )}

          {!isAndroid && (
            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
              <button
                onClick={() => setView('table')}
                className={`p-2.5 transition-colors ${view === 'table' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                title="Visualização em tabela"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setView('grid')}
                className={`p-2.5 transition-colors ${view === 'grid' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                title="Visualização em cards"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          )}

          {canEdit && !isAndroid && (
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              title="Importar ativos de planilha"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Importar</span>
            </button>
          )}

          <div className="relative">
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
                title="Exportar lista filtrada para CSV"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              <button
                onClick={() => setShowExportMenu(m => !m)}
                className="px-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors border-l border-slate-200"
                title="Mais opções de exportação"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-56">
                  <button
                    onClick={() => { exportCSV(); setShowExportMenu(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 rounded-t-xl"
                  >
                    <p className="font-medium text-slate-700">Exportar ativos</p>
                    <p className="text-xs text-slate-400 mt-0.5">Somente dados do ativo</p>
                  </button>
                  <button
                    onClick={() => { exportCSVCompleto(); setShowExportMenu(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 rounded-b-xl border-t border-slate-100"
                  >
                    <p className="font-medium text-slate-700">Exportar completo</p>
                    <p className="text-xs text-slate-400 mt-0.5">Ativos + manutenções</p>
                  </button>
                </div>
              </>
            )}
          </div>

          {canEdit && (
            <button
              onClick={() => { setEditingAsset(null); setShowForm(true) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              {!isAndroid && 'Novo Ativo'}
            </button>
          )}
        </div>
      </div>

      {/* ── Filters panel ── */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Categoria</label>
              <CustomSelect
                value={filterCategory}
                onChange={setFilterCategory}
                placeholder="Todas"
                options={[
                  { value: '', label: 'Todas' },
                  ...categorias.items.map(c => ({ value: c.id, label: c.label })),
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</label>
              <CustomSelect
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="Todos"
                options={[
                  { value: '', label: 'Todos' },
                  ...situacoes.items.map(s => ({ value: s.id, label: s.nome })),
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Setor</label>
              <CustomSelect
                value={filterDept}
                onChange={setFilterDept}
                placeholder="Todos"
                options={[
                  { value: '', label: 'Todos' },
                  ...setores.items.map(s => ({ value: s.nome, label: s.nome })),
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Garantia</label>
              <CustomSelect
                value={filterWarranty}
                onChange={setFilterWarranty}
                placeholder="Todas"
                options={[
                  { value: '', label: 'Todas' },
                  { value: 'ativa', label: 'Ativa' },
                  { value: 'vencida', label: 'Vencida' },
                  { value: 'sem', label: 'Sem garantia' },
                ]}
              />
            </div>

          </div>

          {activeFilters > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {activeFilters} filtro{activeFilters > 1 ? 's' : ''} ativo{activeFilters > 1 ? 's' : ''}
              </p>
              <button
                onClick={clearFilters}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Limpar todos
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Count ── */}
      <div className="flex items-center">
        <p className="text-sm text-slate-500">
          {filtered.length} {filtered.length === 1 ? 'ativo encontrado' : 'ativos encontrados'}
          {filtered.length !== assets.length && ` de ${assets.length}`}
        </p>
      </div>

      {/* ── Table view ── */}
      {effectiveView === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {TABLE_COLS.map(col => (
                    <th
                      key={col.field}
                      onClick={() => handleSort(col.field)}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon field={col.field} sortField={sortField} sortDir={sortDir} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLS.length + 1} className="text-center py-12 text-slate-400">
                      Nenhum ativo encontrado
                    </td>
                  </tr>
                ) : filtered.map(asset => (
                  <tr key={asset.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-slate-800">{asset.name}</p>
                      <p className="text-xs text-slate-400">{asset.brand} {asset.model}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{asset.serialNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={asset.category} categorias={categorias.items} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge statusId={asset.status} situacoesItems={situacoes.items} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{asset.department || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{asset.assignedTo || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{asset.memory || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{asset.storage || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(asset.purchaseDate)}</td>
                    <td className="px-4 py-3">
                      <WarrantyBadge date={asset.warrantyExpiry} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingAsset(asset)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Visualizar"
                        >
                          <Eye size={15} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => { setEditingAsset(asset); setShowForm(true) }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleDelete(asset)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Grid view ── */}
      {effectiveView === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              Nenhum ativo encontrado
            </div>
          ) : filtered.map(asset => {
            const cat = categorias.items.find(c => c.id?.toLowerCase() === asset.category?.toLowerCase())
            const Icon = resolveIcon(cat?.icon)
            return (
              <div key={asset.id} className={`bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-shadow ${asset._pending ? 'border-amber-200' : 'border-slate-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat?.color ?? 'bg-slate-100 text-slate-600'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {asset._pending && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 leading-none">
                        PENDENTE
                      </span>
                    )}
                    <StatusBadge statusId={asset.status} situacoesItems={situacoes.items} />
                  </div>
                </div>
                <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-0.5">{asset.name}</h3>
                <p className="text-xs text-slate-400 mb-3">{asset.brand} {asset.model}</p>

                <div className="space-y-1 text-xs text-slate-500 mb-3">
                  <p>Setor: <span className="text-slate-700">{asset.department || '—'}</span></p>
                  {asset.assignedTo && <p>Resp.: <span className="text-slate-700">{asset.assignedTo}</span></p>}
                  {asset.memory && <p>Memória: <span className="text-slate-700">{asset.memory}</span></p>}
                  {asset.storage && <p>Armazenamento: <span className="text-slate-700">{asset.storage}</span></p>}
                  {asset.serialNumber && <p>Serial: <span className="font-mono text-slate-600">{asset.serialNumber}</span></p>}
                </div>

                {/* Compra + Garantia */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mb-3">
                  <div className="text-xs text-slate-400">
                    {asset.purchaseDate ? (
                      <span>Compra: <span className="text-slate-600">{fmtDate(asset.purchaseDate)}</span></span>
                    ) : (
                      <span className="text-slate-300">Sem data de compra</span>
                    )}
                  </div>
                  <WarrantyBadge date={asset.warrantyExpiry} />
                </div>

                <div className="flex gap-1 pt-2.5 border-t border-slate-100">
                  <button
                    onClick={() => setViewingAsset(asset)}
                    className="flex-1 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Ver
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => { setEditingAsset(asset); setShowForm(true) }}
                      className="flex-1 py-1.5 text-xs font-medium text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      Editar
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleDelete(asset)}
                      className="flex-1 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modals ── */}
      {viewingAsset && (
        <AssetModal
          asset={viewingAsset}
          onClose={() => setViewingAsset(null)}
          onEdit={() => { setEditingAsset(viewingAsset); setViewingAsset(null); setShowForm(true) }}
        />
      )}
      {showForm && (
        <AssetForm asset={editingAsset} onClose={() => { setShowForm(false); setEditingAsset(null) }} />
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { reload(); setShowImport(false) }}
        />
      )}
    </div>
  )
}
