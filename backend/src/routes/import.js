const express = require('express')
const { sql, getPool } = require('../db')
const { requireAuth, requireWrite } = require('../middleware/auth')
const { v4: uuidv4 } = require('uuid')

const router = express.Router()

// POST /api/import/ativos
router.post('/ativos', requireAuth, requireWrite, async (req, res) => {
  const { assets } = req.body
  if (!Array.isArray(assets) || assets.length === 0) {
    return res.status(400).json({ error: 'Nenhum ativo para importar' })
  }

  const pool = await getPool()
  const result = { inserted: 0, skipped: 0, errors: [] }

  for (const asset of assets) {
    try {
      // Skip duplicates by serial_number
      if (asset.serialNumber) {
        const { recordset } = await pool.request()
          .input('sn', sql.NVarChar, asset.serialNumber)
          .query('SELECT id FROM ativos WHERE serial_number = @sn')
        if (recordset.length > 0) {
          result.skipped++
          continue
        }
      }

      await pool.request()
        .input('id',             sql.UniqueIdentifier,  uuidv4())
        .input('name',           sql.NVarChar,          asset.name            || null)
        .input('category',       sql.NVarChar,          asset.category        || null)
        .input('status',         sql.NVarChar,          asset.status          || null)
        .input('serial_number',  sql.NVarChar,          asset.serialNumber    || null)
        .input('brand',          sql.NVarChar,          asset.brand           || null)
        .input('model',          sql.NVarChar,          asset.model           || null)
        .input('department',     sql.NVarChar,          asset.department      || null)
        .input('assigned_to',    sql.NVarChar,          asset.assignedTo      || null)
        .input('memory',         sql.NVarChar,          asset.memory          || null)
        .input('storage',        sql.NVarChar,          asset.storage         || null)
        .input('purchase_date',  sql.Date,              asset.purchaseDate    || null)
        .input('warranty_expiry',sql.Date,              asset.warrantyExpiry  || null)
        .input('discard_date',   sql.Date,              asset.discardDate     || null)
        .input('location',       sql.NVarChar,          asset.location        || null)
        .input('notes',          sql.NVarChar(sql.MAX), asset.notes           || null)
        .query(`
          INSERT INTO ativos
            (id, name, category, status, serial_number, brand, model,
             department, assigned_to, memory, storage, purchase_date,
             warranty_expiry, discard_date, location, notes)
          VALUES
            (@id, @name, @category, @status, @serial_number, @brand, @model,
             @department, @assigned_to, @memory, @storage, @purchase_date,
             @warranty_expiry, @discard_date, @location, @notes)
        `)

      result.inserted++
    } catch (err) {
      result.errors.push({ name: asset.name || '?', error: err.message })
    }
  }

  res.json(result)
})

module.exports = router
