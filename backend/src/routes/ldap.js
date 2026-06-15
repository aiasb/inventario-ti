const express = require('express')
const { sql, getPool } = require('../db')
const { requireAuth, requireWrite } = require('../middleware/auth')
const { v4: uuidv4 } = require('uuid')

const router = express.Router()

// ldapts is ESM-only; use dynamic import inside async functions
async function createClient(servidor) {
  const { Client } = await import('ldapts')
  const proto = servidor.usar_ssl ? 'ldaps' : 'ldap'
  return new Client({
    url: `${proto}://${servidor.host}:${servidor.porta}`,
    connectTimeout: 8000,
    timeout: 15000,
    tlsOptions: servidor.usar_ssl ? { rejectUnauthorized: false } : undefined,
  })
}

function rowToServer(row) {
  return {
    id:               row.id,
    nome:             row.nome,
    host:             row.host,
    porta:            row.porta,
    usar_ssl:         !!row.usar_ssl,
    base_dn:          row.base_dn,
    bind_dn:          row.bind_dn,
    filtro:           row.filtro,
    attr_nome:        row.attr_nome,
    attr_email:       row.attr_email,
    attr_setor:       row.attr_setor,
    attr_telefone:    row.attr_telefone,
    sync_intervalo_h: row.sync_intervalo_h,
    ativo:            !!row.ativo,
    last_sync:        row.last_sync,
    created_at:       row.created_at,
  }
}

// ─── GET /api/ldap/servidores ──────────────────────────────────────────────────
router.get('/servidores', requireAuth, async (req, res) => {
  try {
    const pool = await getPool()
    const { recordset } = await pool.request().query(`
      SELECT id, nome, host, porta, usar_ssl, base_dn, bind_dn,
             filtro, attr_nome, attr_email, attr_setor, attr_telefone,
             sync_intervalo_h, ativo, last_sync, created_at
      FROM ldap_servidores ORDER BY created_at
    `)
    res.json(recordset.map(rowToServer))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/ldap/servidores ─────────────────────────────────────────────────
router.post('/servidores', requireAuth, requireWrite, async (req, res) => {
  try {
    const pool = await getPool()
    const b = req.body
    const { recordset } = await pool.request()
      .input('id',            sql.UniqueIdentifier, uuidv4())
      .input('nome',          sql.NVarChar,  b.nome)
      .input('host',          sql.NVarChar,  b.host)
      .input('porta',         sql.Int,       Number(b.porta) || 389)
      .input('usar_ssl',      sql.Bit,       b.usar_ssl ? 1 : 0)
      .input('base_dn',       sql.NVarChar,  b.base_dn)
      .input('bind_dn',       sql.NVarChar,  b.bind_dn)
      .input('bind_password', sql.NVarChar,  b.bind_password)
      .input('filtro',        sql.NVarChar,  b.filtro        || '(&(objectClass=user)(objectCategory=person))')
      .input('attr_nome',     sql.NVarChar,  b.attr_nome     || 'displayName')
      .input('attr_email',    sql.NVarChar,  b.attr_email    || 'mail')
      .input('attr_setor',    sql.NVarChar,  b.attr_setor    || 'department')
      .input('attr_telefone', sql.NVarChar,  b.attr_telefone || 'telephoneNumber')
      .input('sync_h',        sql.Int,       Number(b.sync_intervalo_h) || 24)
      .input('ativo',         sql.Bit,       b.ativo !== false ? 1 : 0)
      .query(`
        INSERT INTO ldap_servidores
          (id, nome, host, porta, usar_ssl, base_dn, bind_dn, bind_password,
           filtro, attr_nome, attr_email, attr_setor, attr_telefone, sync_intervalo_h, ativo)
        OUTPUT INSERTED.id, INSERTED.nome, INSERTED.host, INSERTED.porta, INSERTED.usar_ssl,
               INSERTED.base_dn, INSERTED.bind_dn, INSERTED.filtro, INSERTED.attr_nome,
               INSERTED.attr_email, INSERTED.attr_setor, INSERTED.attr_telefone,
               INSERTED.sync_intervalo_h, INSERTED.ativo, INSERTED.last_sync, INSERTED.created_at
        VALUES (@id, @nome, @host, @porta, @usar_ssl, @base_dn, @bind_dn, @bind_password,
                @filtro, @attr_nome, @attr_email, @attr_setor, @attr_telefone, @sync_h, @ativo)
      `)
    res.status(201).json(rowToServer(recordset[0]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── PUT /api/ldap/servidores/:id ─────────────────────────────────────────────
router.put('/servidores/:id', requireAuth, requireWrite, async (req, res) => {
  try {
    const pool = await getPool()
    const b = req.body
    const changePass = b.bind_password && b.bind_password !== '••••••••'

    const request = pool.request()
      .input('id',            sql.UniqueIdentifier, req.params.id)
      .input('nome',          sql.NVarChar, b.nome)
      .input('host',          sql.NVarChar, b.host)
      .input('porta',         sql.Int,      Number(b.porta) || 389)
      .input('usar_ssl',      sql.Bit,      b.usar_ssl ? 1 : 0)
      .input('base_dn',       sql.NVarChar, b.base_dn)
      .input('bind_dn',       sql.NVarChar, b.bind_dn)
      .input('filtro',        sql.NVarChar, b.filtro || '(&(objectClass=user)(objectCategory=person))')
      .input('attr_nome',     sql.NVarChar, b.attr_nome     || 'displayName')
      .input('attr_email',    sql.NVarChar, b.attr_email    || 'mail')
      .input('attr_setor',    sql.NVarChar, b.attr_setor    || 'department')
      .input('attr_telefone', sql.NVarChar, b.attr_telefone || 'telephoneNumber')
      .input('sync_h',        sql.Int,      Number(b.sync_intervalo_h) || 24)
      .input('ativo',         sql.Bit,      b.ativo !== false ? 1 : 0)

    if (changePass) request.input('bind_password', sql.NVarChar, b.bind_password)

    const { recordset } = await request.query(`
      UPDATE ldap_servidores SET
        nome = @nome, host = @host, porta = @porta, usar_ssl = @usar_ssl,
        base_dn = @base_dn, bind_dn = @bind_dn,
        ${changePass ? 'bind_password = @bind_password,' : ''}
        filtro = @filtro, attr_nome = @attr_nome, attr_email = @attr_email,
        attr_setor = @attr_setor, attr_telefone = @attr_telefone,
        sync_intervalo_h = @sync_h, ativo = @ativo
      OUTPUT INSERTED.id, INSERTED.nome, INSERTED.host, INSERTED.porta, INSERTED.usar_ssl,
             INSERTED.base_dn, INSERTED.bind_dn, INSERTED.filtro, INSERTED.attr_nome,
             INSERTED.attr_email, INSERTED.attr_setor, INSERTED.attr_telefone,
             INSERTED.sync_intervalo_h, INSERTED.ativo, INSERTED.last_sync, INSERTED.created_at
      WHERE id = @id
    `)
    if (!recordset[0]) return res.status(404).json({ error: 'Servidor não encontrado' })
    res.json(rowToServer(recordset[0]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── DELETE /api/ldap/servidores/:id ──────────────────────────────────────────
router.delete('/servidores/:id', requireAuth, requireWrite, async (req, res) => {
  try {
    const pool = await getPool()
    await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM ldap_servidores WHERE id = @id')
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/ldap/servidores/:id/test ───────────────────────────────────────
router.post('/servidores/:id/test', requireAuth, async (req, res) => {
  let client
  try {
    const pool = await getPool()
    const { recordset } = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM ldap_servidores WHERE id = @id')
    if (!recordset[0]) return res.status(404).json({ error: 'Servidor não encontrado' })

    const servidor = recordset[0]
    client = await createClient(servidor)

    await client.bind(servidor.bind_dn, servidor.bind_password)
    await client.unbind()
    res.json({ ok: true, message: `Conexão com ${servidor.host}:${servidor.porta} estabelecida.` })
  } catch (err) {
    try { await client?.unbind() } catch (_) {}
    res.status(400).json({ ok: false, error: err.message })
  }
})

// ─── POST /api/ldap/servidores/:id/sync ───────────────────────────────────────
router.post('/servidores/:id/sync', requireAuth, requireWrite, async (req, res) => {
  let client
  try {
    const pool = await getPool()
    const { recordset } = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM ldap_servidores WHERE id = @id')
    if (!recordset[0]) return res.status(404).json({ error: 'Servidor não encontrado' })

    const srv = recordset[0]
    client = await createClient(srv)
    await client.bind(srv.bind_dn, srv.bind_password)

    const attrs = ['distinguishedName', srv.attr_nome, srv.attr_email, srv.attr_setor, srv.attr_telefone]
      .filter(Boolean)

    const { searchEntries } = await client.search(srv.base_dn, {
      scope: 'sub',
      filter: srv.filtro,
      attributes: attrs,
      sizeLimit: 10000,
      paged: true,
    })

    await client.unbind()

    let created = 0, updated = 0, skipped = 0

    for (const entry of searchEntries) {
      const dn = entry.dn
      const nome = String(entry[srv.attr_nome] || '').trim()
      if (!nome) { skipped++; continue }

      const email    = entry[srv.attr_email]    ? String(entry[srv.attr_email])    : null
      const setor    = entry[srv.attr_setor]    ? String(entry[srv.attr_setor])    : null
      const telefone = entry[srv.attr_telefone] ? String(entry[srv.attr_telefone]) : null

      const { recordset: existing } = await pool.request()
        .input('dn', sql.NVarChar(500), dn)
        .query('SELECT id FROM responsaveis WHERE ldap_dn = @dn')

      if (existing.length > 0) {
        await pool.request()
          .input('id',       sql.UniqueIdentifier, existing[0].id)
          .input('nome',     sql.NVarChar,         nome)
          .input('email',    sql.NVarChar,         email)
          .input('setor',    sql.NVarChar,         setor)
          .input('telefone', sql.NVarChar,         telefone)
          .query('UPDATE responsaveis SET nome=@nome, email=@email, setor=@setor, telefone=@telefone WHERE id=@id')
        updated++
      } else {
        await pool.request()
          .input('id',              sql.UniqueIdentifier, uuidv4())
          .input('nome',            sql.NVarChar,         nome)
          .input('email',           sql.NVarChar,         email)
          .input('setor',           sql.NVarChar,         setor)
          .input('telefone',        sql.NVarChar,         telefone)
          .input('ldap_dn',         sql.NVarChar(500),    dn)
          .input('ldap_servidor_id',sql.UniqueIdentifier, srv.id)
          .query(`INSERT INTO responsaveis (id, nome, email, setor, telefone, ldap_dn, ldap_servidor_id)
                  VALUES (@id, @nome, @email, @setor, @telefone, @ldap_dn, @ldap_servidor_id)`)
        created++
      }
    }

    // Update last_sync timestamp
    await pool.request()
      .input('id', sql.UniqueIdentifier, srv.id)
      .query('UPDATE ldap_servidores SET last_sync = GETDATE() WHERE id = @id')

    res.json({ ok: true, created, updated, skipped, total: searchEntries.length })
  } catch (err) {
    try { await client?.unbind() } catch (_) {}
    res.status(400).json({ ok: false, error: err.message })
  }
})

// ─── Auto-sync on startup + interval ──────────────────────────────────────────
async function autoSync() {
  try {
    const pool = await getPool()
    const { recordset: servers } = await pool.request().query(`
      SELECT * FROM ldap_servidores
      WHERE ativo = 1
        AND (last_sync IS NULL
          OR DATEDIFF(hour, last_sync, GETDATE()) >= sync_intervalo_h)
    `)

    for (const srv of servers) {
      let client
      try {
        client = await createClient(srv)
        await client.bind(srv.bind_dn, srv.bind_password)

        const attrs = ['distinguishedName', srv.attr_nome, srv.attr_email, srv.attr_setor, srv.attr_telefone].filter(Boolean)
        const { searchEntries } = await client.search(srv.base_dn, {
          scope: 'sub', filter: srv.filtro, attributes: attrs, sizeLimit: 10000, paged: true,
        })
        await client.unbind()

        let created = 0, updated = 0
        for (const entry of searchEntries) {
          const dn = entry.dn
          const nome = String(entry[srv.attr_nome] || '').trim()
          if (!nome) continue

          const email    = entry[srv.attr_email]    ? String(entry[srv.attr_email])    : null
          const setor    = entry[srv.attr_setor]    ? String(entry[srv.attr_setor])    : null
          const telefone = entry[srv.attr_telefone] ? String(entry[srv.attr_telefone]) : null

          const { recordset: ex } = await pool.request()
            .input('dn', sql.NVarChar(500), dn)
            .query('SELECT id FROM responsaveis WHERE ldap_dn = @dn')

          if (ex.length > 0) {
            await pool.request()
              .input('id', sql.UniqueIdentifier, ex[0].id)
              .input('nome', sql.NVarChar, nome).input('email', sql.NVarChar, email)
              .input('setor', sql.NVarChar, setor).input('telefone', sql.NVarChar, telefone)
              .query('UPDATE responsaveis SET nome=@nome,email=@email,setor=@setor,telefone=@telefone WHERE id=@id')
            updated++
          } else {
            await pool.request()
              .input('id', sql.UniqueIdentifier, uuidv4())
              .input('nome', sql.NVarChar, nome).input('email', sql.NVarChar, email)
              .input('setor', sql.NVarChar, setor).input('telefone', sql.NVarChar, telefone)
              .input('ldap_dn', sql.NVarChar(500), dn)
              .input('ldap_servidor_id', sql.UniqueIdentifier, srv.id)
              .query(`INSERT INTO responsaveis (id,nome,email,setor,telefone,ldap_dn,ldap_servidor_id)
                      VALUES (@id,@nome,@email,@setor,@telefone,@ldap_dn,@ldap_servidor_id)`)
            created++
          }
        }

        await pool.request()
          .input('id', sql.UniqueIdentifier, srv.id)
          .query('UPDATE ldap_servidores SET last_sync = GETDATE() WHERE id = @id')

        console.log(`[LDAP] Sync "${srv.nome}": +${created} criados, ${updated} atualizados`)
      } catch (err) {
        try { await client?.unbind() } catch (_) {}
        console.error(`[LDAP] Erro sync "${srv.nome}": ${err.message}`)
      }
    }
  } catch (err) {
    console.error('[LDAP] autoSync error:', err.message)
  }
}

// Schedule: check every hour if any server is due for sync
function startAutoSync() {
  // Run once after 30s (let DB/init finish first), then every hour
  setTimeout(() => {
    autoSync()
    setInterval(autoSync, 60 * 60 * 1000)
  }, 30000)
}

module.exports = router
module.exports.startAutoSync = startAutoSync
