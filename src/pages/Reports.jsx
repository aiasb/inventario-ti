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
import { RefreshCw, X, Download, Package, Wrench, Shield, AlertTriangle, FileText, TrendingUp } from 'lucide-react'
import { exportCSV } from '../lib/exportCSV'

const PALETTE = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#f59e0b', '#ef4444', '#64748b']
const WARRANTY_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#94a3b8']

function normStr(s) { return (s ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') }

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

// ─── Tooltip components ───────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl px-3 py-2 text-sm">
      {label && <p className="text-xs text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold text-white">{p.value?.toLocaleString('pt-BR')}</p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl px-3 py-2 text-sm">
      <p className="font-semibold" style={{ color: p.payload?.color ?? '#94a3b8' }}>
        {p.payload?.label}: <span className="text-white">{p.value?.toLocaleString('pt-BR')}</span>
      </p>
    </div>
  )
}

// ─── Chart card ───────────────────────────────────────────────────────────────

function ChartCard({ title, sub, children, loading, className = '', action }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col ${className}`}>
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-slate-50">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={18} className="text-slate-300 animate-spin" />
          </div>
        ) : children}
      </div>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, colorClass, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        {loading ? (
          <div className="h-7 w-20 bg-slate-100 rounded-lg mt-1 animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-slate-800 leading-tight">
            {value?.toLocaleString('pt-BR') ?? '—'}
          </p>
        )}
        {sub && !loading && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function EmptyChart({ text = 'Sem dados para exibir' }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300">
      <Package size={32} strokeWidth={1} />
      <p className="text-xs">{text}</p>
    </div>
  )
}

// ─── Pie legend ───────────────────────────────────────────────────────────────

function PieLegend({ data }) {
  return (
    <div className="mt-3 space-y-1.5">
      {data.map((s, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600 truncate">{s.label}</span>
          </span>
          <span className="font-semibold text-slate-700 ml-2">{(s.value ?? s.count)?.toLocaleString('pt-BR')}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Reports() {
  const { categorias, situacoes, setores, periodosManutencao } = useMasterData()
  const { assets } = useAssets()
  const [filters, setFilters] = useState({ category: '', status: '', dept: '', warranty: '', manutLimpeza: '', manutFormatacao: '' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  const limpezaPeriodo    = useMemo(() => periodosManutencao.items.find(p => normStr(p.tipo).includes('limpez')),  [periodosManutencao.items])
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

  function setFilter(key, val) { setFilters(prev => ({ ...prev, [key]: val })) }
  function clearFilters() { setFilters({ category: '', status: '', dept: '', warranty: '', manutLimpeza: '', manutFormatacao: '' }) }

  const hasFilters = Object.values(filters).some(Boolean)

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
      { label: 'Em dia',    value: data.warranty.active,      color: WARRANTY_COLORS[3] },
      { label: 'Sem info',  value: data.warranty.none,        color: WARRANTY_COLORS[4] },
    ].filter(d => d.value > 0)
  }, [data])

  const statusData = useMemo(() => {
    if (!data?.by_status) return []
    const corMap = Object.fromEntries(situacoes.items.map(s => [s.id, s.cor]))
    return data.by_status.map(s => ({ ...s, color: corToHex(corMap[s.id] ?? '') }))
  }, [data, situacoes.items])

  const warrantyAlert = data ? (data.warranty?.expired ?? 0) + (data.warranty?.expiring_30 ?? 0) : null

  function handleExportCSV() {
    const headers = ['Hostname', 'Categoria', 'Status', 'Setor', 'Responsável', 'Serial', 'Marca', 'Modelo', 'Localização', 'Data Compra', 'Garantia']
    const rows = (filteredAssets ?? assets).map(a => [
      a.name, a.category, a.status, a.department, a.assignedTo, a.serialNumber,
      a.brand, a.model, a.location, a.purchaseDate, a.warrantyExpiry,
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n')
    exportCSV(`inventario-ti-${new Date().toISOString().split('T')[0]}.csv`, csv)
  }

  const selectClass = 'text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer min-w-[120px]'

  return (
    <div className="min-h-full bg-slate-100 flex flex-col">

      {/* ── Top header (dark) ─────────────────────────────────────────────── */}
      <div className="bg-slate-800 px-5 pt-5 pb-0 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Relatórios e Análises</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inventário de Ativos de TI
              {!loading && data && (
                <span className="ml-1.5 text-slate-500">
                  • {filteredAssets != null ? filteredAssets.length : data.total} ativo{(filteredAssets?.length ?? data.total) !== 1 ? 's' : ''}
                  {hasFilters ? ' filtrados' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <FileText size={13} /> Exportar Relatório
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Download size={13} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Filter strip */}
        <div className="bg-slate-700/60 rounded-t-2xl px-4 py-2.5 flex flex-wrap items-center gap-2">
          <select value={filters.category} onChange={e => setFilter('category', e.target.value)} className={selectClass}>
            <option value="">Todas categorias</option>
            {categorias.items.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className={selectClass}>
            <option value="">Todos os status</option>
            {situacoes.items.filter(s => s.id !== 'descartado').map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>

          <select value={filters.dept} onChange={e => setFilter('dept', e.target.value)} className={selectClass}>
            <option value="">Todos os setores</option>
            {setores.items.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
          </select>

          <select value={filters.warranty} onChange={e => setFilter('warranty', e.target.value)} className={selectClass}>
            <option value="">Garantia — todas</option>
            <option value="a_vencer">Garantia a vencer (≤90d)</option>
            <option value="vencida">Garantia vencida</option>
          </select>

          <select value={filters.manutLimpeza} onChange={e => setFilter('manutLimpeza', e.target.value)} className={selectClass} disabled={!limpezaPeriodo}>
            <option value="">Limpeza — todas</option>
            <option value="a_vencer">Limpeza a vencer</option>
            <option value="vencida">Limpeza vencida</option>
          </select>

          <select value={filters.manutFormatacao} onChange={e => setFilter('manutFormatacao', e.target.value)} className={selectClass} disabled={!formatacaoPeriodo}>
            <option value="">Formatação — todas</option>
            <option value="a_vencer">Formatação a vencer</option>
            <option value="vencida">Formatação vencida</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors">
              <X size={11} /> Limpar
            </button>
          )}

          {loading && <RefreshCw size={13} className="text-blue-400 animate-spin ml-auto" />}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 p-5 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">
            <strong>Erro ao carregar dados:</strong> {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label={filteredAssets ? 'Ativos filtrados' : 'Total de Ativos'}
            value={filteredAssets ? filteredAssets.length : data?.total}
            sub={data?.total != null && filteredAssets == null ? `${data.total.toLocaleString('pt-BR')} cadastrados` : undefined}
            icon={Package} colorClass="bg-blue-500" loading={loading}
          />
          <KpiCard
            label="Manutenções"
            value={data?.total_manut}
            icon={Wrench} colorClass="bg-violet-500" loading={loading}
          />
          <KpiCard
            label="Garantias em dia"
            value={data?.warranty?.active}
            icon={Shield} colorClass="bg-emerald-500" loading={loading}
          />
          <KpiCard
            label="Garantias em alerta"
            value={warrantyAlert}
            icon={AlertTriangle} colorClass="bg-orange-500" loading={loading}
          />
        </div>

        {/* Filtered assets table */}
        {filteredAssets && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Ativos filtrados</h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                {filteredAssets.length}
              </span>
            </div>
            {filteredAssets.length === 0 ? (
              <EmptyChart text="Nenhum ativo com esses filtros" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-2.5 text-slate-500 font-medium">Hostname</th>
                      <th className="px-4 py-2.5 text-slate-500 font-medium">Categoria</th>
                      <th className="px-4 py-2.5 text-slate-500 font-medium">Setor</th>
                      <th className="px-4 py-2.5 text-slate-500 font-medium">Garantia</th>
                      {limpezaPeriodo   && <th className="px-4 py-2.5 text-slate-500 font-medium">{limpezaPeriodo.tipo} (próx.)</th>}
                      {formatacaoPeriodo && <th className="px-4 py-2.5 text-slate-500 font-medium">{formatacaoPeriodo.tipo} (próx.)</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredAssets.map(a => {
                      const exp = a.warrantyExpiry ? new Date(a.warrantyExpiry) : null
                      const expired = exp && exp < today
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-slate-700">{a.name}</td>
                          <td className="px-4 py-2.5 text-slate-500">{a.category || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{a.department || '—'}</td>
                          <td className="px-4 py-2.5">
                            {!exp ? <span className="text-slate-400">—</span> : (
                              <span className={`font-medium ${expired ? 'text-red-600' : 'text-emerald-600'}`}>
                                {exp.toLocaleDateString('pt-BR')}
                                {expired && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">vencida</span>}
                              </span>
                            )}
                          </td>
                          {limpezaPeriodo && (
                            <td className="px-4 py-2.5">
                              {(() => {
                                const st  = getMaintenanceStatus(a, limpezaPeriodo.tipo, limpezaPeriodo.dias, today)
                                const lbl = nextDueLabel(a, limpezaPeriodo.tipo, limpezaPeriodo.dias, today)
                                return <span className={`font-medium ${st === 'vencida' ? 'text-red-600' : st === 'a_vencer' ? 'text-amber-600' : 'text-emerald-600'}`}>{lbl}</span>
                              })()}
                            </td>
                          )}
                          {formatacaoPeriodo && (
                            <td className="px-4 py-2.5">
                              {(() => {
                                const st  = getMaintenanceStatus(a, formatacaoPeriodo.tipo, formatacaoPeriodo.dias, today)
                                const lbl = nextDueLabel(a, formatacaoPeriodo.tipo, formatacaoPeriodo.dias, today)
                                return <span className={`font-medium ${st === 'vencida' ? 'text-red-600' : st === 'a_vencer' ? 'text-amber-600' : 'text-emerald-600'}`}>{lbl}</span>
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

        {/* ── Row 1: Category + Status + Department ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <ChartCard title="Ativos por Categoria" sub={`${data?.by_category?.length ?? 0} categorias`} loading={loading}>
            {data?.by_category?.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart layout="vertical" data={data.by_category} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <RechTooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
                    {data.by_category.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : !loading && <EmptyChart />}
          </ChartCard>

          <ChartCard title="Status dos Ativos" loading={loading}>
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={145}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={44} outerRadius={65} dataKey="value" paddingAngle={2}>
                      {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RechTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <PieLegend data={statusData} />
              </>
            ) : !loading && <EmptyChart />}
          </ChartCard>

          <ChartCard title="Ativos por Setor" sub={`${data?.by_department?.length ?? 0} setores`} loading={loading}>
            {data?.by_department?.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart layout="vertical" data={data.by_department} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <RechTooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : !loading && <EmptyChart />}
          </ChartCard>
        </div>

        {/* ── Row 2: Manut trend + Top Marcas + Warranty ────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <ChartCard title="Manutenções por Mês" sub="últimos 12 meses" loading={loading} className="md:col-span-2">
            {monthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="manutGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechTooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="count" name="Manutenções" stroke="#3b82f6" strokeWidth={2.5}
                    fill="url(#manutGrad)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : !loading && <EmptyChart />}
          </ChartCard>

          <ChartCard title="Top Marcas" sub="até 8 marcas" loading={loading}>
            {data?.by_brand?.length > 0 ? (
              <div className="space-y-2">
                {data.by_brand.slice(0, 8).map((b, i) => {
                  const max = data.by_brand[0]?.count ?? 1
                  const pct = Math.round((b.count / max) * 100)
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium truncate max-w-[130px]">{b.label}</span>
                        <span className="font-bold text-slate-700 ml-2">{b.count.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : !loading && <EmptyChart />}
          </ChartCard>
        </div>

        {/* ── Row 3: Tipos Manut + Warranty pie ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <ChartCard title="Tipos de Manutenção" sub="top 10 tipos mais realizados" loading={loading}>
            {data?.manut_by_type?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.manut_by_type} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false}
                    angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechTooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {data.manut_by_type.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : !loading && <EmptyChart />}
          </ChartCard>

          <ChartCard title="Status de Garantia" loading={loading}>
            {warrantyData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={145}>
                  <PieChart>
                    <Pie data={warrantyData} cx="50%" cy="50%" innerRadius={44} outerRadius={65} dataKey="value" paddingAngle={2}>
                      {warrantyData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RechTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <PieLegend data={warrantyData} />
              </>
            ) : !loading && <EmptyChart />}
          </ChartCard>

        </div>
      </div>
    </div>
  )
}
