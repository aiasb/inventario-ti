const express = require('express')
const { sql, getPool } = require('../db')
const { requireAuth, requireWrite } = require('../middleware/auth')
const { v4: uuidv4 } = require('uuid')

const router = express.Router()

function toDateStr(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return String(val).split('T')[0]
}

function dbToAsset(row) {
  return {
    id:             row.id,
    name:           row.name,
    category:       row.category,
    status:         row.status,
    serialNumber:   row.serial_number,
    brand:          row.brand,
    model:          row.model,
    department:     row.department,
    assignedTo:     row.assigned_to,
    memory:         row.memory,
    storage:        row.storage,
    purchaseDate:   toDateStr(row.purchase_date),
    warrantyExpiry: toDateStr(row.warranty_expiry),
    discardDate:    toDateStr(row.discard_date),
    location:       row.location,
    notes:          row.notes,
  }
}

function dbToMaintenance(row) {
  return {
    id:          row.id,
    type:        row.type,
    description: row.description,
    analyst:     row.analyst,
    date:        toDateStr(row.date),
    cost:        row.cost,
    status:      row.status,
    resolution:  row.resolution,
    upgradeFrom: row.upgrade_from,
    upgradeTo:   row.upgrade_to,
    createdAt:   row.created_at,
  }
}

function bindAsset(req, asset) {
  return req
    .input('name',           sql.NVarChar,         asset.name           || null)
    .input('category',       sql.NVarChar,         asset.category       || null)
    .input('status',         sql.NVarChar,         asset.status         || null)
    .input('serial_number',  sql.NVarChar,         asset.serialNumber   || null)
    .input('brand',          sql.NVarChar,         asset.brand          || null)
    .input('model',          sql.NVarChar,         asset.model          || null)
    .input('department',     sql.NVarChar,         asset.department     || null)
    .input('assigned_to',    sql.NVarChar,         asset.assignedTo     || null)
    .input('memory',         sql.NVarChar,         asset.memory         || null)
    .input('storage',        sql.NVarChar,         asset.storage        || null)
    .input('purchase_date',  sql.Date,             asset.purchaseDate   || null)
    .input('warranty_expiry',sql.Date,             asset.warrantyExpiry || null)
    .input('discard_date',   sql.Date,             asset.discardDate    || null)
    .input('location',       sql.NVarChar,         asset.location       || null)
    .input('notes',          sql.NVarChar(sql.MAX), asset.notes         || null)
}

// GET /api/ativos
router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = await getPool()
    const ativos      = await pool.request().query('SELECT * FROM ativos ORDER BY name')
    const manutencoes = await pool.request().query('SELECT * FROM manutencoes ORDER BY date DESC')

    const byAsset = {}
    for (const m of manutencoes.recordset) {
      const key = m.ativo_id.toLowerCase()
      if (!byAsset[key]) byAsset[key] = []
      byAsset[key].push(dbToMaintenance(m))
    }

    res.json(ativos.recordset.map(a => ({
      ...dbToAsset(a),
      maintenances: byAsset[a.id.toLowerCase()] ?? [],
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/ativos
router.post('/', requireAuth, requireWrite, async (req, res) => {
  try {
    const pool = await getPool()
    const id = req.body.id || uuidv4()
    const asset = req.body

    const request = pool.request().input('id', sql.UniqueIdentifier, id)
    bindAsset(request, asset)

    const { recordset } = await request.query(`
      INSERT INTO ativos (id, name, category, status, serial_number, brand, model,
        department, assigned_to, memory, storage, purchase_date, warranty_expiry, discard_date, location, notes)
      OUTPUT INSERTED.*
      VALUES (@id, @name, @category, @status, @serial_number, @brand, @model,
        @department, @assigned_to, @memory, @storage, @purchase_date, @warranty_expiry, @discard_date, @location, @notes)
    `)

    res.status(201).json({ ...dbToAsset(recordset[0]), maintenances: [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/ativos/:id
router.put('/:id', requireAuth, requireWrite, async (req, res) => {
  try {
    const pool = await getPool()
    const request = pool.request().input('id', sql.UniqueIdentifier, req.params.id)
    bindAsset(request, req.body)

    const { recordset } = await request.query(`
      UPDATE ativos SET
        name = @name, category = @category, status = @status,
        serial_number = @serial_number, brand = @brand, model = @model,
        department = @department, assigned_to = @assigned_to,
        memory = @memory, storage = @storage,
        purchase_date = @purchase_date, warranty_expiry = @warranty_expiry,
        discard_date = @discard_date,
        location = @location, notes = @notes,
        updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `)

    if (!recordset[0]) return res.status(404).json({ error: 'Ativo não encontrado' })
    res.json(dbToAsset(recordset[0]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/ativos/:id
router.delete('/:id', requireAuth, requireWrite, async (req, res) => {
  try {
    const pool = await getPool()
    await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM ativos WHERE id = @id')
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/ativos/:id/manutencoes
router.post('/:id/manutencoes', requireAuth, requireWrite, async (req, res) => {
  try {
    const pool = await getPool()
    const mid  = req.body.id || uuidv4()
    const m    = req.body
    const assetUpdates = req.body.assetUpdates || {}

    const { recordset } = await pool.request()
      .input('id',          sql.UniqueIdentifier, mid)
      .input('ativo_id',    sql.UniqueIdentifier, req.params.id)
      .input('type',        sql.NVarChar,         m.type        || null)
      .input('description', sql.NVarChar(sql.MAX), m.description || null)
      .input('analyst',     sql.NVarChar,         m.analyst     || null)
      .input('date',        sql.Date,             m.date        || null)
      .input('cost',        sql.Decimal(10, 2),   m.cost        || null)
      .input('status',      sql.NVarChar,         m.status      || null)
      .input('resolution',  sql.NVarChar(sql.MAX), m.resolution || null)
      .input('upgrade_from',sql.NVarChar,         m.upgradeFrom || null)
      .input('upgrade_to',  sql.NVarChar,         m.upgradeTo   || null)
      .query(`
        INSERT INTO manutencoes
          (id, ativo_id, type, description, analyst, date, cost, status, resolution, upgrade_from, upgrade_to)
        OUTPUT INSERTED.*
        VALUES (@id, @ativo_id, @type, @description, @analyst, @date, @cost, @status, @resolution, @upgrade_from, @upgrade_to)
      `)

    if (Object.keys(assetUpdates).length > 0) {
      const upReq = pool.request().input('aid', sql.UniqueIdentifier, req.params.id)
      if (assetUpdates.memory)  upReq.input('memory',  sql.NVarChar, assetUpdates.memory)
      if (assetUpdates.storage) upReq.input('storage', sql.NVarChar, assetUpdates.storage)

      const setClauses = []
      if (assetUpdates.memory)  setClauses.push('memory = @memory')
      if (assetUpdates.storage) setClauses.push('storage = @storage')
      if (setClauses.length > 0) {
        await upReq.query(`UPDATE ativos SET ${setClauses.join(', ')}, updated_at = GETDATE() WHERE id = @aid`)
      }
    }

    res.status(201).json(dbToMaintenance(recordset[0]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/manutencoes/:id  (sem ativo_id necessário)
router.delete('/manutencoes/:mid', requireAuth, requireWrite, async (req, res) => {
  try {
    const pool = await getPool()
    await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.mid)
      .query('DELETE FROM manutencoes WHERE id = @id')
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
