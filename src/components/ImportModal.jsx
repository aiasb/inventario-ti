import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Loader2, Download, AlertTriangle,
} from 'lucide-react'
import { useMasterData } from '../context/MasterDataContext'
import { apiFetch } from '../lib/api-client'

// ─── Column aliases ───────────────────────────────────────────────────────────

const HEADER_ALIASES = {
  // name
  hostname: 'name', nome: 'name', name: 'name',
  patrimonio: 'name', patrimônio: 'name', equipamento: 'name',
  descricao: 'name', descrição: 'name',
  // serialNumber
  serial: 'serialNumber', serialnumber: 'serialNumber',
  'numero de serie': 'serialNumber', 'número de série': 'serialNumber',
  'n serie': 'serialNumber', 'n° série': 'serialNumber', 'ns': 'serialNumber',
  // category
  categoria: 'category', category: 'category', tipo: 'category',
  // brand
  marca: 'brand', brand: 'brand', fabricante: 'brand',
  // model
  modelo: 'model', model: 'model',
  // status
  status: 'status', situacao: 'status', situação: 'status', estado: 'status',
  // department
  setor: 'department', departamento: 'department', department: 'department',
  // assignedTo
  responsavel: 'assignedTo', responsável: 'assignedTo', assignedto: 'assignedTo',
  usuario: 'assignedTo', usuário: 'assignedTo', 'atribuido a': 'assignedTo',
  // memory
  memoria: 'memory', memória: 'memory', memory: 'memory', ram: 'memory',
  // storage
  armazenamento: 'storage', storage: 'storage', hd: 'storage', ssd: 'storage', disco: 'storage',
  // purchaseDate
  'data compra': 'purchaseDate', 'data de compra': 'purchaseDate',
  compra: 'purchaseDate', purchasedate: 'purchaseDate',
  // warrantyExpiry
  garantia: 'warrantyExpiry', 'data garantia': 'warrantyExpiry',
  'vencimento garantia': 'warrantyExpiry', warranty: 'warrantyExpiry',
  // discardDate
  'data descarte': 'discardDate', descarte: 'discardDate', discarddate: 'discardDate',
  // location
  localizacao: 'location', localização: 'location', location: 'location', sala: 'location',
  // notes
  observacoes: 'notes', observações: 'notes', notes: 'notes', notas: 'notes', obs: 'notes',
}

const FIELD_LABELS = {
  name: 'Hostname', serialNumber: 'Serial', category: 'Categoria',
  brand: 'Marca', model: 'Modelo', status: 'Status',
  department: 'Setor', assignedTo: 'Responsável',
  memory: 'Memória', storage: 'Armazenamento',
  purchaseDate: 'Data Compra', warrantyExpiry: 'Garantia',
  discardDate: 'Data Descarte', location: 'Localização', notes: 'Observações',
}

const DATE_FIELDS = new Set(['purchaseDate', 'warrantyExpiry', 'discardDate'])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(str) {
  return String(str || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function mapHeader(h) {
  return HEADER_ALIASES[norm(h)] || null
}

function parseBRDate(val) {
  if (val === null || val === undefined || val === '') return null
  const str = String(val).trim()
  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  return null
}

function downloadTemplate() {
  const headers = [
    'Hostname', 'Serial', 'Categoria', 'Marca', 'Modelo', 'Status',
    'Setor', 'Responsável', 'Memória', 'Armazenamento',
    'Data Compra', 'Garantia', 'Data Descarte', 'Localização', 'Observações',
  ]
  const example = [
    'NOTEBOOK-001', 'SN123456', 'Notebook', 'Dell', 'Latitude 5420', 'Em uso',
    'TI', 'João Silva', '8GB', '256GB SSD',
    '01/01/2023', '01/01/2025', '', '', 'Observação opcional',
  ]
  const csv = [
    headers.join(','),
    example.map(v => `"${v}"`).join(','),
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_importacao.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportModal({ onClose, onImported }) {
  const { categorias, situacoes } = useMasterData()

  const [step, setStep]         = useState('upload') // 'upload' | 'preview' | 'importing' | 'done'
  const [rows, setRows]         = useState([])
  const [detected, setDetected] = useState({})       // header → field
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError]       = useState('')
  const [progress, setProgress] = useState(0)
  const [result, setResult]     = useState(null)
  const fileRef = useRef()

  function resolveCategory(label) {
    if (!label) return null
    const n = norm(label)
    const cat = categorias.items.find(c => norm(c.label) === n || norm(c.id) === n)
    return cat?.id || label
  }

  function resolveStatus(label) {
    if (!label) return null
    const n = norm(label)
    const s = situacoes.items.find(x => norm(x.nome) === n || norm(x.id) === n)
    return s?.id || label
  }

  function parseFile(file) {
    setError('')
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: false })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonRows = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          dateNF: 'DD/MM/YYYY',
          defval: '',
        })

        if (jsonRows.length === 0) {
          setError('A planilha está vazia.')
          return
        }

        const headers = Object.keys(jsonRows[0])
        const detectedMap = {}
        for (const h of headers) {
          const field = mapHeader(h)
          if (field) detectedMap[h] = field
        }

        if (Object.keys(detectedMap).length === 0) {
          setError('Nenhuma coluna reconhecida. Verifique os cabeçalhos ou baixe o modelo.')
          return
        }

        setDetected(detectedMap)
        setRows(jsonRows)
        setStep('preview')
      } catch (err) {
        setError(`Erro ao ler arquivo: ${err.message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function buildAssets() {
    return rows.map(row => {
      const asset = {}
      for (const [header, field] of Object.entries(detected)) {
        const val = row[header]
        if (val === null || val === undefined || val === '') continue
        if (DATE_FIELDS.has(field)) {
          asset[field] = parseBRDate(val)
        } else if (field === 'category') {
          asset[field] = resolveCategory(val)
        } else if (field === 'status') {
          asset[field] = resolveStatus(val)
        } else {
          asset[field] = String(val).trim() || null
        }
      }
      return asset
    }).filter(a => a.name)
  }

  async function handleImport() {
    const assets = buildAssets()
    if (assets.length === 0) {
      setError('Nenhum ativo com nome válido encontrado.')
      return
    }

    setStep('importing')
    setProgress(0)

    try {
      const BATCH = 50
      let totalInserted = 0, totalSkipped = 0
      const errors = []

      for (let i = 0; i < assets.length; i += BATCH) {
        const batch = assets.slice(i, i + BATCH)
        const res = await apiFetch('/api/import/ativos', {
          method: 'POST',
          body: JSON.stringify({ assets: batch }),
        })
        totalInserted += res.inserted || 0
        totalSkipped  += res.skipped  || 0
        errors.push(...(res.errors || []))
        setProgress(Math.round(((i + batch.length) / assets.length) * 100))
      }

      setResult({ inserted: totalInserted, skipped: totalSkipped, errors })
      setStep('done')
      onImported?.()
    } catch (err) {
      setError(err.message)
      setStep('preview')
    }
  }

  const assets         = step === 'preview' ? buildAssets() : []
  const mappedFields   = [...new Set(Object.values(detected))]
  const unmappedCount  = Object.keys(rows[0] ?? {}).filter(h => !detected[h]).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step !== 'importing' ? onClose : undefined} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Importar Planilha</h2>
              <p className="text-xs text-slate-500">
                {step === 'upload'    && 'Selecione um arquivo .xlsx ou .csv'}
                {step === 'preview'   && `${rows.length} linha(s) em "${fileName}"`}
                {step === 'importing' && 'Importando dados...'}
                {step === 'done'      && 'Importação concluída'}
              </p>
            </div>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-6">

          {/* ── Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Upload size={32} className="mx-auto mb-3 text-slate-400" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Arraste o arquivo aqui ou clique para selecionar
                </p>
                <p className="text-xs text-slate-400 mt-1">Suporte a .xlsx, .xls e .csv</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files[0]; if (f) parseFile(f) }}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />{error}
                </div>
              )}

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Download size={14} />
                Baixar modelo de planilha (.csv)
              </button>
            </div>
          )}

          {/* ── Preview ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Detected columns */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Colunas reconhecidas ({mappedFields.length})
                  {unmappedCount > 0 && <span className="ml-1 font-normal text-slate-400">· {unmappedCount} ignorada(s)</span>}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(detected).map(([h, field]) => (
                    <span key={h} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg font-medium">
                      <CheckCircle2 size={11} />
                      {h} → {FIELD_LABELS[field] || field}
                    </span>
                  ))}
                </div>
              </div>

              {assets.length < rows.length && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-amber-700 dark:text-amber-400 text-sm">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  {rows.length - assets.length} linha(s) sem nome serão ignoradas.
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />{error}
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-auto max-h-60 rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                      {mappedFields.map(f => (
                        <th key={f} className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {FIELD_LABELS[f] || f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assets.slice(0, 20).map((a, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        {mappedFields.map(f => (
                          <td key={f} className="px-3 py-1.5 text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={a[f] || ''}>
                            {a[f] || <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {assets.length > 20 && (
                  <p className="text-center text-xs text-slate-400 py-2 border-t border-slate-100 dark:border-slate-800">
                    + {assets.length - 20} linha(s) não exibidas
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => { setStep('upload'); setRows([]); setDetected({}); setError('') }}
                  className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  ← Escolher outro arquivo
                </button>
                <button
                  onClick={handleImport}
                  disabled={assets.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <Upload size={15} />
                  Importar {assets.length} ativo{assets.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* ── Importing ── */}
          {step === 'importing' && (
            <div className="text-center py-10 space-y-5">
              <Loader2 size={36} className="animate-spin text-emerald-500 mx-auto" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Importando ativos...</p>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">{progress}%</p>
            </div>
          )}

          {/* ── Done ── */}
          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center border border-emerald-200 dark:border-emerald-700/50">
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{result.inserted}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-500 font-medium mt-1">Importados</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center border border-amber-200 dark:border-amber-700/50">
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{result.skipped}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-500 font-medium mt-1">Ignorados</p>
                  <p className="text-xs text-amber-600/60 dark:text-amber-600/60">serial duplicado</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-200 dark:border-red-700/50">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{result.errors.length}</p>
                  <p className="text-xs text-red-700 dark:text-red-500 font-medium mt-1">Erros</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-36 overflow-auto space-y-1.5 bg-red-50 dark:bg-red-900/10 rounded-xl p-3 border border-red-200 dark:border-red-700/30">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <span><strong>{e.name}</strong>: {e.error}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
