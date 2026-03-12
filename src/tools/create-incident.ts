/**
 * Tool handler for creating a new ServiceNow incident.
 */
import { ServiceNowClient } from "../servicenow-client.js";
import { INCIDENT_STATE_MAP, PRIORITY_MAP, resolveLabel } from "../types.js";

/**
 * Handles the create_incident tool call.
 *
 * @param oClient - The ServiceNow API client
 * @param oArgs - The incident creation arguments
 * @returns MCP tool response with confirmation of the created incident
 */
export async function handleCreateIncident(oClient: ServiceNowClient, oArgs: Record<string, unknown>) {
    const sShortDesc = oArgs.short_description as string | undefined;
    if (!sShortDesc?.trim()) {
        throw new Error("short_description is required and must not be empty.");
    }

    const oData: Record<string, string> = {
        short_description: sShortDesc.trim(),
    };

    const sDescription = oArgs.description as string | undefined;
    if (sDescription) {
        oData.description = sDescription;
    }

    const sUrgency = oArgs.urgency as string | undefined;
    if (sUrgency) {
        oData.urgency = sUrgency;
    }

    const sImpact = oArgs.impact as string | undefined;
    if (sImpact) {
        oData.impact = sImpact;
    }

    const sCategory = oArgs.category as string | undefined;
    if (sCategory) {
        oData.category = sCategory;
    }

    const sAssignmentGroup = oArgs.assignment_group as string | undefined;
    if (sAssignmentGroup) {
        oData.assignment_group = sAssignmentGroup;
    }

    const sAssignedTo = oArgs.assigned_to as string | undefined;
    if (sAssignedTo) {
        oData.assigned_to = sAssignedTo;
    }

    const sCallerId = oArgs.caller_id as string | undefined;
    if (sCallerId) {
        oData.caller_id = sCallerId;
    }

    const oCreated = await oClient.createIncident(oData);

    if (!oCreated) {
        throw new Error(
            "ServiceNow API returned an empty result. The incident may not have been created. " +
            "Please verify the instance is awake and accessible."
        );
    }

    const sText = [
        `✅ Incident created successfully!`,
        `**Number:** ${oCreated.number}`,
        `**Short Description:** ${oCreated.short_description}`,
        `**State:** ${resolveLabel(oCreated.state, INCIDENT_STATE_MAP)}`,
        `**Priority:** ${resolveLabel(oCreated.priority, PRIORITY_MAP)}`,
    ].join("\n");

    return { content: [{ type: "text", text: sText }] };
}
