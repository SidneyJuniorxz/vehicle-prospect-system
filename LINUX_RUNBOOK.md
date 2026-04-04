# Linux Runbook

## Objetivo
Subir o sistema em Linux e deixar pronto para evolucao continua com agente.

## Requisitos
- Docker Engine 24+
- Docker Compose v2

## 1) Subir stack (app + postgres)

```bash
git clone https://github.com/SidneyJuniorxz/vehicle-prospect-system.git
cd vehicle-prospect-system
docker compose up -d --build
```

Aplicacao: `http://localhost:3000`

## 2) Variaveis opcionais

Pode criar `.env` com:

```env
POSTGRES_DB=vehicle_prospect
POSTGRES_USER=postgres
POSTGRES_PASSWORD=4263
POSTGRES_PORT=5432
APP_PORT=3000
JWT_SECRET=troque-este-valor
```

## 3) Diagnostico rapido

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f db
```

## 4) Rodar em modo dev nativo Linux (sem Docker)

Quando quiser iterar scraper/dashboard com hot reload:

```bash
pnpm install
pnpm dev
pnpm tsx scripts/diagnose-dev.ts
```

## 5) Fluxo do agente (continuidade)

1. Executar `pnpm tsx scripts/diagnose-dev.ts`.
2. Validar dashboard em `/dashboard`.
3. Rodar coleta curta real.
4. Verificar card de completude e eventos de pos-processo.
5. Ajustar scraper e repetir.

## 6) MCP local recomendado

Arquivo base: `.mcp.servers.example.json`.

Uso tipico:
- filesystem: leitura/escrita do repo
- postgres: consultas diretas em `vehicle_prospect`
- playwright: debug browser/scraper
