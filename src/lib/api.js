import { apiFetch } from './api-client'

// ─── Helpers de mapeamento ────────────────────────────────────────────────────

export function assetToDb(asset) {
  return {
    name:           asset.name,
    category:       asset.category       || null,
    status:         asset.status         || null,
    serialNumber:   asset.serialNumber   || null,
    brand:          asset.brand          || null,
    model:          asset.model          || null,
    department:     asset.department     || null,
    assignedTo:     asset.assignedTo     || null,
    memory:         asset.memory         || null,
    storage:        asset.storage        || null,
    purchaseDate:   asset.purchaseDate   || null,
    warrantyExpiry: asset.warrantyExpiry || null,
    discardDate:    asset.discardDate    || null,
    location:       asset.location       || null,
    notes:          asset.notes          || null,
  }
}

export function maintenanceToDb(assetId, maintenance) {
  return {
    ativo_id:    assetId,
    type:        maintenance.type        || null,
    description: maintenance.description || null,
    analyst:     maintenance.analyst     || null,
    date:        maintenance.date        || null,
    cost:        maintenance.cost        || null,
    status:      maintenance.status      || null,
    resolution:  maintenance.resolution  || null,
    upgradeFrom: maintenance.upgradeFrom || null,
    upgradeTo:   maintenance.upgradeTo   || null,
  }
}

// ─── ATIVOS ──────────────────────────────────────────────────────────────────

export async function fetchAtivos() {
  return apiFetch('/api/ativos')
}

export async function insertAtivo(asset) {
  return apiFetch('/api/ativos', {
    method: 'POST',
    body: JSON.stringify(assetToDb(asset)),
  })
}

export async function updateAtivo(id, updates) {
  return apiFetch(`/api/ativos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(assetToDb(updates)),
  })
}

export async function deleteAtivo(id) {
  return apiFetch(`/api/ativos/${id}`, { method: 'DELETE' })
}

// ─── MANUTENÇÕES ─────────────────────────────────────────────────────────────

export async function insertManutencao(ativoId, maintenance, assetUpdates = {}) {
  return apiFetch(`/api/ativos/${ativoId}/manutencoes`, {
    method: 'POST',
    body: JSON.stringify({ ...maintenance, assetUpdates }),
  })
}

export async function deleteManutencao(manutencaoId) {
  return apiFetch(`/api/manutencoes/${manutencaoId}`, { method: 'DELETE' })
}

// ─── MASTER DATA genérico ────────────────────────────────────────────────────

function crudApi(path) {
  return {
    fetch:  ()         => apiFetch(`/api/${path}`),
    insert: (row)      => apiFetch(`/api/${path}`,      { method: 'POST',   body: JSON.stringify(row) }),
    update: (id, patch) => apiFetch(`/api/${path}/${id}`, { method: 'PUT',    body: JSON.stringify(patch) }),
    delete: (id)       => apiFetch(`/api/${path}/${id}`, { method: 'DELETE' }),
  }
}

export const responsaveisApi        = crudApi('responsaveis')
export const setoresApi             = crudApi('setores')
export const categoriasApi          = crudApi('categorias')
export const marcasApi              = crudApi('marcas')
export const situacoesApi           = crudApi('situacoes')
export const analistasApi           = crudApi('analistas')
export const periodosManutencaoApi  = crudApi('periodos_manutencao')

// ─── PRÓXIMAS MANUTENÇÕES ─────────────────────────────────────────────────────

export async function fetchProximasManutencoes() {
  return apiFetch('/api/reports/proximas-manutencoes')
}

// ─── RELATÓRIOS ───────────────────────────────────────────────────────────────

export async function fetchReportData({ category = null, status = null, department = null } = {}) {
  const params = new URLSearchParams()
  if (category)   params.set('category',   category)
  if (status)     params.set('status',     status)
  if (department) params.set('department', department)
  const qs = params.toString()
  return apiFetch(`/api/reports${qs ? `?${qs}` : ''}`)
}

// ─── RESET ────────────────────────────────────────────────────────────────────

export async function resetData({ assets = true, masterData = false } = {}) {
  return apiFetch('/api/admin/reset', {
    method: 'POST',
    body: JSON.stringify({ assets, masterData }),
  })
}

// ─── SEED (agora feito pelo backend no startup) ───────────────────────────────

export async function seedIfEmpty() {
  await apiFetch('/api/health')
}
