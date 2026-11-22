# mcp-webhook-runner

Trigger and health-check your n8n webhooks directly from Claude Code, Cursor, Windsurf, or Antigravity.

## Quick Setup (Zero `npm install` Required)
Add to your MCP config (`claude_desktop_config.json` or `.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "n8n-webhooks": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mcp-webhook-runner/index.mjs"],
      "env": {
        "N8N_BASE_URL": "https://your-n8n-instance.com",
        "N8N_WEBHOOK_SECRET": "optional-secret"
      }
    }
  }
}
```
