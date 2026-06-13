#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# SQL Server entrypoint com restauração automática do banco inventario_ti.
#
# Comportamento:
#   1. Inicia o SQL Server em background.
#   2. Aguarda o servidor aceitar conexões (até 90 s).
#   3. Se o arquivo /var/opt/mssql/backup/inventario_ti.bak existir
#      E o banco inventario_ti ainda NÃO existir → restaura automaticamente.
#   4. Se o banco já existir → pula a restauração (idempotente).
#   5. Aguarda o processo do SQL Server (mantém o container vivo).
# ──────────────────────────────────────────────────────────────────────────────

set -e

mkdir -p /var/opt/mssql/backup

SQLCMD="/opt/mssql-tools18/bin/sqlcmd"
BAK="/var/opt/mssql/backup/inventario_ti.bak"
DB="inventario_ti"
PASS="${SA_PASSWORD:-Inventario@2024}"
CONN_ARGS="-S localhost -U SA -P $PASS -C -N"

# ── 1. Iniciar SQL Server ─────────────────────────────────────────────────────
echo "[db] Iniciando SQL Server..."
/opt/mssql/bin/sqlservr &
MSSQL_PID=$!

# ── 2. Aguardar prontidão ─────────────────────────────────────────────────────
echo "[db] Aguardando SQL Server ficar pronto..."
for i in $(seq 1 90); do
  if $SQLCMD $CONN_ARGS -Q "SELECT 1" > /dev/null 2>&1; then
    echo "[db] SQL Server pronto após ${i}x2 s."
    break
  fi
  sleep 2
done

# Verificação final
if ! $SQLCMD $CONN_ARGS -Q "SELECT 1" > /dev/null 2>&1; then
  echo "[db] ERRO: SQL Server não respondeu a tempo. Abortando restauração."
  wait $MSSQL_PID
  exit 1
fi

# ── 3. Verificar / Restaurar banco ───────────────────────────────────────────
DB_COUNT=$($SQLCMD $CONN_ARGS -h -1 \
  -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name='$DB'" \
  2>/dev/null | tr -d ' \r\n')

if [ "$DB_COUNT" = "0" ]; then
  if [ -f "$BAK" ]; then
    echo "[db] Banco '$DB' não encontrado. Restaurando a partir do backup..."
    $SQLCMD $CONN_ARGS -Q "
      RESTORE DATABASE [$DB]
      FROM  DISK = '$BAK'
      WITH  MOVE 'inventario_ti'     TO '/var/opt/mssql/data/${DB}.mdf',
            MOVE 'inventario_ti_log' TO '/var/opt/mssql/data/${DB}_log.ldf',
            REPLACE, RECOVERY;
    "
    echo "[db] ✓ Banco '$DB' restaurado com sucesso."
  else
    echo "[db] Arquivo de backup não encontrado em $BAK."
    echo "[db] O backend criará o schema automaticamente ao iniciar."
  fi
else
  echo "[db] Banco '$DB' já existe — restauração ignorada."
fi

# ── 4. Manter container vivo ─────────────────────────────────────────────────
wait $MSSQL_PID
