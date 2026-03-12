/**
 * Tool handler for adding a comment or work note to a ServiceNow incident.
 */
import { ServiceNowClient } from "../servicenow-client.js";
import { requireNonEmptyString, validateTicketNumber } from "../validation.js";

/**
 * Handles the add_comment tool call.
 *
 * @param oClient - The ServiceNow API client
 * @param oArgs - The comment arguments
 * @returns MCP tool response with confirmation
 */
export async function handleAddComment(oClient: ServiceNowClient, oArgs: Record<string, unknown>) {
    const sTicketNumber = validateTicketNumber(oArgs.ticket_number);
    const sComment = requireNonEmptyString(oArgs.comment, "comment");

    const bWorkNote = oArgs.is_work_note !== false;

    const oIncident = await oClient.getIncidentByNumber(sTicketNumber);
    if (!oIncident) {
        return {
            content: [{ type: "text", text: `No incident found with number ${sTicketNumber}.` }],
        };
    }

    const sSysId = oIncident.sys_id;
    const oData: Record<string, string> = bWorkNote ? { work_notes: sComment } : { comments: sComment };

    await oClient.updateIncident(sSysId, oData);

    const sType = bWorkNote ? "work note" : "comment";
    const sText = `✅ ${sType.charAt(0).toUpperCase() + sType.slice(1)} added to incident ${sTicketNumber} successfully.`;

    return { content: [{ type: "text", text: sText }] };
}
