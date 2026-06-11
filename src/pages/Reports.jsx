import { useEffect, useState, useMemo } from 'react'
import { useMasterData } from '../context/MasterDataContext'
import { useAssets } from '../context/AssetsContext'
import { fetchReportData } from '../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts'
import { Filter, RefreshCw, X, Download, Package, Wrench, Shield, AlertTriangle } from 'lucide-react'
import { exportCSV } from '../lib/exportCSV'

function normStr(s) { return (s ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') }

function getMaintenanceStatus(asset, tipo, dias, today) {
  const matches = (asset.maintenances ?? []).filter(m => m.type === tipo)
  if (!matches.length) return 'vencida'
  const last = new Date(matches[0].date)
  const next = new Date(last)
  next.setDate(next.getDate() + dias)
  if (next < today) return 'vencida'
  return (next - today) / 864e5 <= 30 ? 'a_vencer' : 'em_dia'
}

function nextDueLabel(asset, tipo, dias, today) {
  const matches = (asset.maintenances ?? []).filter(m => m.type === tipo)
  if (!matches.length) return '—'
  const last = new Date(matches[0].date)
  const next = new Date(last)
  next.setDate(next.getDate() + dias)
  const diff = Math.round((next - today) / 864e5)
  const dateStr = next.toLocaleDateString('pt-BR')
  if (diff < 0) return `${dateStr} (${Math.abs(diff)}d atrás)`
  if (diff === 0) return `${dateStr} (hoje)`
  return `${dateStr} (em ${diff}d)`
}

const PALETTE = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#f59e0b', '#ef4444', '#64748b']
const WARRANTY_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#94a3b8']

function corToHex(cor) {
  if (!cor) return '#94a3b8'
  if (cor.includes('emerald') || cor.includes('green')) return '#10b981'
  if (cor.includes('blue') || cor.includes('indigo')) return '#3b82f6'
  if (cor.includes('red') || cor.includes('rose')) return '#ef4444'
  if (cor.includes('amber') || cor.includes('yellow')) return '#f59e0b'
  if (cor.includes('violet') || cor.includes('purple')) return '#8b5cf6'
  if (cor.includes('orange')) return '#f97316'
  if (cor.includes('cyan') || cor.includes('teal')) return '#06b6d4'
  return '#94a3b8'
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-sm">
      {label && <p className="text-xs text-slate-500 mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold text-slate-800">
          {p.value}
        </p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-sm">
      <p className="font-semibold" style={{ color: p.payload?.color ?? '#64748b' }}>
        {p.payload?.label}: <span className="text-slate-800">{p.value}</span>
      </p>
    </div>
  )
}

function ChartCard({ title, sub, children, loading, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw size={20} className="text-slate-300 animate-spin" />
        </div>
      ) : children}
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, colorClass, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-slate-100 rounded-lg mt-1 animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
        )}
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-slate-400">
      Sem dados para exibir
    </div>
  )
}

export default function Reports() {
  const { categorias, situacoes, setores, periodosManutencao } = useMasterData()
  const { assets } = useAssets()
  const [filters, setFilters] = useState({ category: '', status: '', dept: '', warranty: '', manutLimpeza: '', manutFormatacao: '' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  const limpezaPeriodo   = useMemo(() => periodosManutencao.items.find(p => normStr(p.tipo).includes('limpez')),  [periodosManutencao.items])
  const formatacaoPeriodo = useMemo(() => periodosManutencao.items.find(p => normStr(p.tipo).includes('format')), [periodosManutencao.items])

  const filteredAssets = useMemo(() => {
    const { warranty, manutLimpeza, manutFormatacao } = filters
    if (!warranty && !manutLimpeza && !manutFormatacao) return null
    const in90 = new Date(today); in90.setDate(in90.getDate() + 90)
    return assets.filter(a => {
      if (warranty) {
        const exp = a.warrantyExpiry ? new Date(a.warrantyExpiry) : null
        if (!exp) return false
        if (warranty === 'vencida'  && exp >= today) return false
        if (warranty === 'a_vencer' && (exp < today || exp > in90)) return false
      }
      if (manutLimpeza && limpezaPeriodo) {
        if (getMaintenanceStatus(a, limpezaPeriodo.tipo, limpezaPeriodo.dias, today) !== manutLimpeza) return false
      }
      if (manutFormatacao && formatacaoPeriodo) {
        if (getMaintenanceStatus(a, formatacaoPeriodo.tipo, formatacaoPeriodo.dias, today) !== manutFormatacao) return false
      }
      return true
    })
  }, [assets, filters.warranty, filters.manutLimpeza, filters.manutFormatacao, limpezaPeriodo, formatacaoPeriodo, today])

  function setFilter(key, val) {
    setFilters(prev => ({ ...prev, [key]: val }))
  }

  function clearFilters() {
    setFilters({ category: '', status: '', dept: '', warranty: '', manutLimpeza: '', manutFormatacao: '' })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchReportData({
      category:   filters.category   || null,
      status:     filters.status     || null,
      department: filters.dept       || null,
    })
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [filters.category, filters.status, filters.dept])

  const monthData = useMemo(() =>
    (data?.manut_by_month ?? []).map(m => ({
      ...m,
      label: new Date(m.month + '-02').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    }))
  , [data])

  const warrantyData = useMemo(() => {
    if (!data?.warranty) return []
    return [
      { label: 'Vencida',   value: data.warranty.expired,     color: WARRANTY_COLORS[0] },
      { label: '≤ 30 dias', value: data.warranty.expiring_30, color: WARRANTY_COLORS[1] },
      { label: '≤ 90 dias', value: data.warranty.expiring_90, color: WARRANTY_COLORS[2] },
      { label: 'Em dia',    value: data.warranty.active,       color: WARRANTY_COLORS[3] },
      { label: 'Sem info',  value: data.warranty.none,         color: WARRANTY_COLORS[4] },
    ].filter(d => d.value > 0)
  }, [data])

  const statusData = useMemo(() => {
    if (!data?.by_status) return []
    const corMap = Object.fromEntries(situacoes.items.map(s => [s.id, s.cor]))
    return data.by_status.map(s => ({ ...s, color: corToHex(corMap[s.id] ?? '') }))
  }, [data, situacoes.items])

  function handleExportCSV() {
    const headers = ['Hostname', 'Categoria', 'Status', 'Setor', 'Responsável', 'Serial', 'Marca', 'Modelo', 'Localização', 'Data Compra', 'Garantia']
    const rows = assets.map(a => [
      a.name, a.category, a.status, a.department, a.assignedTo, a.serialNumber,
      a.brand, a.model, a.location, a.purchaseDate, a.warrantyExpiry,
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const date = new Date().toISOString().split('T')[0]
    exportCSV(`inventario-ti-${date}.csv`, csv)
  }

  const hasFilters = !!(filters.category || filters.status || filters.dept || filters.warranty || filters.manutLimpeza || filters.manutFormatacao)
  const warrantyAlert = data ? (data.warranty?.expired ?? 0) + (data.warranty?.expiring_30 ?? 0) : null

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Relatórios e Análises</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading
              ? 'Carregando...'
              : filteredAssets != null
                ? `${filteredAssets.length} ativo${filteredAssets.length !== 1 ? 's' : ''} filtrados`
                : data
                  ? `${data.total} ativo${data.total !== 1 ? 's' : ''}${hasFilters ? ' (filtrados)' : ''}`
                  : 'Dados não disponíveis'}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors shrink-0"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-3">
        <Filter size={15} className="text-slate-400 shrink-0" />

        <select
          value={filters.category}
          onChange={e => setFilter('category', e.target.value)}
          className="flex-1 min-w-[140px] max-w-[200px] text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
        >
          <option value="">Todas categorias</option>
          {categorias.items.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={e => setFilter('status', e.target.value)}
          className="flex-1 min-w-[140px] max-w-[200px] text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
        >
          <option value="">Todos os status</option>
          {situacoes.items.filter(s => s.id !== 'descartado').map(s => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>

        <select
          value={filters.dept}
          onChange={e => setFilter('dept', e.target.value)}
          className="flex-1 min-w-[140px] max-w-[200px] text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
        >
          <option value="">Todos os setores</option>
          {setores.items.map(s => (
            <option key={s.id} value={s.nome}>{s.nome}</option>
          ))}
        </select>

        <div className="w-full h-px bg-slate-100 md:hidden" />

        <select
          value={filters.warranty}
          onChange={e => setFilter('warranty', e.target.value)}
          className="flex-1 min-w-[140px] max-w-[200px] text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
        >
          <option value="">Garantia — todas</option>
          <option value="a_vencer">Garantia a vencer (≤90d)</option>
          <option value="vencida">Garantia vencida</option>
        </select>

        <select
          value={filters.manutLimpeza}
          onChange={e => setFilter('manutLimpeza', e.target.value)}
          className="flex-1 min-w-[140px] max-w-[200px] text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
          disabled={!limpezaPeriodo}
        >
          <option value="">Limpeza — todas</option>
          <option value="a_vencer">Limpeza a vencer (≤30d)</option>
          <option value="vencida">Limpeza vencida</option>
        </select>

        <select
          value={filters.manutFormatacao}
          onChange={e => setFilter('manutFormatacao', e.target.value)}
          className="flex-1 min-w-[140px] max-w-[200px] text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
          disabled={!formatacaoPeriodo}
        >
          <option value="">Formatação — todas</option>
          <option value="a_vencer">Formatação a vencer (≤30d)</option>
          <option value="vencida">Formatação vencida</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={12} />
            Limpar filtros
          </button>
        )}

        {loading && (
          <RefreshCw size={14} className="text-blue-400 animate-spin ml-auto" />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
          <strong>Erro ao carregar dados:</strong> {error}
          <br />
          <span className="text-xs text-red-500 mt-1 block">
            Verifique se a função <code className="bg-red-100 px-1 rounded">get_report_data</code> foi criada no Supabase.
          </span>
        </div>
      )}

      {/* Filtered assets table */}
      {filteredAssets && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">
              Ativos filtrados
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                {filteredAssets.length}
              </span>
            </h3>
          </div>
          {filteredAssets.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-sm text-slate-400">
              Nenhum ativo encontrado com esses filtros
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-2.5 text-slate-500 font-medium">Hostname</th>
                    <th className="px-4 py-2.5 text-slate-500 font-medium">Categoria</th>
                    <th className="px-4 py-2.5 text-slate-500 font-medium">Setor</th>
                    <th className="px-4 py-2.5 text-slate-500 font-medium">Garantia</th>
                    {limpezaPeriodo && (
                      <th className="px-4 py-2.5 text-slate-500 font-medium">
                        {limpezaPeriodo.tipo} (próx.)
                      </th>
                    )}
                    {formatacaoPeriodo && (
                      <th className="px-4 py-2.5 text-slate-500 font-medium">
                        {formatacaoPeriodo.tipo} (próx.)
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAssets.map(a => {
                    const exp = a.warrantyExpiry ? new Date(a.warrantyExpiry) : null
                    const warrantyExpired = exp && exp < today
                    const warrantyOk      = exp && exp >= today
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-700">{a.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{a.category || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-500">{a.department || '—'}</td>
                        <td className="px-4 py-2.5">
                          {!exp ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span className={`font-medium ${warrantyExpired ? 'text-red-600' : warrantyOk ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {exp.toLocaleDateString('pt-BR')}
                              {warrantyExpired && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">vencida</span>}
                            </span>
                          )}
                        </td>
                        {limpezaPeriodo && (
                          <td className="px-4 py-2.5">
                            {(() => {
                              const st = getMaintenanceStatus(a, limpezaPeriodo.tipo, limpezaPeriodo.dias, today)
                              const lbl = nextDueLabel(a, limpezaPeriodo.tipo, limpezaPeriodo.dias, today)
                              return (
                                <span className={`font-medium ${st === 'vencida' ? 'text-red-600' : st === 'a_vencer' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {lbl}
                                  {st === 'vencida' && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">vencida</span>}
                                </span>
                              )
                            })()}
                          </td>
                        )}
                        {formatacaoPeriodo && (
                          <td className="px-4 py-2.5">
                            {(() => {
                              const st = getMaintenanceStatus(a, formatacaoPeriodo.tipo, formatacaoPeriodo.dias, today)
                              const lbl = nextDueLabel(a, formatacaoPeriodo.tipo, formatacaoPeriodo.dias, today)
                              return (
                                <span className={`font-medium ${st === 'vencida' ? 'text-red-600' : st === 'a_vencer' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {lbl}
                                  {st === 'vencida' && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">vencida</span>}
                                </span>
                              )
                            })()}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label={filteredAssets ? 'Ativos filtrados' : 'Total de Ativos'} value={filteredAssets ? filteredAssets.length : data?.total} icon={Package} colorClass="bg-blue-500" loading={loading} />
        <KpiCard label="Manutenções"        value={data?.total_manut}       icon={Wrench}        colorClass="bg-violet-500" loading={loading} />
        <KpiCard label="Garantias em dia"   value={data?.warranty?.active}  icon={Shield}        colorClass="bg-emerald-500" loading={loading} />
        <KpiCard label="Garantias em alerta" value={warrantyAlert}          icon={AlertTriangle} colorClass="bg-orange-500" loading={loading} />
      </div>

      {/* Row 1: Category (3/5) + Status (2/5) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <ChartCard
          title="Ativos por Categoria"
          sub={data ? `${data.by_category?.length ?? 0} categorias com ativos` : ''}
          loading={loading}
          className="md:col-span-3"
        >
          {data?.by_category?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={data.by_category} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                <RechTooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
                  {data.by_category.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : !loading && <EmptyChart />}
        </ChartCard>

        <ChartCard title="Status dos Ativos" loading={loading} className="md:col-span-2">
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={155}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechTooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {statusData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-600 truncate max-w-[110px]">{s.label}</span>
                    </span>
                    <span className="font-semibold text-slate-700">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : !loading && <EmptyChart />}
        </ChartCard>
      </div>

      {/* Row 2: Department + Brands */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard title="Ativos por Setor" loading={loading}>
          {data?.by_department?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={data.by_department} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <RechTooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : !loading && <EmptyChart />}
        </ChartCard>

        <ChartCard title="Top Marcas" sub="até 8 marcas" loading={loading}>
          {data?.by_brand?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={data.by_brand} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <RechTooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" fill="#06b6d4" radius={[0, 6, 6, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : !loading && <EmptyChart />}
        </ChartCard>
      </div>

      {/* Row 3: Maintenance trend (full width) */}
      <ChartCard title="Manutenções por Mês" sub="últimos 12 meses" loading={loading}>
        {monthData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="manutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RechTooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Manutenções"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#manutGrad)"
                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : !loading && <EmptyChart />}
      </ChartCard>

      {/* Row 4: Maintenance types + Warranty status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard title="Tipos de Manutenção" sub="top 10 tipos mais realizados" loading={loading}>
          {data?.manut_by_type?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={data.manut_by_type} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <RechTooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : !loading && <EmptyChart />}
        </ChartCard>

        <ChartCard title="Status de Garantia" loading={loading}>
          {warrantyData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={155}>
                <PieChart>
                  <Pie data={warrantyData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {warrantyData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechTooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {warrantyData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-600">{s.label}</span>
                    </span>
                    <span className="font-semibold text-slate-700">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : !loading && <EmptyChart />}
        </ChartCard>
      </div>
    </div>
  )
}
