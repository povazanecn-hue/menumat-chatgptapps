## Stav: 2026-02-23
**Posledná session:** Claude Code

### Hotovo
- [x] Repo vytvorený: menumat-chatgptapps
- [x] MCP server s 6 tools (daily-menu, dishes, recipes, shopping-list, templates, ingredients)
- [x] Cloudflare Workers deploy config (wrangler.toml)
- [x] Bearer token auth (voliteľné, cez MCP_AUTH_TOKEN secret)
- [x] Health check endpoint `/health`

### Ďalší krok
→ Pripojiť do ChatGPT: Settings → Connectors → Add MCP → URL nižšie
→ Otestovať tools v ChatGPT konverzácii
→ Nastaviť `wrangler secret put MCP_AUTH_TOKEN` (voliteľné, pre auth)

### Live URL
https://menumat-chatgptapps.povazanecn.workers.dev/mcp

### Dôležité kontexty
- Frontend hook žije v `menumat-ecb44ba0/src/hooks/useMCPBridge.ts`
- APP_URL je v wrangler.toml (vars), nie v .env
- Package manager: npm (nie bun — bun je len pre frontend Lovable repo)
