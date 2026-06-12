const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { sql, getPool } = require('../db')
const { requireAuth } = require('../middleware/auth')
const { v4: uuidv4 } = require('uuid')

const router = express.Router()

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function toProfile(u) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name || '',
    nome: u.full_name || '',
    role: u.role,
    is_active: u.is_active,
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' })

    const pool = await getPool()
    const { recordset } = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM usuarios WHERE email = @email AND is_active = 1')

    const user = recordset[0]
    if (!user || !(await bcrypt.compare(password, user.senha_hash))) {
      return res.status(401).json({ error: 'Email ou senha inválidos' })
    }

    res.json({ token: makeToken(user), user: toProfile(user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' })

    const pool = await getPool()
    const { recordset: [{ total }] } = await pool.request()
      .query('SELECT COUNT(*) AS total FROM usuarios')

    const role = total === 0 ? 'admin' : 'viewer'
    const hash = await bcrypt.hash(password, 12)

    const { recordset } = await pool.request()
      .input('id',       sql.UniqueIdentifier, uuidv4())
      .input('email',    sql.NVarChar,         email)
      .input('hash',     sql.NVarChar,         hash)
      .input('fullName', sql.NVarChar,         fullName || '')
      .input('role',     sql.NVarChar,         role)
      .query(`
        INSERT INTO usuarios (id, email, senha_hash, full_name, role)
        OUTPUT INSERTED.*
        VALUES (@id, @email, @hash, @fullName, @role)
      `)

    const user = recordset[0]
    res.status(201).json({ token: makeToken(user), user: toProfile(user) })
  } catch (err) {
    if (err.number === 2627 || err.message?.includes('UQ_usuarios')) {
      return res.status(400).json({ error: 'Email já cadastrado' })
    }
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const pool = await getPool()
    const { recordset } = await pool.request()
      .input('id', sql.UniqueIdentifier, req.user.id)
      .query('SELECT id, email, full_name, role, is_active FROM usuarios WHERE id = @id')

    const user = recordset[0]
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(toProfile(user))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { full_name } = req.body
    const pool = await getPool()
    const { recordset } = await pool.request()
      .input('id',       sql.UniqueIdentifier, req.user.id)
      .input('fullName', sql.NVarChar,         full_name || '')
      .query(`
        UPDATE usuarios SET full_name = @fullName, updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.full_name, INSERTED.role, INSERTED.is_active
        WHERE id = @id
      `)
    res.json(toProfile(recordset[0]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/auth/password
router.patch('/password', requireAuth, async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Senha é obrigatória' })

    const hash = await bcrypt.hash(password, 12)
    const pool = await getPool()
    await pool.request()
      .input('id',   sql.UniqueIdentifier, req.user.id)
      .input('hash', sql.NVarChar,         hash)
      .query('UPDATE usuarios SET senha_hash = @hash, updated_at = GETDATE() WHERE id = @id')

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
