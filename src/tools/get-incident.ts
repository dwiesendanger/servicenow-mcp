/**
 * Tool handler for retrieving a single ServiceNow incident by its number.
 */
import { ServiceNowClient } from "../servicenow-client.js";
import { IMPACT_MAP, INCIDENT_STATE_MAP, PRIORITY_MAP, resolveLabel, URGENCY_MAP } from "../types.js";
import { validateTicketNumber } from "../validation.js";

/**
 * Handles the get_incident tool call.
 *
 * @param oClient - The ServiceNow API client
 * @param oArgs - The tool arguments
 * @returns MCP tool response with formatted incident details
 */
export async function handleGetIncident(oClient: ServiceNowClient, oArgs: Record<string, unknown>) {
    const sTicketNumber = validateTicketNumber(oArgs.ticket_number);

    const oIncident = await oClient.getIncidentByNumber(sTicketNumber);

    if (!oIncident) {
        return {
            content: [{ type: "text", text: `No incident found with number ${sTicketNumber}.` }],
        };
    }

    const sText = [
        `**Incident: ${oIncident.number}**`,
        `**Short Description:** ${oIncident.short_description}`,
        `**State:** ${resolveLabel(oIncident.state, INCIDENT_STATE_MAP)}`,
        `**Priority:** ${resolveLabel(oIncident.priority, PRIORITY_MAP)}`,
        `**Urgency:** ${resolveLabel(oIncident.urgency, URGENCY_MAP)}`,
        `**Impact:** ${resolveLabel(oIncident.impact, IMPACT_MAP)}`,
        `**Category:** ${oIncident.category || "N/A"}`,
        `**Assignment Group:** ${oIncident.assignment_group || "Unassigned"}`,
        `**Assigned To:** ${oIncident.assigned_to || "Unassigned"}`,
        `**Opened At:** ${oIncident.opened_at}`,
        `**Description:** ${oIncident.description || "No description provided"}`,
    ].join("\n");

    return { content: [{ type: "text", text: sText }] };
}
