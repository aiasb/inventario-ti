const sql = require('mssql')

const baseConfig = {
  server: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Inventario@2024',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let _pool = null

async function getPool() {
  if (_pool) return _pool

  // Garante que o banco existe antes de conectar
  const master = await new sql.ConnectionPool({ ...baseConfig, database: 'master' }).connect()
  await master.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'${process.env.DB_NAME || 'inventario_ti'}')
      CREATE DATABASE [${process.env.DB_NAME || 'inventario_ti'}]
  `)
  await master.close()

  _pool = await new sql.ConnectionPool({
    ...baseConfig,
    database: process.env.DB_NAME || 'inventario_ti',
  }).connect()

  return _pool
}

module.exports = { sql, getPool }
