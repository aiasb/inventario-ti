-- ============================================================
-- Restore do banco inventario_ti a partir do backup .bak
--
-- Pré-requisito: copiar inventario_ti.bak para dentro do container
--   docker cp database/inventario_ti.bak inventario-sqlserver:/var/opt/mssql/backup/
--
-- Executar via sqlcmd dentro do container:
--   docker exec inventario-sqlserver /opt/mssql-tools18/bin/sqlcmd \
--     -S localhost -U SA -P 'Inventario@2024' -C -N \
--     -i /var/opt/mssql/backup/restore.sql
-- ============================================================

-- Encerrar conexões ativas antes do restore
USE master;
GO

IF DB_ID('inventario_ti') IS NOT NULL
BEGIN
  ALTER DATABASE inventario_ti SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
END
GO

RESTORE DATABASE inventario_ti
  FROM DISK = '/var/opt/mssql/backup/inventario_ti.bak'
  WITH REPLACE, RECOVERY;
GO

ALTER DATABASE inventario_ti SET MULTI_USER;
GO

PRINT 'Restore concluído com sucesso.';
GO
