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

  // --- Firecrawl Browser cURL helper ---------------------------------------
  server.tool(
    "firecrawl_browser_curl_guide",
    "Pomocník pre Firecrawl Browser cez cURL — vyber cieľ (integrácia, úprava, nový projekt) a získaj akčný plán",
    {
      objective: z
        .enum(["integrate_existing", "modify_for_use_case", "build_new"])
        .describe("Čo chceš spraviť s Firecrawl Browser snippetom"),
      useCase: z
        .string()
        .optional()
        .describe("Konkrétny use-case (napr. scraping cenníka konkurencie, QA test flow, monitoring)"),
      language: z
        .enum(["python", "node", "bash"])
        .optional()
        .describe("Preferovaný runtime pre execute endpoint"),
    },
    async ({ objective, useCase, language }) => {
      const runtime = language ?? "python";

      const objectiveText: Record<typeof objective, string> = {
        integrate_existing:
          "Integrácia do existujúceho projektu: pridáme env konfiguráciu, reusable script a bezpečné volanie API.",
        modify_for_use_case:
          "Úprava pre špecifický use-case: navrhneme tok pre tvoje dáta, limity a robustné spracovanie session lifecycle.",
        build_new:
          "Nový mini-projekt: pripravíme čistý skeleton so session manažmentom, loggingom a rozšíriteľným workflow.",
      };

      const contextLine = useCase
        ? `Tvoj use-case: ${useCase}.`
        : "Doplň svoj use-case, aby som pripravil presný implementation plan.";

      const message = [
        "Čo presne chceš urobiť s Firecrawl Browser snippetom?",
        objectiveText[objective],
        contextLine,
        `Predvolený runtime pre execute: ${runtime}.`,
        "",
        "Bezpečný cURL základ:",
        "1) export FIRECRAWL_API_KEY='fc-...'",
        "2) SESSION=$(curl -s -X POST 'https://api.firecrawl.dev/v2/browser' -H \"Authorization: Bearer $FIRECRAWL_API_KEY\" -H 'Content-Type: application/json' | jq -r '.data.id')",
        `3) curl -X POST \"https://api.firecrawl.dev/v2/browser/$SESSION/execute\" -H \"Authorization: Bearer $FIRECRAWL_API_KEY\" -H 'Content-Type: application/json' -d '{\"code\":\"await page.goto(\\\"https://news.ycombinator.com\\\")\",\"language\":\"${runtime}\"}'`,
        "4) curl -X DELETE \"https://api.firecrawl.dev/v2/browser/$SESSION\" -H \"Authorization: Bearer $FIRECRAWL_API_KEY\"",
      ].join("\n");

      return {
        content: [{ type: "text" as const, text: message }],
      };
    }
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
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

    return MenumatMCP.mount("/mcp").fetch(request, env, ctx);
  },
};
