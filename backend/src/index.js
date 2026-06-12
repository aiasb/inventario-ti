require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { getPool } = require('./db')
const { initDb } = require('./initDb')
const { createCrudRouter } = require('./routes/master')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// ─── Rotas ───────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'))
app.use('/api/ativos',      require('./routes/ativos'))
app.use('/api/reports',     require('./routes/reports'))
app.use('/api/admin',       require('./routes/admin'))

// Master data — CRUD genérico
app.use('/api/responsaveis',        createCrudRouter('responsaveis'))
app.use('/api/setores',             createCrudRouter('setores'))
app.use('/api/categorias',          createCrudRouter('categorias'))
app.use('/api/marcas',              createCrudRouter('marcas'))
app.use('/api/situacoes',           createCrudRouter('situacoes'))
app.use('/api/analistas',           createCrudRouter('analistas'))
app.use('/api/periodos_manutencao', createCrudRouter('periodos_manutencao'))

// DELETE /api/manutencoes/:id (sem precisar do ativo_id)
const { requireAuth, requireWrite } = require('./middleware/auth')
const { sql, getPool: gp } = require('./db')
app.delete('/api/manutencoes/:id', requireAuth, requireWrite, async (req, res) => {
  try {
    const pool = await gp()
    await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM manutencoes WHERE id = @id')
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// ─── Startup com retry ───────────────────────────────────────────────────────
async function start() {
  let retries = 20
  while (retries > 0) {
    try {
      console.log('Conectando ao banco de dados...')
      const pool = await getPool()
      await initDb(pool)
      console.log('Banco de dados pronto.')
      break
    } catch (err) {
      retries--
      if (retries === 0) { console.error('Falha ao conectar ao banco:', err.message); process.exit(1) }
      console.log(`Aguardando SQL Server... (${retries} tentativas restantes)`)
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`))
}

start()
