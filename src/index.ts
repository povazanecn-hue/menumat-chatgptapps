/**
 * MENUMAT — ChatGPT Apps MCP Server
 * Cloudflare Workers · Streamable HTTP transport
 *
 * Each tool points to a page in the Lovable app via _meta.ui.resourceUri.
 * ChatGPT opens that URL in an iframe when the tool is invoked.
 *
 * Frontend repo:  github.com/povazanecn-hue/menumat-ecb44ba0
 * Live app:       https://menumaestro.lovable.app
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const APP_URL = (env: Env) => env.APP_URL ?? "https://menumaestro.lovable.app";

// ---------------------------------------------------------------------------
// Environment bindings (defined in wrangler.toml + secrets)
// ---------------------------------------------------------------------------
interface Env {
  APP_URL?: string;
  MCP_AUTH_TOKEN?: string;
}

// ---------------------------------------------------------------------------
// MCP Server definition
// ---------------------------------------------------------------------------
function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: "menumat-chatgptapps",
    version: "1.0.0",
  });

  const base = APP_URL(env);

  // --- Daily Menu -----------------------------------------------------------
  server.tool(
    "show_daily_menu",
    "Zobraz a uprav denné menu reštaurácie pre aktuálny alebo vybraný týždeň",
    {
      day: z
        .enum(["monday", "tuesday", "wednesday", "thursday", "friday"])
        .optional()
        .describe("Deň v týždni (voliteľné, predvolené = dnešný deň)"),
    },
    {
      _meta: {
        ui: { resourceUri: `${base}/daily-menu` },
      },
    },
    async ({ day }) => ({
      content: [
        {
          type: "text" as const,
          text: day
            ? `Otváram denné menu pre ${day}.`
            : "Otváram denné menu.",
        },
      ],
    })
  );

  // --- Dishes ---------------------------------------------------------------
  server.tool(
    "show_dishes",
    "Zobraz databázu jedál reštaurácie — pridaj, uprav alebo vymaž jedlá",
    {
      search: z
        .string()
        .optional()
        .describe("Voliteľný filter — hľadaj jedlo podľa názvu"),
    },
    {
      _meta: {
        ui: { resourceUri: `${base}/dishes` },
      },
    },
    async ({ search }) => ({
      content: [
        {
          type: "text" as const,
          text: search
            ? `Otváram jedlá — hľadám: "${search}".`
            : "Otváram databázu jedál.",
        },
      ],
    })
  );

  // --- Recipes --------------------------------------------------------------
  server.tool(
    "show_recipes",
    "Zobraz recepty reštaurácie vrátane ingrediencií a postupov",
    {},
    {
      _meta: {
        ui: { resourceUri: `${base}/recipes` },
      },
    },
    async () => ({
      content: [{ type: "text" as const, text: "Otváram recepty." }],
    })
  );

  // --- Shopping List --------------------------------------------------------
  server.tool(
    "show_shopping_list",
    "Zobraz nákupný zoznam vygenerovaný z denného menu",
    {},
    {
      _meta: {
        ui: { resourceUri: `${base}/shopping-list` },
      },
    },
    async () => ({
      content: [{ type: "text" as const, text: "Otváram nákupný zoznam." }],
    })
  );

  // --- Templates ------------------------------------------------------------
  server.tool(
    "show_templates",
    "Zobraz šablóny menu pre rýchle generovanie týždenného jedálneho lístka",
    {},
    {
      _meta: {
        ui: { resourceUri: `${base}/templates` },
      },
    },
    async () => ({
      content: [{ type: "text" as const, text: "Otváram šablóny menu." }],
    })
  );

  // --- Ingredients ----------------------------------------------------------
  server.tool(
    "show_ingredients",
    "Zobraz a spravuj databázu ingrediencií a surovín",
    {},
    {
      _meta: {
        ui: { resourceUri: `${base}/ingredients` },
      },
    },
    async () => ({
      content: [{ type: "text" as const, text: "Otváram ingrediencie." }],
    })
  );

  // --- Firecrawl Browser Agent helper --------------------------------------
  server.tool(
    "firecrawl_browser_integration",
    "Pomôže pripraviť integráciu Firecrawl Browser + OpenAI Agent podľa tvojho use-case",
    {
      projectType: z
        .enum(["existing_project", "new_project", "prototype"])
        .default("existing_project")
        .describe("Či chceš integráciu do existujúceho projektu alebo staviaš niečo nové"),
      primaryGoal: z
        .string()
        .optional()
        .describe("Čo presne chceš automatizovať (scraping, testovanie UI, monitoring, ... )"),
    },
    {},
    async ({ projectType, primaryGoal }) => ({
      content: [
        {
          type: "text" as const,
          text: [
            "Super — najprv si ujasnime presný cieľ, aby som navrhol správnu integráciu Firecrawl Browser agenta.",
            `Typ projektu: ${projectType}`,
            primaryGoal ? `Primárny cieľ: ${primaryGoal}` : "Primárny cieľ: nešpecifikovaný",
            "",
            "Prosím odpovedz na tieto 4 body:",
            "1) Chceš to napojiť do existujúceho repozitára alebo vytvoriť samostatnú službu?",
            "2) Aký je konkrétny workflow (napr. login, navigácia, extrakcia dát, screenshoty, export)?",
            "3) Kde to bude bežať (Node server, Cloudflare Worker, CI pipeline)?",
            "4) Aký výstup potrebuješ (JSON, databáza, webhook, report)?",
            "",
            "Keď pošleš odpovede, pripravím presný implementačný plán + hotový kód na mieru.",
          ].join("\n"),
        },
      ],
    })
  );

  return server;
}

// ---------------------------------------------------------------------------
// Cloudflare Worker export
// ---------------------------------------------------------------------------
export class MenumatMCP extends McpAgent<Env, unknown, Record<string, never>> {
  server = createServer(this.env);

  async init() {
    // Nothing to initialise — server is stateless
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Optional bearer-token auth
    if (env.MCP_AUTH_TOKEN) {
      const auth = request.headers.get("Authorization") ?? "";
      if (auth !== `Bearer ${env.MCP_AUTH_TOKEN}`) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: "menumat-chatgptapps" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return MenumatMCP.mount("/mcp").fetch(request, env);
  },
};
