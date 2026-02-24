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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

const APP_URL = (env: Env) => env.APP_URL ?? "https://menumaestro.lovable.app";

// ---------------------------------------------------------------------------
// Environment bindings (defined in wrangler.toml + secrets)
// ---------------------------------------------------------------------------
interface Env {
  APP_URL?: string;
  MCP_AUTH_TOKEN?: string;
  OAUTH_CLIENT_ID?: string;
  OAUTH_CLIENT_SECRET?: string;
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
    async ({ day }) => ({
      content: [
        {
          type: "text" as const,
          text: day
            ? `Otváram denné menu pre ${day}. [${base}/daily-menu]`
            : "Otváram denné menu. [${base}/daily-menu]",
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
    async ({ search }) => ({
      content: [
        {
          type: "text" as const,
          text: search
            ? `Otváram jedlá — hľadám: "${search}". [${base}/dishes]`
            : "Otváram databázu jedál. [${base}/dishes]",
        },
      ],
    })
  );

  // --- Recipes --------------------------------------------------------------
  server.tool(
    "show_recipes",
    "Zobraz recepty reštaurácie vrátane ingrediencií a postupov",
    {},
    async () => ({
      content: [{ type: "text" as const, text: `Otváram recepty. [${base}/recipes]` }],
    })
  );

  // --- Shopping List --------------------------------------------------------
  server.tool(
    "show_shopping_list",
    "Zobraz nákupný zoznam vygenerovaný z denného menu",
    {},
    async () => ({
      content: [{ type: "text" as const, text: `Otváram nákupný zoznam. [${base}/shopping-list]` }],
    })
  );

  // --- Templates ------------------------------------------------------------
  server.tool(
    "show_templates",
    "Zobraz šablóny menu pre rýchle generovanie týždenného jedálneho lístka",
    {},
    async () => ({
      content: [{ type: "text" as const, text: `Otváram šablóny menu. [${base}/templates]` }],
    })
  );

  // --- Ingredients ----------------------------------------------------------
  server.tool(
    "show_ingredients",
    "Zobraz a spravuj databázu ingrediencií a surovín",
    {},
    async () => ({
      content: [{ type: "text" as const, text: `Otváram ingrediencie. [${base}/ingredients]` }],
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

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function handleOAuthDiscovery(origin: string): Response {
  return Response.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/oauth/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    },
    { headers: corsHeaders() }
  );
}

function handleOAuthProtectedResourceMetadata(origin: string): Response {
  return Response.json(
    {
      resource: `${origin}/mcp`,
      authorization_servers: [origin],
      bearer_methods_supported: ["header"],
    },
    { headers: corsHeaders() }
  );
}

// Authorization endpoint — auto-approves for personal server
function handleOAuthAuthorize(url: URL): Response {
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const code = crypto.randomUUID().replace(/-/g, "");

  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);

  return Response.redirect(redirect.toString(), 302);
}

async function handleOAuthToken(request: Request, env: Env): Promise<Response> {
  let clientId: string | null = null;
  let clientSecret: string | null = null;
  let grantType: string | null = null;

  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await request.formData();
    clientId = body.get("client_id") as string | null;
    clientSecret = body.get("client_secret") as string | null;
    grantType = body.get("grant_type") as string | null;
  } else {
    const body = await request.json() as Record<string, string>;
    clientId = body["client_id"] ?? null;
    clientSecret = body["client_secret"] ?? null;
    grantType = body["grant_type"] ?? null;
  }

  // Accept authorization_code (any code — personal server auto-approves)
  // or client_credentials with matching secret
  const validClientCredentials =
    grantType === "client_credentials" &&
    clientId === (env.OAUTH_CLIENT_ID ?? "menumat") &&
    clientSecret === (env.OAUTH_CLIENT_SECRET ?? env.MCP_AUTH_TOKEN);

  const validAuthCode = grantType === "authorization_code";

  if (validClientCredentials || validAuthCode) {
    return Response.json(
      {
        access_token: env.MCP_AUTH_TOKEN ?? "no-token",
        token_type: "Bearer",
        expires_in: 86400,
      },
      { headers: corsHeaders() }
    );
  }

  return Response.json(
    { error: "invalid_client" },
    { status: 401, headers: corsHeaders() }
  );
}

// ---------------------------------------------------------------------------
// Cloudflare Worker export
// ---------------------------------------------------------------------------
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = url.origin;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // OAuth discovery — RFC 8414 supports both root and path-specific variants
    if (url.pathname.startsWith("/.well-known/oauth-authorization-server")) {
      return handleOAuthDiscovery(origin);
    }

    // OAuth protected resource metadata (RFC 9728-style discovery)
    if (
      url.pathname === "/.well-known/oauth-protected-resource" ||
      url.pathname === "/.well-known/oauth-protected-resource/mcp" ||
      url.pathname === "/mcp/.well-known/oauth-protected-resource"
    ) {
      return handleOAuthProtectedResourceMetadata(origin);
    }

    // OAuth authorize endpoint (GET)
    if (url.pathname === "/oauth/authorize") {
      return handleOAuthAuthorize(url);
    }

    // OAuth token endpoint
    if (url.pathname === "/oauth/token" && request.method === "POST") {
      return await handleOAuthToken(request, env);
    }

    // Health check (no auth required)
    if (url.pathname === "/health") {
      return Response.json(
        { ok: true, service: "menumat-chatgptapps" },
        { headers: corsHeaders() }
      );
    }

    // MCP endpoint — validate Bearer token
    if (env.MCP_AUTH_TOKEN) {
      const authHeader = request.headers.get("Authorization") ?? "";
      const expectedAuth = `Bearer ${env.MCP_AUTH_TOKEN}`;
      if (authHeader !== expectedAuth) {
        return new Response("Unauthorized", {
          status: 401,
          headers: {
            ...corsHeaders(),
            "WWW-Authenticate": `Bearer realm="mcp", resource="${origin}/mcp", authorization_uri="${origin}/oauth/authorize"`,
          },
        });
      }
    }

    return MenumatMCP.mount("/mcp").fetch(request, env, {});
  },
};
