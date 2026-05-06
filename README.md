# Trabalho Final - Production Line Tracker

Esta pratica faz parte do modulo **Gerenciamento Avancado de Containers**.

O projeto escolhido foi o tema **Production Line Tracker**, para rastrear eventos de uma linha de producao industrial.

A proposta e subir uma API, um banco PostgreSQL e um simulador de eventos usando Docker Compose.

## 1. Arquivos do projeto

production-line-tracker/
+-- docker-compose.yml
+-- docker-compose.bad-healthcheck.yml
+-- README.md
+-- api/
|   +-- Dockerfile
|   +-- package.json
|   +-- src/
|       +-- server.js
+-- db/
|   +-- init/
|       +-- 001_schema.sql
+-- simulator/
|   +-- Dockerfile
|   +-- send-events.sh
+-- scripts/
    +-- reset.sh

## 2. Objetivos da pratica

- subir uma stack com `docker compose`;
- usar uma API e um banco em containers separados;
- usar rede publica e rede privada;
- usar volume para persistir dados do PostgreSQL;
- consultar logs com `docker compose logs`;
- configurar rotacao de logs;
- verificar healthcheck dos containers;
- usar `docker inspect` para gerar evidencias;
- verificar limites de CPU e memoria;
- simular e corrigir um healthcheck incorreto.

## 3. Arquitetura

simulator -> api -> db(postgres)

Servicos:

- `api`: recebe eventos da linha de producao.
- `postgres`: grava os eventos.
- `simulator`: envia eventos automaticamente para a API.

## 4. Subindo a stack

Execute:

bash
docker compose up -d --build

Verifique os containers:

bash
docker compose ps

Servicos:

- `plt_api`
- `plt_postgres`
- `plt_simulator`

## 5. Testando a API

Healthcheck:

bash
curl http://localhost:3000/health

Resultado esperado:

json
{"status":"healthy"}

Consultar eventos:

bash
curl http://localhost:3000/api/events


Consultar resumo:

bash
curl http://localhost:3000/api/monitor


Enviar evento manual:

bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "source": "HELLER",
    "lineId": "LINE-01",
    "ovenId": "HELLER-OVEN-01",
    "eventType": "TEMPERATURE_READING",
    "status": "INFO",
    "temperatureC": 185.7,
    "description": "Leitura manual para teste",
    "occurredAt": "2026-05-06T12:00:00Z"
  }'




## 6. Simulador de eventos

O servico `simulator` envia um evento para a API a cada 5 segundos.

Ver logs:

bash
docker compose logs -f simulator


Parar:

bash
docker compose stop simulator


Subir novamente:

bash
docker compose up -d simulator

## 7. Consultando logs

Logs da API:

bash
docker compose logs api

Ultimas 20 linhas:

bash
docker compose logs --tail=20 api

Logs com timestamp:

bash
docker compose logs --timestamps api

Acompanhar em tempo real:

bash
docker compose logs -f api

Filtrar eventos salvos no Linux/WSL:

bash
docker compose logs api | grep event_saved

Filtrar eventos salvos no PowerShell:

powershell
docker compose logs api | Select-String "event_saved"

## 8. Inspecionando logging driver

Ver configuracao de log da API:

bash
docker inspect plt_api --format '{{json .HostConfig.LogConfig}}'


Resultado esperado:

json
{"Type":"json-file","Config":{"max-file":"3","max-size":"1m"}}


Ver configuracao de log do simulador:

bash
docker inspect plt_simulator --format '{{json .HostConfig.LogConfig}}'




## 9. Consultando o banco

Contar eventos:

bash
docker exec -it plt_postgres psql -U tracker_user -d production_tracker -c "select count(*) from production_events;"


Ultimos eventos:

bash
docker exec -it plt_postgres psql -U tracker_user -d production_tracker -c "select source, line_id, oven_id, event_type, status, temperature_c, occurred_at from production_events order by occurred_at desc limit 5;"




## 10. Redes e volumes

Listar redes:

bash
docker network ls


Inspecionar redes do projeto:

bash
docker network inspect production-line-tracker_public_net
docker network inspect production-line-tracker_private_net


Listar volumes:

bash
docker volume ls


Inspecionar volume do PostgreSQL:

bash
docker volume inspect production-line-tracker_postgres_data




## 11. Healthcheck

Healthcheck da API:

bash
docker inspect plt_api --format '{{json .State.Health}}'


Healthcheck do PostgreSQL:

bash
docker inspect plt_postgres --format '{{json .State.Health}}'




## 12. Limites e seguranca

Ver limites e opcoes de seguranca da API:

bash
docker inspect plt_api --format 'ReadonlyRootfs={{.HostConfig.ReadonlyRootfs}} PidsLimit={{.HostConfig.PidsLimit}} Memory={{.HostConfig.Memory}} CapDrop={{.HostConfig.CapDrop}} SecurityOpt={{.HostConfig.SecurityOpt}}'


Ver usuario configurado:

bash
docker inspect plt_api --format 'User={{.Config.User}}'
docker inspect plt_simulator --format 'User={{.Config.User}}'


Ver uso de recursos:

bash
docker stats plt_api plt_postgres plt_simulator

## 13. Cenario de falha - Healthcheck errado

Suba a API com healthcheck errado:

bash
docker compose -f docker-compose.yml -f docker-compose.bad-healthcheck.yml up -d --force-recreate api

Aguarde alguns segundos e verifique:

bash
docker compose ps

A API devera aparecer como `unhealthy`.

Investigue:

bash
docker inspect plt_api --format '{{json .State.Health}}'
docker compose logs --tail=20 api

### Causa esperada

O healthcheck esta tentando acessar a porta `3999`, mas a API responde na porta `3000`.

### Correcao

Voltar para o Compose principal:

bash
docker compose up -d --force-recreate api

Validar:

bash
docker compose ps
curl http://localhost:3000/health

## 14. Reset do ambiente

Derrubar sem apagar o volume:

bash
docker compose down

Derrubar apagando o volume:

bash
docker compose down -v --remove-orphans

Subir novamente:

bash
docker compose up -d --build

