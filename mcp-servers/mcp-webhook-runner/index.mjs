#!/usr/bin/env node
/**
 * MCP Server #1: n8n & Webhook Runner
 * Lets Claude Code, Cursor, or Antigravity trigger configured n8n webhooks & check endpoint health safely.
 * Env vars:
 *   N8N_BASE_URL       (e.g. https://your-n8n.example.com)
 *   N8N_WEBHOOK_SECRET (optional Bearer/header token)
 *   N8N_WORKFLOWS_JSON (optional JSON map of alias -> webhook path)
 */
import { startMcpServer } from "./mcp-stdio.mjs";

const DEFAULT_BASE = (process.env.N8N_BASE_URL || "http://127.0.0.1:5678").replace(/\/+$/, "");

function loadWorkflowMap() {
  try {
    return JSON.parse(process.env.N8N_WORKFLOWS_JSON || "{}");
  } catch {
    return {};
  }
}

function validateUrl(raw) {
  const u = new URL(raw);
  if (!["http:", "https:"].includes(u.protocol)) {
    throw new Error(`Unsupported protocol: ${u.protocol}`);
  }
  return u.toString();
}

startMcpServer({
  name: "mcp-webhook-runner",
  version: "1.0.0",
  tools: [
    {
      name: "list_configured_workflows",
      description: "List configured n8n webhook aliases and base URL.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "trigger_n8n_workflow",
      description: "POST a JSON payload to a configured n8n webhook path or alias.",
      inputSchema: {
        type: "object",
        required: ["webhookPath"],
        properties: {
          webhookPath: { type: "string", description: "Webhook path (e.g. 'vault-lead-score') or configured alias." },
          payload: { type: "object", description: "JSON payload to send." },
          testMode: { type: "boolean", description: "Use /webhook-test/ instead of /webhook/." },
        },
      },
    },
    {
      name: "check_endpoint_health",
      description: "Check HTTP status and latency of an n8n or API health endpoint.",
      inputSchema: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", description: "Full http/https URL to check." },
        },
      },
    },
  ],
  handlers: {
    async list_configured_workflows() {
      return { baseUrl: DEFAULT_BASE, aliases: loadWorkflowMap() };
    },
    async trigger_n8n_workflow({ webhookPath, payload = {}, testMode = false }) {
      const map = loadWorkflowMap();
      const resolved = String(map[webhookPath] || webhookPath).replace(/^\/+/, "");
      const prefix = testMode ? "webhook-test" : "webhook";
      const targetUrl = validateUrl(`${DEFAULT_BASE}/${prefix}/${resolved}`);
      const headers = { "Content-Type": "application/json" };
      if (process.env.N8N_WEBHOOK_SECRET) {
        headers["Authorization"] = `Bearer ${process.env.N8N_WEBHOOK_SECRET}`;
      }
      const start = Date.now();
      const res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const text = await res.text();
      return { url: targetUrl, status: res.status, ok: res.ok, latencyMs: Date.now() - start, response: text.slice(0, 4000) };
    },
    async check_endpoint_health({ url }) {
      const target = validateUrl(url);
      const start = Date.now();
      const res = await fetch(target, { method: "GET", signal: AbortSignal.timeout(10000) });
      return { url: target, status: res.status, ok: res.ok, latencyMs: Date.now() - start };
    },
  },
});
