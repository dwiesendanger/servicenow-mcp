/**
 * Tool handler for resolving a ServiceNow incident.
 */
import { ServiceNowClient } from "../servicenow-client.js";
import { INCIDENT_STATE_MAP, PRIORITY_MAP, resolveLabel } from "../types.js";
import { requireNonEmptyString, validateTicketNumber } from "../validation.js";

/**
 * Handles the resolve_incident tool call.
 *
 * @param oClient - The ServiceNow API client
 * @param oArgs - The resolution arguments
 * @returns MCP tool response with confirmation
 */
export async function handleResolveIncident(oClient: ServiceNowClient, oArgs: Record<string, unknown>) {
    const sTicketNumber = validateTicketNumber(oArgs.ticket_number);
    const sResolutionNotes = requireNonEmptyString(oArgs.resolution_notes, "resolution_notes");

    const oIncident = await oClient.getIncidentByNumber(sTicketNumber);
    if (!oIncident) {
        return {
            content: [{ type: "text", text: `No incident found with number ${sTicketNumber}.` }],
        };
    }

    const sSysId = oIncident.sys_id;
    const oData: Record<string, string> = {
        state: "6",
        close_notes: sResolutionNotes,
    };

    const sResolutionCode = oArgs.resolution_code as string | undefined;
    if (sResolutionCode) {
        oData.close_code = sResolutionCode;
    }

    const oUpdated = await oClient.updateIncident(sSysId, oData);

    if (!oUpdated) {
        throw new Error(
            "ServiceNow API returned an empty result. The resolution may not have been applied. " +
            "Please verify the instance is awake and accessible."
        );
    }

    const sText = [
        `✅ Incident ${oUpdated.number} resolved successfully!`,
        `**State:** ${resolveLabel(oUpdated.state, INCIDENT_STATE_MAP)}`,
        `**Priority:** ${resolveLabel(oUpdated.priority, PRIORITY_MAP)}`,
        `**Resolution Notes:** ${sResolutionNotes}`,
        sResolutionCode ? `**Resolution Code:** ${sResolutionCode}` : null,
    ].filter(Boolean).join("\n");

    return { content: [{ type: "text", text: sText }] };
}
