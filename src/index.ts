#!/usr/bin/env node
/**
 * ServiceNow MCP Server
 *
 * Provides MCP tools for interacting with ServiceNow incidents:
 * - get_incident: Retrieve incident details by number
 * - search_incidents: Search incidents with various filters
 * - create_incident: Create a new incident
 * - update_incident: Update an existing incident
 * - add_comment: Add work notes or comments
 * - resolve_incident: Resolve an incident with notes
 *
 * Security features:
 * - PII redaction enabled by default (disable via SERVICENOW_DISABLE_REDACTION=true)
 * - Read-only mode available (enable via SERVICENOW_ALLOW_WRITE=false, default: true)
 */
// Load .env from the project root BEFORE any other imports access process.env.
// We use eager, synchronous dotenv loading at the top of the entry point.
import { config as dotenvConfig } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __sFilename = fileURLToPath(import.meta.url);
const __sDirname = dirname(__sFilename);
dotenvConfig({ path: resolve(__sDirname, "..", ".env") });

// Read package version at startup so it stays in sync with package.json
const sPkgPath = resolve(__sDirname, "..", "package.json");
const { version: S_VERSION } = JSON.parse(readFileSync(sPkgPath, "utf-8"));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AxiosError } from "axios";
import { z } from "zod";
import { redactContent, redactText } from "./redaction.js";
import { ServiceNowClient } from "./servicenow-client.js";

import { handleAddComment } from "./tools/add-comment.js";
import { handleCreateIncident } from "./tools/create-incident.js";
import { handleGetIncident } from "./tools/get-incident.js";
import { handleResolveIncident } from "./tools/resolve-incident.js";
import { handleSearchIncidents } from "./tools/search-incidents.js";
import { handleUpdateIncident } from "./tools/update-incident.js";

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------
const REQUIRED_ENV_VARS = ["SERVICENOW_INSTANCE_URL", "SERVICENOW_USERNAME", "SERVICENOW_PASSWORD"] as const;

for (const sVar of REQUIRED_ENV_VARS) {
    if (!process.env[sVar]) {
        console.error(`Missing required environment variable: ${sVar}`);
        process.exit(1);
    }
}

const sInstanceUrl = process.env.SERVICENOW_INSTANCE_URL!;
const sUsername = process.env.SERVICENOW_USERNAME!;
const sPassword = process.env.SERVICENOW_PASSWORD!;

// ---------------------------------------------------------------------------
// Read-only mode – when enabled, write tools are not registered
// ---------------------------------------------------------------------------
const bAllowWrite = process.env.SERVICENOW_ALLOW_WRITE?.toLowerCase() !== "false";

// ---------------------------------------------------------------------------
// Client & Server setup
// ---------------------------------------------------------------------------
const oClient = new ServiceNowClient(sInstanceUrl, sUsername, sPassword);

const oServer = new McpServer({
    name: "servicenow",
    version: S_VERSION,
    description: "MCP server for ServiceNow incident management",
});

// ---------------------------------------------------------------------------
// Helper – wraps a tool handler with PII redaction and error handling
// ---------------------------------------------------------------------------
function wrapHandler(
    fnHandler: (client: ServiceNowClient, args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>,
) {
    return async (oArgs: Record<string, unknown>) => {
        try {
            const oResult = await fnHandler(oClient, oArgs);
            // Cast content items to literal type "text" as required by MCP SDK
            const aTypedContent = oResult.content.map((oItem) => ({
                ...oItem,
                type: "text" as const,
            }));
            return { content: redactContent(aTypedContent) };
        } catch (oError: unknown) {
            let sMessage: string;
            if (oError instanceof AxiosError) {
                const iStatus = oError.response?.status;
                const sStatusText = oError.response?.statusText ?? "";
                const sDetail = typeof oError.response?.data === "object"
                    ? JSON.stringify(oError.response.data)
                    : String(oError.response?.data ?? oError.message);
                sMessage = iStatus
                    ? `ServiceNow API error ${iStatus} ${sStatusText}: ${sDetail}`
                    : `Network error communicating with ServiceNow: ${oError.message}`;
            } else {
                sMessage = oError instanceof Error ? oError.message : String(oError);
            }
            return {
                content: [{ type: "text" as const, text: `Error: ${redactText(sMessage)}` }],
                isError: true,
            };
        }
    };
}

// ---------------------------------------------------------------------------
// Tool registration via McpServer.tool() high-level API
// ---------------------------------------------------------------------------

// -- Read tools (always available) ------------------------------------------

oServer.tool(
    "get_incident",
    "Retrieve details of a ServiceNow incident by its number",
    { ticket_number: z.string().describe("The incident number, e.g. INC0000001") },
    wrapHandler(handleGetIncident),
);

oServer.tool(
    "search_incidents",
    "Search for ServiceNow incidents with various filters",
    {
        query: z.string().optional().describe("Free-text search query"),
        state: z.string().optional().describe("Filter by incident state (e.g. 'New', 'In Progress', 'Resolved')"),
        priority: z.string().optional().describe("Filter by priority (e.g. '1', '2', '3')"),
        assignment_group: z.string().optional().describe("Filter by assignment group name"),
        assigned_to: z.string().optional().describe("Filter by assigned user name"),
        limit: z.number().optional().describe("Maximum number of results to return (default: 10)"),
    },
    wrapHandler(handleSearchIncidents),
);

// -- Write tools (only when SERVICENOW_ALLOW_WRITE !== "false") -------------

if (bAllowWrite) {
    oServer.tool(
        "create_incident",
        "Create a new ServiceNow incident",
        {
            short_description: z.string().describe("Brief summary of the incident"),
            description: z.string().optional().describe("Detailed description of the incident"),
            urgency: z.string().optional().describe("Urgency level: 1 (High), 2 (Medium), 3 (Low)"),
            impact: z.string().optional().describe("Impact level: 1 (High), 2 (Medium), 3 (Low)"),
            category: z.string().optional().describe("Incident category"),
            assignment_group: z.string().optional().describe("Assignment group name"),
            caller_id: z.string().optional().describe("Caller / affected user"),
        },
        wrapHandler(handleCreateIncident),
    );

    oServer.tool(
        "update_incident",
        "Update fields on an existing ServiceNow incident",
        {
            ticket_number: z.string().describe("The incident number, e.g. INC0000001"),
            short_description: z.string().optional().describe("Updated short description"),
            description: z.string().optional().describe("Updated description"),
            urgency: z.string().optional().describe("Updated urgency: 1 (High), 2 (Medium), 3 (Low)"),
            impact: z.string().optional().describe("Updated impact: 1 (High), 2 (Medium), 3 (Low)"),
            state: z.string().optional().describe("Updated incident state"),
            category: z.string().optional().describe("Updated category"),
            assignment_group: z.string().optional().describe("Updated assignment group"),
            assigned_to: z.string().optional().describe("Updated assigned user"),
        },
        wrapHandler(handleUpdateIncident),
    );

    oServer.tool(
        "add_comment",
        "Add a work note or comment to a ServiceNow incident",
        {
            ticket_number: z.string().describe("The incident number, e.g. INC0000001"),
            comment: z.string().describe("The comment or work note text"),
            is_work_note: z.boolean().optional().describe("If true, adds as work note instead of customer-visible comment"),
        },
        wrapHandler(handleAddComment),
    );

    oServer.tool(
        "resolve_incident",
        "Resolve a ServiceNow incident",
        {
            ticket_number: z.string().describe("The incident number, e.g. INC0000001"),
            resolution_notes: z.string().describe("Resolution notes / close notes"),
            resolution_code: z.string().optional().describe("Resolution code (e.g. 'Solved (Permanently)', 'Solved (Workaround)')"),
        },
        wrapHandler(handleResolveIncident),
    );
}

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
async function main() {
    const oTransport = new StdioServerTransport();
    await oServer.connect(oTransport);
    const sMode = bAllowWrite ? "read-write" : "read-only";
    console.error(`ServiceNow MCP Server running on stdio (${sMode} mode)`);
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(sSignal: string) {
    console.error(`Received ${sSignal}, shutting down ServiceNow MCP Server…`);
    oServer.close().finally(() => process.exit(0));
    // Force exit after 5 seconds if close() hangs
    setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main().catch((oError) => {
    console.error("Fatal error starting server:", oError);
    process.exit(1);
});
