# menumat-chatgptapps — Copilot/Codex Instructions

## Čo je tento repo

MCP server pre ChatGPT Apps integráciu produktu MENUMAT.
Definuje tools ktoré ChatGPT zobrazuje používateľom — každý tool otvára
konkrétnu stránku Lovable app v iframe vnútri ChatGPT konverzácie.

**TENTO REPO ≠ FRONTEND APP.**
Nemeň tu žiadny React kód. Frontend žije v `menumat-ecb44ba0`.

## Rozlíšenie repozitárov

| Repo | Čo je | Kde beží |
|------|-------|----------|
| `menumat-ecb44ba0` | React frontend (Lovable) | menumaestro.lovable.app |
| `menumat-chatgptapps` (tento) | MCP server | Cloudflare Workers |

## Tech stack

- TypeScript strict
- `@modelcontextprotocol/sdk` — MCP server
- Cloudflare Workers — hosting (Streamable HTTP transport)
- Wrangler CLI — deploy

## Štruktúra

```
src/index.ts    ← JEDINÝ súbor — tu sú všetky tool definície
wrangler.toml   ← Workers config (APP_URL var, secrets)
```

## Pravidlá pre zmeny

- Každý tool MÁ mať `_meta.ui.resourceUri` odkazujúci na `menumaestro.lovable.app/*`
- NIKDY nekomitkuj `MCP_AUTH_TOKEN` — iba cez `wrangler secret put`
- Po zmene tools: `wrangler deploy` a otestuj v ChatGPT

## Lokálne spustenie

```bash
npm install
wrangler dev
# → http://localhost:8787/mcp
# → http://localhost:8787/health
```

## Deploy

```bash
wrangler deploy
wrangler secret put MCP_AUTH_TOKEN
```

## AI Cooperation

Vždy prečítaj `.ai-context/current-sprint.md` pred začatím práce.
Po session aktualizuj `.ai-context/current-sprint.md`.
