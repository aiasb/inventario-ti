import { useState, useMemo, useRef } from 'react'
import { useMasterData } from '../context/MasterDataContext'
import { useAssets } from '../context/AssetsContext'
import { useTheme } from '../context/ThemeContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts'
import { RefreshCw, X, Download, Package, Wrench, Shield, AlertTriangle, FileText, Loader2 } from 'lucide-react'
import DatePicker from '../components/DatePicker'
import { exportCSV } from '../lib/exportCSV'
import { Capacitor } from '@capacitor/core'

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
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col ${className}`}>
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-slate-50 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={18} className="text-slate-300 dark:text-slate-600 animate-spin" />
          </div>
        ) : children}
      </div>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, colorClass, loading }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
        {loading ? (
          <div className="h-7 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg mt-1 animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
            {value?.toLocaleString('pt-BR') ?? '—'}
          </p>
        )}
        {sub && !loading && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
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
  const { assets, loading } = useAssets()
  const { isDark } = useTheme()
  const chartsRef = useRef(null)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [filters, setFilters] = useState({ category: '', status: '', dept: '', warranty: '', manutLimpeza: '', manutFormatacao: '' })
  const [customRanges, setCustomRanges] = useState({
    warranty:      { from: '', to: '' },
    manutLimpeza:  { from: '', to: '' },
    manutFormatacao: { from: '', to: '' },
  })

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  const limpezaPeriodo    = useMemo(() => periodosManutencao.items.find(p => normStr(p.tipo).includes('limpez')),  [periodosManutencao.items])
  const formatacaoPeriodo = useMemo(() => periodosManutencao.items.find(p => normStr(p.tipo).includes('format')), [periodosManutencao.items])

  function getNextDueDate(asset, tipo, dias) {
    const matches = (asset.maintenances ?? []).filter(m => m.type === tipo)
    if (!matches.length) return null
    const next = new Date(matches[0].date)
    next.setDate(next.getDate() + dias)
    return next
  }

  // Fallback: última manutenção cujo type contenha a busca (sem período cadastrado)
  function getLastManutDate(asset, search) {
    const matches = (asset.maintenances ?? []).filter(m => normStr(m.type).includes(search))
    return matches.length ? new Date(matches[0].date) : null
  }

  function inRange(date, from, to) {
    if (!date) return false
    if (from && date < new Date(from)) return false
    if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); if (date > t) return false }
    return true
  }

  function applyManutFilter(asset, filterVal, periodo, search, rangeKey) {
    if (!filterVal) return true
    if (filterVal === 'personalizado') {
      const date = periodo
        ? getNextDueDate(asset, periodo.tipo, periodo.dias)
        : getLastManutDate(asset, search)
      return inRange(date, customRanges[rangeKey].from, customRanges[rangeKey].to)
    }
    if (!periodo) return true // sem período, não filtra a_vencer/vencida
    return getMaintenanceStatus(asset, periodo.tipo, periodo.dias, today) === filterVal
  }

  const filteredAssets = useMemo(() => {
    const { category, status, dept, warranty, manutLimpeza, manutFormatacao } = filters
    if (!category && !status && !dept && !warranty && !manutLimpeza && !manutFormatacao) return null
    const in90 = new Date(today); in90.setDate(in90.getDate() + 90)
    return assets.filter(a => {
      if (category && a.category   !== category) return false
      if (status   && a.status     !== status)   return false
      if (dept     && a.department !== dept)     return false
      if (warranty) {
        const exp = a.warrantyExpiry ? new Date(a.warrantyExpiry.split('T')[0] + 'T00:00:00') : null
        if (!exp) return false
        if (warranty === 'vencida'       && exp >= today) return false
        if (warranty === 'a_vencer'      && (exp < today || exp > in90)) return false
        if (warranty === 'personalizado' && !inRange(exp, customRanges.warranty.from, customRanges.warranty.to)) return false
      }
      if (!applyManutFilter(a, manutLimpeza,   limpezaPeriodo,    'limpez',  'manutLimpeza'))   return false
      if (!applyManutFilter(a, manutFormatacao, formatacaoPeriodo, 'format', 'manutFormatacao')) return false
      return true
    })
  }, [assets, filters.category, filters.status, filters.dept,
      filters.warranty, filters.manutLimpeza, filters.manutFormatacao,
      customRanges, limpezaPeriodo, formatacaoPeriodo, today])

  function setFilter(key, val) { setFilters(prev => ({ ...prev, [key]: val })) }
  function setRange(key, field, val) { setCustomRanges(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } })) }
  function clearFilters() {
    setFilters({ category: '', status: '', dept: '', warranty: '', manutLimpeza: '', manutFormatacao: '' })
    setCustomRanges({ warranty: { from: '', to: '' }, manutLimpeza: { from: '', to: '' }, manutFormatacao: { from: '', to: '' } })
  }

  const hasFilters = Object.values(filters).some(Boolean)
  const hasCustom  = filters.warranty === 'personalizado' || filters.manutLimpeza === 'personalizado' || filters.manutFormatacao === 'personalizado'

  const data = useMemo(() => {
    const display = filteredAssets ?? assets
    if (!display.length) return null

    const t = new Date(); t.setHours(0, 0, 0, 0)
    const in30 = new Date(t); in30.setDate(t.getDate() + 30)
    const in90 = new Date(t); in90.setDate(t.getDate() + 90)

    // Warranty buckets
    let active = 0, expired = 0, expiring_30 = 0, expiring_90 = 0, none = 0
    for (const a of display) {
      if (!a.warrantyExpiry) { none++; continue }
      const exp = new Date(a.warrantyExpiry.split('T')[0] + 'T00:00:00')
      if (exp < t)      expired++
      else if (exp <= in30) expiring_30++
      else if (exp <= in90) expiring_90++
      else              active++
    }

    // by_category
    const catMap = {}
    for (const a of display) { if (a.category) catMap[a.category] = (catMap[a.category] || 0) + 1 }
    const by_category = Object.entries(catMap)
      .map(([id, count]) => ({ id, label: categorias.items.find(c => c.id === id)?.label ?? id, count }))
      .sort((a, b) => b.count - a.count)

    // by_status
    const statMap = {}
    for (const a of display) { if (a.status) statMap[a.status] = (statMap[a.status] || 0) + 1 }
    const by_status = Object.entries(statMap)
      .map(([id, value]) => {
        const sit = situacoes.items.find(s => s.id === id)
        return { id, label: sit?.nome ?? id, cor: sit?.cor ?? '', value }
      })
      .sort((a, b) => b.value - a.value)

    // by_department
    const deptMap = {}
    for (const a of display) { if (a.department) deptMap[a.department] = (deptMap[a.department] || 0) + 1 }
    const by_department = Object.entries(deptMap)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)

    // manut_by_month (últimos 12 meses)
    const monthMap = {}
    for (const a of display) {
      for (const m of (a.maintenances ?? [])) {
        if (!m.date) continue
        const month = m.date.split('T')[0].substring(0, 7)
        monthMap[month] = (monthMap[month] || 0) + 1
      }
    }
    const manut_by_month = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([month, count]) => ({ month, count }))

    // manut_by_type (top 10)
    const typeMap = {}
    for (const a of display) {
      for (const m of (a.maintenances ?? [])) {
        if (!m.type) continue
        typeMap[m.type] = (typeMap[m.type] || 0) + 1
      }
    }
    const manut_by_type = Object.entries(typeMap)
      .sort(([, a], [, b]) => b - a).slice(0, 10)
      .map(([label, count]) => ({ label, count }))

    return {
      total: display.length,
      total_manut: display.reduce((s, a) => s + (a.maintenances?.length ?? 0), 0),
      warranty: { active, expired, expiring_30, expiring_90, none },
      by_category, by_status, by_department, manut_by_month, manut_by_type,
    }
  }, [filteredAssets, assets, categorias.items, situacoes.items])

  const monthData = useMemo(() =>
    (data?.manut_by_month ?? []).map(m => ({
      ...m,
      label: new Date(m.month + '-02').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    }))
  , [data])

  const assetAgeData = useMemo(() => {
    const now = new Date()
    const withDate = (filteredAssets ?? assets).filter(a => a.purchaseDate)
    if (!withDate.length) return null

    const ageYears = a => (now - new Date(a.purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25)
    const avg = withDate.reduce((s, a) => s + ageYears(a), 0) / withDate.length

    const brackets = [
      { label: '< 1 ano',  min: 0, max: 1  },
      { label: '1–2 anos', min: 1, max: 2  },
      { label: '2–3 anos', min: 2, max: 3  },
      { label: '3–5 anos', min: 3, max: 5  },
      { label: '5+ anos',  min: 5, max: Infinity },
    ]
    const distribution = brackets.map((b, i) => ({
      label: b.label,
      count: withDate.filter(a => { const y = ageYears(a); return y >= b.min && y < b.max }).length,
      color: PALETTE[i % PALETTE.length],
    })).filter(b => b.count > 0)

    const totalYears  = Math.floor(avg)
    const totalMonths = Math.round((avg - totalYears) * 12)

    return { avg, totalYears, totalMonths, distribution, total: withDate.length }
  }, [assets, filteredAssets])

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
    return data.by_status.map(s => ({ ...s, color: corToHex(s.cor) }))
  }, [data])

  const warrantyAlert = data ? (data.warranty?.expired ?? 0) + (data.warranty?.expiring_30 ?? 0) : null

  async function handleExportPDF() {
    if (!chartsRef.current || exportingPDF) return
    setExportingPDF(true)
    try {
      const domtoimage = (await import('dom-to-image-more')).default
      const { jsPDF }  = await import('jspdf')

      const el   = chartsRef.current
      const rect = el.getBoundingClientRect()

      // dom-to-image-more renders via native browser engine — handles oklch + SVG correctly
      const dataUrl = await domtoimage.toPng(el, {
        scale: 2,
        bgcolor: '#f1f5f9',
        width:  rect.width,
        height: rect.height,
      })

      // Load image to get actual pixel dimensions
      const img = new Image()
      await new Promise(res => { img.onload = res; img.src = dataUrl })
      const actualW = img.naturalWidth
      const actualH = img.naturalHeight

      const pdf         = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW       = pdf.internal.pageSize.getWidth()
      const pageH       = pdf.internal.pageSize.getHeight()
      const margin      = 10
      const usableW     = pageW - margin * 2
      const pixPerMm    = actualW / usableW
      const date        = new Date().toLocaleDateString('pt-BR')

      pdf.setFontSize(13)
      pdf.setTextColor(30, 41, 59)
      pdf.text('Relatórios e Análises — Inventário de TI', margin, margin + 6)
      pdf.setFontSize(8)
      pdf.setTextColor(100, 116, 139)
      pdf.text(`Gerado em ${date}${hasFilters ? ' · Filtros ativos' : ''}`, margin, margin + 12)

      // Paginate
      let srcYpx = 0
      let firstPage = true
      while (srcYpx < actualH) {
        const yMm      = firstPage ? margin + 18 : margin
        const availHmm = pageH - yMm - margin
        const sliceHpx = Math.min(Math.floor(availHmm * pixPerMm), actualH - srcYpx)
        if (sliceHpx <= 0) break

        const slice = document.createElement('canvas')
        slice.width  = actualW
        slice.height = sliceHpx
        slice.getContext('2d').drawImage(img, 0, srcYpx, actualW, sliceHpx, 0, 0, actualW, sliceHpx)
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, yMm, usableW, sliceHpx / pixPerMm)

        srcYpx += sliceHpx
        firstPage = false
        if (srcYpx < actualH) pdf.addPage()
      }

      const filename = `relatorio-ti-${new Date().toISOString().split('T')[0]}.pdf`

      if (Capacitor.isNativePlatform()) {
        const { Filesystem } = await import('@capacitor/filesystem')
        const { Share }      = await import('@capacitor/share')
        const { Directory }  = await import('@capacitor/filesystem')
        const b64 = pdf.output('datauristring').split(',')[1]
        await Filesystem.writeFile({ path: filename, data: b64, directory: Directory.Cache })
        const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
        await Share.share({ title: filename, files: [uri], dialogTitle: 'Exportar PDF' })
      } else {
        pdf.save(filename)
      }
    } catch (err) {
      console.error('PDF export error:', err)
      alert(`Erro ao gerar PDF: ${err.message}`)
    } finally {
      setExportingPDF(false)
    }
  }

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

      {/* ── Top header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-5 pt-5 pb-0 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Relatórios e Análises</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inventário de Ativos de TI
              {!loading && data && (
                <span className="ml-1.5 text-slate-400">
                  • {filteredAssets != null ? filteredAssets.length : data.total} ativo{(filteredAssets?.length ?? data.total) !== 1 ? 's' : ''}
                  {hasFilters ? ' filtrados' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {exportingPDF ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              {exportingPDF ? 'Gerando PDF…' : 'Exportar Relatório'}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-medium transition-colors"
            >
              <Download size={13} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Filter strip */}
        <div className="bg-slate-50 rounded-t-2xl px-4 py-2.5 flex flex-wrap items-center gap-2">
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
            <option value="a_vencer">A vencer (≤90d)</option>
            <option value="vencida">Vencida</option>
            <option value="personalizado">Período personalizado</option>
          </select>

          <select value={filters.manutLimpeza} onChange={e => setFilter('manutLimpeza', e.target.value)} className={selectClass}>
            <option value="">Limpeza — todas</option>
            <option value="a_vencer">A vencer (≤30d)</option>
            <option value="vencida">Vencida</option>
            <option value="personalizado">Período personalizado</option>
          </select>

          <select value={filters.manutFormatacao} onChange={e => setFilter('manutFormatacao', e.target.value)} className={selectClass}>
            <option value="">Formatação — todas</option>
            <option value="a_vencer">A vencer (≤30d)</option>
            <option value="vencida">Vencida</option>
            <option value="personalizado">Período personalizado</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">
              <X size={11} /> Limpar
            </button>
          )}

          {loading && <RefreshCw size={13} className="text-blue-500 animate-spin ml-auto" />}
        </div>

        {/* Date range row — appears when any filter is "personalizado" */}
        {hasCustom && (
          <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 flex flex-wrap gap-4">
            {filters.warranty === 'personalizado' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">Garantia:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">De</span>
                  <DatePicker
                    compact
                    value={customRanges.warranty.from}
                    onChange={v => setRange('warranty', 'from', v)}
                    placeholder="De"
                    clearable={!!customRanges.warranty.from}
                  />
                  <span className="text-[10px] text-slate-500">Até</span>
                  <DatePicker
                    compact
                    value={customRanges.warranty.to}
                    onChange={v => setRange('warranty', 'to', v)}
                    placeholder="Até"
                    clearable={!!customRanges.warranty.to}
                  />
                </div>
              </div>
            )}

            {filters.manutLimpeza === 'personalizado' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
                  {limpezaPeriodo?.tipo ?? 'Limpeza'} (próx.):
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">De</span>
                  <DatePicker
                    compact
                    value={customRanges.manutLimpeza.from}
                    onChange={v => setRange('manutLimpeza', 'from', v)}
                    placeholder="De"
                    clearable={!!customRanges.manutLimpeza.from}
                  />
                  <span className="text-[10px] text-slate-500">Até</span>
                  <DatePicker
                    compact
                    value={customRanges.manutLimpeza.to}
                    onChange={v => setRange('manutLimpeza', 'to', v)}
                    placeholder="Até"
                    clearable={!!customRanges.manutLimpeza.to}
                  />
                </div>
              </div>
            )}

            {filters.manutFormatacao === 'personalizado' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
                  {formatacaoPeriodo?.tipo ?? 'Formatação'} (próx.):
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">De</span>
                  <DatePicker
                    compact
                    value={customRanges.manutFormatacao.from}
                    onChange={v => setRange('manutFormatacao', 'from', v)}
                    placeholder="De"
                    clearable={!!customRanges.manutFormatacao.from}
                  />
                  <span className="text-[10px] text-slate-500">Até</span>
                  <DatePicker
                    compact
                    value={customRanges.manutFormatacao.to}
                    onChange={v => setRange('manutFormatacao', 'to', v)}
                    placeholder="Até"
                    clearable={!!customRanges.manutFormatacao.to}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div ref={chartsRef} className="flex-1 p-5 space-y-4">



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
            value={data ? (data.warranty.active + data.warranty.expiring_30 + data.warranty.expiring_90) : undefined}
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
                          <td className="px-4 py-2.5 text-slate-500">{categorias.items.find(c => c.id?.toLowerCase() === a.category?.toLowerCase())?.label ?? a.category ?? '—'}</td>
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
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false} />
                  <RechTooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
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
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false} />
                  <RechTooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechTooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="count" name="Manutenções" stroke="#3b82f6" strokeWidth={2.5}
                    fill="url(#manutGrad)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : !loading && <EmptyChart />}
          </ChartCard>

          <ChartCard
            title="Idade Média dos Ativos"
            sub={assetAgeData ? `baseado em ${assetAgeData.total} ativo${assetAgeData.total !== 1 ? 's' : ''} com data de compra` : ''}
            loading={loading}
          >
            {assetAgeData ? (
              <div className="flex flex-col h-full">
                <div className="flex items-end gap-1.5 mb-4">
                  <span className="text-4xl font-bold text-slate-800">
                    {assetAgeData.totalYears}
                  </span>
                  <span className="text-sm text-slate-500 mb-1">
                    ano{assetAgeData.totalYears !== 1 ? 's' : ''}
                    {assetAgeData.totalMonths > 0 && (
                      <span className="ml-1">{assetAgeData.totalMonths} {assetAgeData.totalMonths !== 1 ? 'meses' : 'mês'}</span>
                    )}
                  </span>
                </div>
                <div className="space-y-2.5 flex-1">
                  {assetAgeData.distribution.map((b, i) => {
                    const max = Math.max(...assetAgeData.distribution.map(x => x.count))
                    const pct = Math.round((b.count / max) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 font-medium">{b.label}</span>
                          <span className="font-bold text-slate-700">{b.count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: b.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : !loading && <EmptyChart text="Sem ativos com data de compra" />}
          </ChartCard>
        </div>

        {/* ── Row 3: Tipos Manut + Warranty pie ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <ChartCard title="Tipos de Manutenção" sub="top 10 tipos mais realizados" loading={loading}>
            {data?.manut_by_type?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.manut_by_type} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false}
                    angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechTooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
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
