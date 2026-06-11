/**
 * api.js — Funções de acesso ao Supabase para todas as entidades do inventário.
 * Cada função retorna { data, error } ou lança exceção se necessário.
 */
import { supabase } from './supabase'
import { initialCategorias, initialSituacoes } from '../data/mockData'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function handleError(error, context) {
  if (error) {
    console.error(`[API] ${context}:`, error.message)
    throw new Error(error.message)
  }
}

// Converte camelCase do app → snake_case do banco para ativos
export function assetToDb(asset) {
  return {
    name: asset.name,
    category: asset.category || null,
    status: asset.status || null,
    serial_number: asset.serialNumber || null,
    brand: asset.brand || null,
    model: asset.model || null,
    department: asset.department || null,
    assigned_to: asset.assignedTo || null,
    memory: asset.memory || null,
    storage: asset.storage || null,
    purchase_date: asset.purchaseDate || null,
    warranty_expiry: asset.warrantyExpiry || null,
    location: asset.location || null,
    notes: asset.notes || null,
  }
}

// Converte snake_case do banco → camelCase do app para ativos
export function dbToAsset(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: row.status,
    serialNumber: row.serial_number,
    brand: row.brand,
    model: row.model,
    department: row.department,
    assignedTo: row.assigned_to,
    memory: row.memory,
    storage: row.storage,
    purchaseDate: row.purchase_date,
    warrantyExpiry: row.warranty_expiry,
    location: row.location,
    notes: row.notes,
    maintenances: [],  // preenchido separadamente
  }
}

// Converte manutenção app → banco para fila offline
export function maintenanceToDb(assetId, maintenance) {
  return {
    ativo_id: assetId,
    type: maintenance.type || null,
    description: maintenance.description || null,
    analyst: maintenance.analyst || null,
    date: maintenance.date || null,
    cost: maintenance.cost || null,
    status: maintenance.status || null,
    resolution: maintenance.resolution || null,
    upgrade_from: maintenance.upgradeFrom || null,
    upgrade_to: maintenance.upgradeTo || null,
  }
}

// Converte manutenção do banco → app
export function dbToMaintenance(row) {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    analyst: row.analyst,
    date: row.date,
    cost: row.cost,
    status: row.status,
    resolution: row.resolution,
    upgradeFrom: row.upgrade_from,
    upgradeTo: row.upgrade_to,
    createdAt: row.created_at,
  }
}

// ─── ATIVOS ──────────────────────────────────────────────────────────────────

export async function fetchAtivos() {
  const { data: ativos, error: e1 } = await supabase
    .from('ativos')
    .select('*')
    .order('name')
  handleError(e1, 'fetchAtivos')

  const { data: manutencoes, error: e2 } = await supabase
    .from('manutencoes')
    .select('*')
    .order('date', { ascending: false })
  handleError(e2, 'fetchManutencoes')

  const maintenancesByAsset = {}
  for (const m of manutencoes ?? []) {
    if (!maintenancesByAsset[m.ativo_id]) maintenancesByAsset[m.ativo_id] = []
    maintenancesByAsset[m.ativo_id].push(dbToMaintenance(m))
  }

  return (ativos ?? []).map(a => ({
    ...dbToAsset(a),
    maintenances: maintenancesByAsset[a.id] ?? [],
  }))
}

export async function insertAtivo(asset) {
  const { data, error } = await supabase
    .from('ativos')
    .insert([assetToDb(asset)])
    .select()
    .single()
  handleError(error, 'insertAtivo')
  return { ...dbToAsset(data), maintenances: [] }
}

export async function updateAtivo(id, updates) {
  const { data, error } = await supabase
    .from('ativos')
    .update({ ...assetToDb(updates), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  handleError(error, 'updateAtivo')
  return dbToAsset(data)
}

export async function deleteAtivo(id) {
  const { error } = await supabase.from('ativos').delete().eq('id', id)
  handleError(error, 'deleteAtivo')
}

// ─── MANUTENÇÕES ─────────────────────────────────────────────────────────────

export async function insertManutencao(ativoId, maintenance, assetUpdates = {}) {
  // Insere o registro de manutenção
  const { data, error } = await supabase
    .from('manutencoes')
    .insert([{
      ativo_id: ativoId,
      type: maintenance.type || null,
      description: maintenance.description || null,
      analyst: maintenance.analyst || null,
      date: maintenance.date || null,
      cost: maintenance.cost || null,
      status: maintenance.status || null,
      resolution: maintenance.resolution || null,
      upgrade_from: maintenance.upgradeFrom || null,
      upgrade_to: maintenance.upgradeTo || null,
    }])
    .select()
    .single()
  handleError(error, 'insertManutencao')

  // Se houver atualizações no ativo (ex: upgrade de memória/SSD), aplica
  if (Object.keys(assetUpdates).length > 0) {
    const { error: e2 } = await supabase
      .from('ativos')
      .update({ ...assetToDb(assetUpdates), updated_at: new Date().toISOString() })
      .eq('id', ativoId)
    handleError(e2, 'updateAtivo (via manutencao)')
  }

  return dbToMaintenance(data)
}

export async function deleteManutencao(manutencaoId) {
  const { error } = await supabase.from('manutencoes').delete().eq('id', manutencaoId)
  handleError(error, 'deleteManutencao')
}

// ─── ENTIDADES MASTER DATA ────────────────────────────────────────────────────

async function fetchTable(table) {
  const { data, error } = await supabase.from(table).select('*').order('created_at')
  handleError(error, `fetch ${table}`)
  return data ?? []
}

async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert([row]).select().single()
  handleError(error, `insert ${table}`)
  return data
}

async function updateRow(table, id, patch) {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
  handleError(error, `update ${table}`)
  return data
}

async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  handleError(error, `delete ${table}`)
}

// — Responsáveis —
export const responsaveisApi = {
  fetch: () => fetchTable('responsaveis'),
  insert: (row) => insertRow('responsaveis', row),
  update: (id, patch) => updateRow('responsaveis', id, patch),
  delete: (id) => deleteRow('responsaveis', id),
}

// — Setores —
export const setoresApi = {
  fetch: () => fetchTable('setores'),
  insert: (row) => insertRow('setores', row),
  update: (id, patch) => updateRow('setores', id, patch),
  delete: (id) => deleteRow('setores', id),
}

// — Categorias —
export const categoriasApi = {
  fetch: () => fetchTable('categorias'),
  insert: (row) => insertRow('categorias', row),
  update: (id, patch) => updateRow('categorias', id, patch),
  delete: (id) => deleteRow('categorias', id),
}

// — Marcas —
export const marcasApi = {
  fetch: () => fetchTable('marcas'),
  insert: (row) => insertRow('marcas', row),
  update: (id, patch) => updateRow('marcas', id, patch),
  delete: (id) => deleteRow('marcas', id),
}

// — Situações —
export const situacoesApi = {
  fetch: () => fetchTable('situacoes'),
  insert: (row) => insertRow('situacoes', row),
  update: (id, patch) => updateRow('situacoes', id, patch),
  delete: (id) => deleteRow('situacoes', id),
}

// — Analistas —
export const analistasApi = {
  fetch: () => fetchTable('analistas'),
  insert: (row) => insertRow('analistas', row),
  update: (id, patch) => updateRow('analistas', id, patch),
  delete: (id) => deleteRow('analistas', id),
}

// — Períodos de Manutenção —
export const periodosManutencaoApi = {
  fetch: () => fetchTable('periodos_manutencao'),
  insert: (row) => insertRow('periodos_manutencao', { ...row, dias: Number(row.dias) }),
  update: (id, patch) => updateRow('periodos_manutencao', id, { ...patch, dias: Number(patch.dias) }),
  delete: (id) => deleteRow('periodos_manutencao', id),
}

// ─── PRÓXIMAS MANUTENÇÕES (VIEW) ─────────────────────────────────────────────

export async function fetchProximasManutencoes() {
  const { data, error } = await supabase
    .from('proximas_manutencoes')
    .select('*')
  handleError(error, 'fetchProximasManutencoes')
  return (data ?? []).map(r => ({
    assetId:       r.ativo_id,
    assetName:     r.ativo_nome,
    assetCategory: r.ativo_categoria,
    periodoId:     r.periodo_id,
    periodoTipo:   r.periodo_tipo,
    dias:          r.dias,
    lastDate:      r.ultima_data,
    nextDue:       r.proxima_prevista,
    status:        r.status,
    daysLeft:      r.dias_restantes,
  }))
}

// ─── RELATÓRIOS (RPC) ────────────────────────────────────────────────────────

export async function fetchReportData({ category = null, status = null, department = null } = {}) {
  const { data, error } = await supabase.rpc('get_report_data', {
    p_category: category || null,
    p_status:   status   || null,
    p_dept:     department || null,
  })
  handleError(error, 'fetchReportData')
  return data
}

// ─── RESET SISTEMA ───────────────────────────────────────────────────────────

export async function resetData({ assets = true, masterData = false } = {}) {
  if (assets) {
    const { error: e1 } = await supabase.from('manutencoes').delete().not('id', 'is', null)
    handleError(e1, 'resetData:manutencoes')
    const { error: e2 } = await supabase.from('ativos').delete().not('id', 'is', null)
    handleError(e2, 'resetData:ativos')
  }
  if (masterData) {
    const tables = ['periodos_manutencao', 'responsaveis', 'setores', 'categorias', 'marcas', 'situacoes', 'analistas']
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().not('id', 'is', null)
      handleError(error, `resetData:${table}`)
    }
  }
}

// ─── SEED INICIAL ─────────────────────────────────────────────────────────────
// Popula o banco com dados mock se as tabelas estiverem vazias.

export async function seedIfEmpty() {
  // Seed apenas dados estruturais necessários para os formulários funcionarem
  const seeds = [
    { table: 'situacoes', data: initialSituacoes.map(({ id, nome, descricao, cor }) => ({ id, nome, descricao, cor })) },
    { table: 'categorias', data: initialCategorias.map(({ id, label, icon, color, descricao }) => ({ id, label, icon, color, descricao })) },
  ]

  for (const { table, data } of seeds) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (count === 0) {
      await supabase.from(table).insert(data)
    }
  }
}
