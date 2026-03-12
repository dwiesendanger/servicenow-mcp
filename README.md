# ServiceNow MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for ServiceNow incident management. It lets AI assistants like [Cline](https://github.com/cline/cline) create, read, update, and resolve incidents through a standardized tool interface.

## Features

- **get_incident** — Retrieve incident details by number
- **search_incidents** — Search with filters (state, priority, assignment group, assigned user)
- **create_incident** — Create new incidents
- **update_incident** — Update fields on existing incidents
- **add_comment** — Add work notes or customer-visible comments
- **resolve_incident** — Resolve incidents with resolution notes and codes

### Security & Safety

- **PII redaction** enabled by default — emails, phone numbers, IPs, and SSNs are masked before reaching the LLM
- **Read-only mode** via `SERVICENOW_ALLOW_WRITE=false` — disables all write operations
- **Input validation** on all ticket numbers and required fields

## Prerequisites

- **Node.js** ≥ 18
- A **ServiceNow** instance with REST API access (a [free developer instance](https://developer.servicenow.com/) works)
- Basic-auth credentials for the ServiceNow API

## Quick Start

### Install from npm

```bash
npx @dwiesendanger/servicenow-mcp
```

### Or clone & build from source

```bash
git clone https://github.com/dwiesendanger/servicenow-mcp.git
cd servicenow-mcp
npm install
npm run build
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `SERVICENOW_INSTANCE_URL` | ✅ | — | Your instance URL, e.g. `https://dev12345.service-now.com` |
| `SERVICENOW_USERNAME` | ✅ | — | ServiceNow user name |
| `SERVICENOW_PASSWORD` | ✅ | — | ServiceNow password |
| `SERVICENOW_ALLOW_WRITE` | — | `true` | Set to `false` to disable write operations |
| `SERVICENOW_DISABLE_REDACTION` | — | `false` | Set to `true` to disable PII redaction |

> **⚠️ Never put credentials in MCP config files.** Always use `.env` or OS-level environment variables. See [SECURITY.md](SECURITY.md) for details.

### Cline / VS Code Setup

Create a `.env` file in the project directory (see [Configuration → Environment Variables](#environment-variables) above), then add the server to your MCP settings file (`cline_mcp_settings.json`).

**Using npx (recommended):**

```jsonc
{
  "mcpServers": {
    "servicenow": {
      "command": "npx",
      "args": ["-y", "@dwiesendanger/servicenow-mcp"]
    }
  }
}
```

**Or if you built from source:**

```jsonc
{
  "mcpServers": {
    "servicenow": {
      "command": "node",
      "args": ["/absolute/path/to/servicenow-mcp/dist/index.js"]
    }
  }
}
```

> **Note:** The server uses [dotenv](https://github.com/motdotla/dotenv) to load `.env` from its working directory. If your `.env` file is in a different location, you can set the variables as OS-level environment variables or pass the `cwd` option in your MCP config.

### Claude Desktop Setup

Add to your `claude_desktop_config.json`:

```jsonc
{
  "mcpServers": {
    "servicenow": {
      "command": "npx",
      "args": ["-y", "@dwiesendanger/servicenow-mcp"]
    }
  }
}
```

## Development

```bash
npm run dev          # Run with tsx (hot-reload)
npm test             # Run tests (vitest)
npm run test:watch   # Watch mode
npm run build        # Compile TypeScript → dist/
```

## Project Structure

```
src/
├── index.ts               # Entry point, tool registration, MCP server setup
├── servicenow-client.ts   # Axios-based ServiceNow REST API client
├── redaction.ts            # PII redaction utilities
├── validation.ts           # Input validation helpers
├── types.ts                # Shared TypeScript types
├── tools/
│   ├── get-incident.ts     # get_incident handler
│   ├── search-incidents.ts # search_incidents handler
│   ├── create-incident.ts  # create_incident handler
│   ├── update-incident.ts  # update_incident handler
│   ├── add-comment.ts      # add_comment handler
│   └── resolve-incident.ts # resolve_incident handler
└── __tests__/
    ├── validation.test.ts  # Validation unit tests
    └── redaction.test.ts   # Redaction unit tests
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes with tests
4. Run `npm test` to ensure tests pass
5. Commit and push
6. Open a Pull Request

## License

[MIT](LICENSE)
