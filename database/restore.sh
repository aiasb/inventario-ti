#!/bin/bash
# Restaura o banco inventario_ti a partir do backup
# Uso: ./database/restore.sh

set -e

BAK="$(dirname "$0")/inventario_ti.bak"

if [ ! -f "$BAK" ]; then
  echo "Erro: arquivo $BAK não encontrado."
  exit 1
fi

echo "Copiando backup para o container..."
docker cp "$BAK" inventario-sqlserver:/var/opt/mssql/backup/inventario_ti.bak

echo "Executando restore..."
docker exec inventario-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U SA -P 'Inventario@2024' -C -N \
  -Q "
    USE master;
    IF DB_ID('inventario_ti') IS NOT NULL
      ALTER DATABASE inventario_ti SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    RESTORE DATABASE inventario_ti
      FROM DISK='/var/opt/mssql/backup/inventario_ti.bak'
      WITH REPLACE, RECOVERY;
    ALTER DATABASE inventario_ti SET MULTI_USER;
    PRINT 'Restore concluido.';
  "

echo "Banco restaurado com sucesso!"
