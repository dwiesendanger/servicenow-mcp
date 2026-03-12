# Security Policy

## Data Flow

```
┌─────────┐     stdio/JSON      ┌──────────────────┐    HTTPS/Basic Auth   ┌──────────────┐
│  Cline  │ ◄─────────────────► │  MCP Server      │ ◄───────────────────► │  ServiceNow  │
│  (LLM)  │                     │  (this project)  │                       │  Instance    │
└─────────┘                     └──────────────────┘                       └──────────────┘
                                        │
                                   PII Redaction
                                   (before response)
```

1. **Cline → MCP Server**: Tool calls are sent via stdio (local process, no network).
2. **MCP Server → ServiceNow**: HTTPS requests with Basic Authentication to your ServiceNow instance.
3. **MCP Server → Cline**: Responses pass through the **PII Redaction Layer** before reaching the LLM.

## Credentials

- ServiceNow credentials are stored in a local `.env` file and **never** transmitted to the LLM.
- The `.env` file is excluded from version control via `.gitignore`.
- **Do not place credentials in the MCP config** (e.g., `cline_mcp_settings.json` or `claude_desktop_config.json`). These files may be read by the AI assistant as context, which means your passwords would be visible to the AI model. Use the `.env` file instead — it is loaded by `dotenv` at startup and stays local to the project directory.
- We recommend using a **dedicated service account** with minimal permissions rather than personal credentials.

## PII Redaction

The server includes a built-in redaction layer that filters the following patterns from all tool responses before they reach the LLM:

| Pattern | Example | Replacement |
|---------|---------|-------------|
| Email addresses | `john.doe@company.com` | `[EMAIL REDACTED]` |
| Phone numbers | `+1 555-555-0100` | `[PHONE REDACTED]` |
| IP addresses | `10.0.0.1` | `[IP REDACTED]` |
| Corporate IDs | `E012345` | `[CORP_ID REDACTED]` |

Redaction is **enabled by default**. To disable it (e.g., for local testing with synthetic data), set:
```
SERVICENOW_DISABLE_REDACTION=true
```

## Read-Only Mode

To prevent accidental modifications to production incidents, you can disable all write operations:

```
SERVICENOW_ALLOW_WRITE=false
```

In read-only mode, only `get_incident` and `search_incidents` are available. The tools `create_incident`, `update_incident`, `add_comment`, and `resolve_incident` are not registered with the MCP server.

## Recommendations for Production Use

1. **Use a dedicated ServiceNow service account** with role-based access control (RBAC).
2. **Grant minimal permissions**: Only `itil` role for incident read/write, or a custom read-only role.
3. **Enable read-only mode** unless write operations are explicitly needed.
4. **Keep redaction enabled** when connecting to instances with real employee data.
5. **Rotate credentials** regularly and monitor the service account's activity in ServiceNow audit logs.
6. **Network security**: The MCP server runs as a local process. Ensure your ServiceNow instance is reachable but consider VPN/firewall rules for additional protection.

## Reporting Vulnerabilities

If you discover a security vulnerability in this project, please open a private issue or contact me directly. Do not disclose security issues publicly until a fix is available.
