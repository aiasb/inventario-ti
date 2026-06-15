const express = require('express')
const bcrypt = require('bcryptjs')
const { sql, getPool } = require('../db')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()

function toProfile(u) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name || '',
    nome: u.full_name || '',
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
  }
}

// GET /api/admin/users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = await getPool()
    const { recordset } = await pool.request()
      .query('SELECT id, email, full_name, role, is_active, created_at FROM usuarios ORDER BY full_name')
    res.json(recordset.map(toProfile))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/admin/users/:id
router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { full_name, role, is_active } = req.body
    const pool = await getPool()

    const setClauses = []
    const request = pool.request().input('id', sql.UniqueIdentifier, req.params.id)

    if (full_name  !== undefined) { setClauses.push('full_name = @fullName'); request.input('fullName',  sql.NVarChar, full_name) }
    if (role       !== undefined) { setClauses.push('role = @role');           request.input('role',       sql.NVarChar, role) }
    if (is_active  !== undefined) { setClauses.push('is_active = @isActive');  request.input('isActive',   sql.Bit,      is_active ? 1 : 0) }

    if (setClauses.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' })

    const { recordset } = await request.query(`
      UPDATE usuarios SET ${setClauses.join(', ')}, updated_at = GETDATE()
      OUTPUT INSERTED.id, INSERTED.email, INSERTED.full_name, INSERTED.role, INSERTED.is_active
      WHERE id = @id
    `)
    if (!recordset[0]) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(toProfile(recordset[0]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' })
    }
    const pool = await getPool()
    await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM usuarios WHERE id = @id')
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/send-reset  — retorna senha temporária (sem e-mail)
router.post('/send-reset', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password } = req.body
    if (password !== undefined && password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' })
    }
    const tempPass = password || (Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase())
    const hash = await bcrypt.hash(tempPass, 12)

    const pool = await getPool()
    const { rowsAffected } = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('hash',  sql.NVarChar, hash)
      .query('UPDATE usuarios SET senha_hash = @hash, updated_at = GETDATE() WHERE email = @email')

    if (rowsAffected[0] === 0) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json({ tempPassword: tempPass })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/reset
router.post('/reset', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { assets = true, masterData = false } = req.body
    const pool = await getPool()

    if (assets) {
      await pool.request().query('DELETE FROM manutencoes')
      await pool.request().query('DELETE FROM ativos')
    }
    if (masterData) {
      const tables = ['periodos_manutencao', 'responsaveis', 'setores', 'categorias', 'marcas', 'situacoes', 'analistas']
      for (const t of tables) {
        await pool.request().query(`DELETE FROM ${t}`)
      }
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
