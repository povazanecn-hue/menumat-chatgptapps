# MENUMAT ChatGPT Apps MCP Server

Cloudflare Workers MCP server for MENUMAT with streamable HTTP transport.

## Available MCP tools

- `show_daily_menu`
- `show_dishes`
- `show_recipes`
- `show_shopping_list`
- `show_templates`
- `show_ingredients`

## Firecrawl Browser MCP integration

If you want to use Firecrawl Browser MCP alongside this server, choose one of these paths:

1. **Integrate into existing project** – add Firecrawl MCP config and environment variables next to this server.
2. **Customize for a specific workflow** – keep only required MCP clients/IDEs and add project-specific scripts.
3. **Build a new browser automation flow** – scaffold Firecrawl Browser support and keep MENUMAT MCP as a separate service.

### 1) Install Firecrawl Browser scaffolding

```bash
npm run firecrawl:init
```

### 2) Setup MCP for selected IDEs/CLIs

```bash
npm run firecrawl:mcp
```

### 3) Optional manual MCP config

```json
{
  "mcpServers": {
    "firecrawl-mcp": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-YOUR-API-KEY"
      }
    }
  }
}
```

## Firecrawl Browser runtime notes

- Browser sessions auto-close after 2 minutes of inactivity.
- `execute.language` accepts `python`, `node`, or `bash`.
- Every session returns a `liveViewUrl` for real-time debugging.
- Code runs in a Playwright context where `page` is globally available.

Docs: https://docs.firecrawl.dev/features/browser

## Local development

```bash
npm install
npm run type-check
npm run dev
```
