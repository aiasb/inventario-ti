const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcryptjs')
const { sql } = require('./db')

async function initDb(pool) {
  // ─── Tabelas ──────────────────────────────────────────────────────────────

  await pool.request().query(`
    IF OBJECT_ID('usuarios', 'U') IS NULL
    CREATE TABLE usuarios (
      id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      email         NVARCHAR(255) NOT NULL,
      senha_hash    NVARCHAR(255) NOT NULL,
      full_name     NVARCHAR(255),
      role          NVARCHAR(50)  NOT NULL DEFAULT 'viewer',
      is_active     BIT           NOT NULL DEFAULT 1,
      created_at    DATETIME2     NOT NULL DEFAULT GETDATE(),
      updated_at    DATETIME2     NOT NULL DEFAULT GETDATE(),
      CONSTRAINT UQ_usuarios_email UNIQUE (email)
    )
  `)

  await pool.request().query(`
    IF OBJECT_ID('categorias', 'U') IS NULL
    CREATE TABLE categorias (
      id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      label      NVARCHAR(100) NOT NULL,
      icon       NVARCHAR(100),
      color      NVARCHAR(50),
      descricao  NVARCHAR(500),
      created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `)

  await pool.request().query(`
    IF OBJECT_ID('situacoes', 'U') IS NULL
    CREATE TABLE situacoes (
      id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      nome       NVARCHAR(100) NOT NULL,
      descricao  NVARCHAR(500),
      cor        NVARCHAR(50),
      created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `)

  await pool.request().query(`
    IF OBJECT_ID('responsaveis', 'U') IS NULL
    CREATE TABLE responsaveis (
      id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      nome       NVARCHAR(255) NOT NULL,
      email      NVARCHAR(255),
      telefone   NVARCHAR(50),
      setor      NVARCHAR(255),
      created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `)

  await pool.request().query(`
    IF OBJECT_ID('setores', 'U') IS NULL
    CREATE TABLE setores (
      id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      nome       NVARCHAR(255) NOT NULL,
      descricao  NVARCHAR(500),
      created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `)

  await pool.request().query(`
    IF OBJECT_ID('marcas', 'U') IS NULL
    CREATE TABLE marcas (
      id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      nome       NVARCHAR(255) NOT NULL,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `)

  await pool.request().query(`
    IF OBJECT_ID('analistas', 'U') IS NULL
    CREATE TABLE analistas (
      id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      nome       NVARCHAR(255) NOT NULL,
      email      NVARCHAR(255),
      created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `)

  await pool.request().query(`
    IF OBJECT_ID('periodos_manutencao', 'U') IS NULL
    CREATE TABLE periodos_manutencao (
      id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      tipo       NVARCHAR(100) NOT NULL,
      dias       INT           NOT NULL,
      created_at DATETIME2     NOT NULL DEFAULT GETDATE()
    )
  `)

  await pool.request().query(`
    IF OBJECT_ID('ativos', 'U') IS NULL
    CREATE TABLE ativos (
      id               UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      name             NVARCHAR(255) NOT NULL,
      category         NVARCHAR(255),
      status           NVARCHAR(100),
      serial_number    NVARCHAR(255),
      brand            NVARCHAR(255),
      model            NVARCHAR(255),
      department       NVARCHAR(255),
      assigned_to      NVARCHAR(255),
      memory           NVARCHAR(100),
      storage          NVARCHAR(100),
      purchase_date    DATE,
      warranty_expiry  DATE,
      location         NVARCHAR(255),
      notes            NVARCHAR(MAX),
      created_at       DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at       DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `)

  await pool.request().query(`
    IF OBJECT_ID('manutencoes', 'U') IS NULL
    CREATE TABLE manutencoes (
      id           UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      ativo_id     UNIQUEIDENTIFIER NOT NULL,
      type         NVARCHAR(100),
      description  NVARCHAR(MAX),
      analyst      NVARCHAR(255),
      date         DATE,
      cost         DECIMAL(10,2),
      status       NVARCHAR(100),
      resolution   NVARCHAR(MAX),
      upgrade_from NVARCHAR(255),
      upgrade_to   NVARCHAR(255),
      created_at   DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT FK_manutencoes_ativos FOREIGN KEY (ativo_id)
        REFERENCES ativos(id) ON DELETE CASCADE
    )
  `)

  // ─── View proximas_manutencoes ────────────────────────────────────────────

  await pool.request().query(`
    IF OBJECT_ID('proximas_manutencoes', 'V') IS NOT NULL
      DROP VIEW proximas_manutencoes
  `)

  await pool.request().query(`
    CREATE VIEW proximas_manutencoes AS
    SELECT
      a.id           AS ativo_id,
      a.name         AS ativo_nome,
      a.category     AS ativo_categoria,
      p.id           AS periodo_id,
      p.tipo         AS periodo_tipo,
      p.dias,
      lm.ultima_data,
      DATEADD(day, p.dias, lm.ultima_data) AS proxima_prevista,
      CASE
        WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), DATEADD(day, p.dias, lm.ultima_data)) < 0  THEN 'atrasado'
        WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), DATEADD(day, p.dias, lm.ultima_data)) <= 7 THEN 'urgente'
        WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), DATEADD(day, p.dias, lm.ultima_data)) <= 30 THEN 'proximo'
        ELSE 'ok'
      END AS status,
      DATEDIFF(day, CAST(GETDATE() AS DATE), DATEADD(day, p.dias, lm.ultima_data)) AS dias_restantes
    FROM ativos a
    CROSS JOIN periodos_manutencao p
    INNER JOIN (
      SELECT ativo_id, type, MAX(date) AS ultima_data
      FROM manutencoes
      WHERE date IS NOT NULL
      GROUP BY ativo_id, type
    ) lm ON lm.ativo_id = a.id AND lm.type = p.tipo
  `)

  // ─── Migrações de colunas (idempotentes) ─────────────────────────────────

  const addCol = (table, col, type) => pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${col}'
    ) ALTER TABLE ${table} ADD ${col} ${type}
  `)

  await addCol('setores',   'responsavel', 'NVARCHAR(255)')
  await addCol('setores',   'ramal',       'NVARCHAR(50)')
  await addCol('analistas', 'matricula',   'NVARCHAR(100)')
  await addCol('marcas',    'segmento',    'NVARCHAR(100)')
  await addCol('marcas',    'site',        'NVARCHAR(255)')
  await addCol('marcas',    'observacoes', 'NVARCHAR(MAX)')

  // ─── Seed inicial ─────────────────────────────────────────────────────────

  await seedIfEmpty(pool)
}

async function seedIfEmpty(pool) {
  const { recordset: [{ total }] } = await pool.request()
    .query('SELECT COUNT(*) AS total FROM situacoes')

  if (total === 0) {
    const situacoes = [
      { nome: 'Ativo',           descricao: 'Em uso normal',              cor: '#22c55e' },
      { nome: 'Inativo',         descricao: 'Fora de uso',                cor: '#94a3b8' },
      { nome: 'Em manutenção',   descricao: 'Aguardando ou em reparo',    cor: '#f59e0b' },
      { nome: 'Descartado',      descricao: 'Equipamento descartado',     cor: '#ef4444' },
      { nome: 'Aguardando peça', descricao: 'Aguardando peça de reposição', cor: '#f97316' },
    ]
    for (const s of situacoes) {
      await pool.request()
        .input('id',       sql.UniqueIdentifier, uuidv4())
        .input('nome',     sql.NVarChar,         s.nome)
        .input('descricao',sql.NVarChar,         s.descricao)
        .input('cor',      sql.NVarChar,         s.cor)
        .query('INSERT INTO situacoes (id, nome, descricao, cor) VALUES (@id, @nome, @descricao, @cor)')
    }
  }

  const { recordset: [{ total: totalCat }] } = await pool.request()
    .query('SELECT COUNT(*) AS total FROM categorias')

  if (totalCat === 0) {
    const categorias = [
      { label: 'Computador',      icon: 'Monitor',    color: '#3b82f6', descricao: 'Desktop / All-in-One' },
      { label: 'Notebook',        icon: 'Laptop',     color: '#8b5cf6', descricao: 'Laptops e ultrabooks' },
      { label: 'Monitor',         icon: 'Monitor',    color: '#06b6d4', descricao: 'Monitores e displays' },
      { label: 'Impressora',      icon: 'Printer',    color: '#10b981', descricao: 'Impressoras e multifuncionais' },
      { label: 'Servidor',        icon: 'Server',     color: '#f59e0b', descricao: 'Servidores físicos e virtuais' },
      { label: 'Switch/Roteador', icon: 'Network',    color: '#ef4444', descricao: 'Equipamentos de rede' },
      { label: 'Smartphone',      icon: 'Smartphone', color: '#ec4899', descricao: 'Celulares e tablets' },
      { label: 'Periférico',      icon: 'Mouse',      color: '#64748b', descricao: 'Teclado, mouse, headset etc.' },
    ]
    for (const c of categorias) {
      await pool.request()
        .input('id',      sql.UniqueIdentifier, uuidv4())
        .input('label',   sql.NVarChar,         c.label)
        .input('icon',    sql.NVarChar,         c.icon)
        .input('color',   sql.NVarChar,         c.color)
        .input('descricao', sql.NVarChar,       c.descricao)
        .query('INSERT INTO categorias (id, label, icon, color, descricao) VALUES (@id, @label, @icon, @color, @descricao)')
    }
  }

  // Cria admin padrão se não houver nenhum usuário
  const { recordset: [{ totalU }] } = await pool.request()
    .query('SELECT COUNT(*) AS totalU FROM usuarios')

  if (totalU === 0) {
    const hash = await bcrypt.hash('admin123', 12)
    await pool.request()
      .input('id',       sql.UniqueIdentifier, uuidv4())
      .input('email',    sql.NVarChar,         'admin@inventario.local')
      .input('hash',     sql.NVarChar,         hash)
      .input('fullName', sql.NVarChar,         'Administrador')
      .input('role',     sql.NVarChar,         'admin')
      .query(`
        INSERT INTO usuarios (id, email, senha_hash, full_name, role)
        VALUES (@id, @email, @hash, @fullName, @role)
      `)
    console.log('Usuário admin criado: admin@inventario.local / admin123')
  }
}

module.exports = { initDb }
