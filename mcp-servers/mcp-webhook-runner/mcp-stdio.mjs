/**
 * Zero-dependency MCP (Model Context Protocol) Stdio JSON-RPC 2.0 Server helper.
 * Compatible with Claude Code, Cursor, Windsurf, Claude Desktop, and Antigravity.
 */
import readline from "node:readline";

export function startMcpServer({ name, version, tools, handlers }) {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

  function send(msg) {
    process.stdout.write(JSON.stringify(msg) + "\n");
  }

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let req;
    try {
      req = JSON.parse(trimmed);
    } catch {
      return;
    }

    const { id, method, params } = req;
    // Notifications have no id and require no response
    if (id === undefined || id === null) return;

    try {
      if (method === "initialize") {
        send({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: params?.protocolVersion || "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name, version },
          },
        });
        return;
      }

      if (method === "ping") {
        send({ jsonrpc: "2.0", id, result: {} });
        return;
      }

      if (method === "tools/list") {
        send({ jsonrpc: "2.0", id, result: { tools } });
        return;
      }

      if (method === "tools/call") {
        const toolName = params?.name;
        const args = params?.arguments || {};
        const handler = handlers[toolName];
        if (!handler) {
          send({
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Unknown tool: ${toolName}` },
          });
          return;
        }
        const output = await handler(args);
        send({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: typeof output === "string" ? output : JSON.stringify(output, null, 2),
              },
            ],
          },
        });
        return;
      }

      send({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
    } catch (err) {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{ type: "text", text: `Error: ${err?.message || String(err)}` }],
        },
      });
    }
  });
}
