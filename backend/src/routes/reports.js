const express = require('express')
const { sql, getPool } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/reports
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, status, department } = req.query
    const pool = await getPool()
    const request = pool.request()

    const conditions = ['1=1']
    if (category)   { conditions.push('a.category   = @category');   request.input('category',   sql.NVarChar, category) }
    if (status)     { conditions.push('a.status     = @status');     request.input('status',     sql.NVarChar, status) }
    if (department) { conditions.push('a.department = @department'); request.input('department', sql.NVarChar, department) }

    const where = conditions.join(' AND ')
    const { recordset } = await request.query(`
      SELECT
        a.id, a.name, a.category, a.status, a.serial_number, a.brand, a.model,
        a.department, a.assigned_to, a.memory, a.storage,
        a.purchase_date, a.warranty_expiry, a.location, a.notes,
        a.created_at, a.updated_at,
        COUNT(m.id)              AS manutencoes_count,
        COALESCE(SUM(m.cost), 0) AS custo_total
      FROM ativos a
      LEFT JOIN manutencoes m ON m.ativo_id = a.id
      WHERE ${where}
      GROUP BY
        a.id, a.name, a.category, a.status, a.serial_number, a.brand, a.model,
        a.department, a.assigned_to, a.memory, a.storage,
        a.purchase_date, a.warranty_expiry, a.location, a.notes,
        a.created_at, a.updated_at
    `)
    res.json(recordset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reports/proximas-manutencoes
router.get('/proximas-manutencoes', requireAuth, async (req, res) => {
  try {
    const pool = await getPool()
    const { recordset } = await pool.request().query('SELECT * FROM proximas_manutencoes')
    res.json(recordset.map(r => ({
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
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
