FROM mcr.microsoft.com/mssql/server:2022-latest

USER root

RUN mkdir -p /var/opt/mssql/backup && \
    chown -R mssql:mssql /var/opt/mssql/backup

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER mssql

ENTRYPOINT ["/entrypoint.sh"]
