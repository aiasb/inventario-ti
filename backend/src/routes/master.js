const express = require('express')
const { sql, getPool } = require('../db')
const { requireAuth, requireWrite } = require('../middleware/auth')
const { v4: uuidv4 } = require('uuid')

// Definição de colunas aceitas por tabela (whitelist contra injeção)
const TABLE_CONFIG = {
  responsaveis:        { cols: ['nome', 'email', 'telefone', 'setor'] },
  setores:             { cols: ['nome', 'descricao', 'responsavel', 'ramal'] },
  categorias:          { cols: ['label', 'icon', 'color', 'descricao'] },
  marcas:              { cols: ['nome', 'segmento', 'site', 'observacoes'] },
  situacoes:           { cols: ['nome', 'descricao', 'cor'] },
  analistas:           { cols: ['nome', 'email', 'matricula'] },
  periodos_manutencao: { cols: ['tipo', 'dias'], intCols: ['dias'] },
}

function bindCols(request, body, cols, intCols = []) {
  for (const col of cols) {
    const val = body[col] ?? null
    if (intCols.includes(col)) {
      request.input(col, sql.Int, val !== null ? Number(val) : null)
    } else {
      request.input(col, sql.NVarChar, val !== null ? String(val) : null)
    }
  }
}

function createCrudRouter(tableName) {
  const { cols, intCols = [] } = TABLE_CONFIG[tableName]
  const router = express.Router()

  // GET /api/:table
  router.get('/', requireAuth, async (req, res) => {
    try {
      const pool = await getPool()
      const { recordset } = await pool.request()
        .query(`SELECT * FROM ${tableName} ORDER BY created_at`)
      res.json(recordset)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/:table
  router.post('/', requireAuth, requireWrite, async (req, res) => {
    try {
      const pool = await getPool()
      const id = req.body.id || uuidv4()
      const request = pool.request().input('id', sql.UniqueIdentifier, id)
      bindCols(request, req.body, cols, intCols)

      const colList = ['id', ...cols].join(', ')
      const valList = ['@id', ...cols.map(c => `@${c}`)].join(', ')

      const { recordset } = await request.query(
        `INSERT INTO ${tableName} (${colList}) OUTPUT INSERTED.* VALUES (${valList})`
      )
      res.status(201).json(recordset[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // PUT /api/:table/:id
  router.put('/:id', requireAuth, requireWrite, async (req, res) => {
    try {
      const pool = await getPool()
      const request = pool.request().input('id', sql.UniqueIdentifier, req.params.id)
      bindCols(request, req.body, cols, intCols)

      const setClauses = cols.map(c => `${c} = @${c}`).join(', ')
      const { recordset } = await request.query(
        `UPDATE ${tableName} SET ${setClauses} OUTPUT INSERTED.* WHERE id = @id`
      )
      if (!recordset[0]) return res.status(404).json({ error: 'Registro não encontrado' })
      res.json(recordset[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // DELETE /api/:table/:id
  router.delete('/:id', requireAuth, requireWrite, async (req, res) => {
    try {
      const pool = await getPool()
      await pool.request()
        .input('id', sql.UniqueIdentifier, req.params.id)
        .query(`DELETE FROM ${tableName} WHERE id = @id`)
      res.status(204).end()
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}

module.exports = { createCrudRouter }
