/**
 * Tool handler for searching ServiceNow incidents via MCP.
 */
import { ServiceNowClient } from "../servicenow-client.js";
import { INCIDENT_STATE_MAP, PRIORITY_MAP, resolveLabel } from "../types.js";

/**
 * Strips ServiceNow encoded-query operators (^, OR, NQ, etc.) from user input
 * to prevent query injection. Also removes newlines which could break the query.
 *
 * @param sValue - Raw user-supplied value
 * @returns Sanitized value safe for use in encoded queries
 */
function sanitizeQueryValue(sValue: string): string {
    // Remove the encoded-query meta characters: ^, newlines
    return sValue.replace(/[\^\\n\\r]/g, "").trim();
}

const STATE_VALUE_MAP: Record<string, string> = {
    new: "1",
    in_progress: "2",
    on_hold: "3",
    resolved: "6",
    closed: "7",
    canceled: "8",
};

/**
 * Handles the search_incidents tool call.
 *
 * @param oClient - The ServiceNow API client
 * @param oArgs - The search filter arguments
 * @returns MCP tool response with formatted search results
 */
export async function handleSearchIncidents(oClient: ServiceNowClient, oArgs: Record<string, unknown>) {
    const aQueryParts: string[] = [];

    const sState = oArgs.state as string | undefined;
    if (sState && STATE_VALUE_MAP[sState]) {
        aQueryParts.push(`state=${STATE_VALUE_MAP[sState]}`);
    }

    const sPriority = oArgs.priority as string | undefined;
    if (sPriority) {
        aQueryParts.push(`priority=${sPriority}`);
    }

    const sAssignmentGroup = oArgs.assignment_group as string | undefined;
    if (sAssignmentGroup) {
        aQueryParts.push(`assignment_group.name=${sanitizeQueryValue(sAssignmentGroup)}`);
    }

    const sAssignedTo = oArgs.assigned_to as string | undefined;
    if (sAssignedTo) {
        aQueryParts.push(`assigned_to.name=${sanitizeQueryValue(sAssignedTo)}`);
    }

    const sQuery = oArgs.query as string | undefined;
    if (sQuery) {
        const sSafe = sanitizeQueryValue(sQuery);
        aQueryParts.push(`short_descriptionLIKE${sSafe}^ORdescriptionLIKE${sSafe}`);
    }

    const iRawLimit = typeof oArgs.limit === "number" ? oArgs.limit : 10;
    const iLimit = Math.max(1, Math.min(50, iRawLimit));

    const sEncodedQuery = aQueryParts.join("^");
    const aIncidents = await oClient.searchIncidents(sEncodedQuery, iLimit);

    if (!aIncidents || aIncidents.length === 0) {
        return {
            content: [{ type: "text", text: "No incidents found matching the specified criteria." }],
        };
    }

    const sHeader = `Found ${aIncidents.length} incident(s):\n`;
    const sBody = aIncidents
        .map((oInc, iIdx) =>
            [
                `${iIdx + 1}. **${oInc.number}**`,
                `   Short Description: ${oInc.short_description}`,
                `   State: ${resolveLabel(oInc.state, INCIDENT_STATE_MAP)}`,
                `   Priority: ${resolveLabel(oInc.priority, PRIORITY_MAP)}`,
                `   Assigned To: ${oInc.assigned_to || "Unassigned"}`,
            ].join("\n"),
        )
        .join("\n\n");

    return { content: [{ type: "text", text: sHeader + sBody }] };
}
