/**
 * TypeScript interfaces for ServiceNow entities and API responses.
 */

/**
 * Represents a ServiceNow Incident record.
 */
export interface ServiceNowIncident {
    sys_id: string;
    number: string;
    short_description: string;
    description: string;
    state: string;
    priority: string;
    urgency: string;
    impact: string;
    assigned_to: string;
    caller_id: string;
    category: string;
    subcategory: string;
    assignment_group: string;
    opened_at: string;
    closed_at: string;
    resolved_at: string;
    close_code: string;
    close_notes: string;
    sys_created_on: string;
    sys_updated_on: string;
    work_notes: string;
    comments: string;
}

/**
 * Generic ServiceNow Table API response wrapper.
 */
export interface ServiceNowApiResponse<T> {
    result: T[];
}

/**
 * Maps numeric incident state codes to human-readable labels.
 */
export const INCIDENT_STATE_MAP: Record<string, string> = {
    "1": "New",
    "2": "In Progress",
    "3": "On Hold",
    "6": "Resolved",
    "7": "Closed",
    "8": "Canceled",
};

/**
 * Maps numeric priority codes to human-readable labels.
 */
export const PRIORITY_MAP: Record<string, string> = {
    "1": "1 - Critical",
    "2": "2 - High",
    "3": "3 - Moderate",
    "4": "4 - Low",
    "5": "5 - Planning",
};

/**
 * Maps numeric urgency codes to human-readable labels.
 */
export const URGENCY_MAP: Record<string, string> = {
    "1": "1 - High",
    "2": "2 - Medium",
    "3": "3 - Low",
};

/**
 * Maps numeric impact codes to human-readable labels.
 */
export const IMPACT_MAP: Record<string, string> = {
    "1": "1 - High",
    "2": "2 - Medium",
    "3": "3 - Low",
};

/**
 * Resolves a numeric state code to its human-readable label.
 *
 * @param code - The numeric state code as string
 * @param map - The mapping object to look up
 * @returns The human-readable label or the original code if not found
 */
export function resolveLabel(code: string, map: Record<string, string>): string {
    return map[code] ?? code;
}
