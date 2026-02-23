# menumat-chatgptapps

**Typ:** MCP server / ChatGPT Apps integrácia
**Produkt:** MENUMAT — restaurant management app
**Deploy:** Cloudflare Workers
**Frontend repo:** github.com/povazanecn-hue/menumat-ecb44ba0
**Live app:** https://menumaestro.lovable.app

## Čo tento repo robí

Definuje MCP tools pre ChatGPT. Každý tool otvára konkrétnu stránku
MENUMAT app v iframe priamo vnútri ChatGPT konverzácie.

## Tools

| Tool | Stránka v app |
|------|---------------|
| `show_daily_menu` | `/daily-menu` |
| `show_dishes` | `/dishes` |
| `show_recipes` | `/recipes` |
| `show_shopping_list` | `/shopping-list` |
| `show_templates` | `/templates` |
| `show_ingredients` | `/ingredients` |

## Tech stack

- TypeScript strict
- `@modelcontextprotocol/sdk`
- Cloudflare Workers (Streamable HTTP transport)
- Wrangler CLI

## Lokálne spustenie

```bash
npm install
wrangler dev
# MCP server beží na http://localhost:8787/mcp
```

## Deploy

```bash
wrangler deploy
# Nastaviť secret: wrangler secret put MCP_AUTH_TOKEN
```

## Pripojenie do ChatGPT

ChatGPT Settings → Connectors → Add MCP server → URL Workers endpointu
