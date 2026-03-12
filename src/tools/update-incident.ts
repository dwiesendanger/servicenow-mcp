/**
 * Tool handler for updating an existing ServiceNow incident.
 */
import { ServiceNowClient } from "../servicenow-client.js";
import { IMPACT_MAP, INCIDENT_STATE_MAP, PRIORITY_MAP, URGENCY_MAP, resolveLabel } from "../types.js";
import { validateTicketNumber } from "../validation.js";

const STATE_VALUE_MAP: Record<string, string> = {
    new: "1",
    in_progress: "2",
    on_hold: "3",
    resolved: "6",
    closed: "7",
};

/**
 * Handles the update_incident tool call.
 *
 * @param oClient - The ServiceNow API client
 * @param oArgs - The update arguments
 * @returns MCP tool response with confirmation of the update
 */
export async function handleUpdateIncident(oClient: ServiceNowClient, oArgs: Record<string, unknown>) {
    const sTicketNumber = validateTicketNumber(oArgs.ticket_number);

    const oIncident = await oClient.getIncidentByNumber(sTicketNumber);
    if (!oIncident) {
        return {
            content: [{ type: "text", text: `No incident found with number ${sTicketNumber}.` }],
        };
    }

    const sSysId = oIncident.sys_id;
    const oData: Record<string, string> = {};
    const aChanges: string[] = [];

    const sState = oArgs.state as string | undefined;
    if (sState && STATE_VALUE_MAP[sState]) {
        oData.state = STATE_VALUE_MAP[sState];
        aChanges.push(`State → ${sState}`);
    }

    const sAssignedTo = oArgs.assigned_to as string | undefined;
    if (sAssignedTo) {
        oData.assigned_to = sAssignedTo;
        aChanges.push(`Assigned To → ${sAssignedTo}`);
    }

    const sShortDesc = oArgs.short_description as string | undefined;
    if (sShortDesc) {
        oData.short_description = sShortDesc;
        aChanges.push(`Short Description → ${sShortDesc}`);
    }

    const sDescription = oArgs.description as string | undefined;
    if (sDescription) {
        oData.description = sDescription;
        aChanges.push(`Description → updated`);
    }

    const sUrgency = oArgs.urgency as string | undefined;
    if (sUrgency) {
        oData.urgency = sUrgency;
        aChanges.push(`Urgency → ${resolveLabel(sUrgency, URGENCY_MAP)}`);
    }

    const sImpact = oArgs.impact as string | undefined;
    if (sImpact) {
        oData.impact = sImpact;
        aChanges.push(`Impact → ${resolveLabel(sImpact, IMPACT_MAP)}`);
    }

    const sCategory = oArgs.category as string | undefined;
    if (sCategory) {
        oData.category = sCategory;
        aChanges.push(`Category → ${sCategory}`);
    }

    const sAssignmentGroup = oArgs.assignment_group as string | undefined;
    if (sAssignmentGroup) {
        oData.assignment_group = sAssignmentGroup;
        aChanges.push(`Assignment Group → ${sAssignmentGroup}`);
    }

    if (aChanges.length === 0) {
        return {
            content: [{ type: "text", text: `No update fields provided for ${sTicketNumber}. Please specify at least one field to update.` }],
        };
    }

    const oUpdated = await oClient.updateIncident(sSysId, oData);

    if (!oUpdated) {
        throw new Error(
            "ServiceNow API returned an empty result. The update may not have been applied. " +
            "Please verify the incident and try again."
        );
    }

    const sText = [
        `✅ Incident ${oUpdated.number} updated successfully!`,
        `**Changes applied:**`,
        ...aChanges.map((s) => `  - ${s}`),
        `**Current State:** ${resolveLabel(oUpdated.state, INCIDENT_STATE_MAP)}`,
        `**Current Priority:** ${resolveLabel(oUpdated.priority, PRIORITY_MAP)}`,
    ].join("\n");

    return { content: [{ type: "text", text: sText }] };
}
