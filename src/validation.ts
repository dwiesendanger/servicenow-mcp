/**
 * Shared input-validation utilities for ServiceNow MCP tool handlers.
 *
 * Centralises commonly repeated checks (ticket number format, required strings)
 * so that every tool handler behaves consistently.
 */

/** Matches ServiceNow incident numbers: INC followed by 7-10 digits. */
const R_TICKET_FORMAT = /^INC\d{7,10}$/i;

/**
 * Validates and normalises a ServiceNow incident number.
 *
 * @param sTicketNumber - The raw ticket number from the tool arguments
 * @returns The upper-cased ticket number (e.g. "INC0010001")
 * @throws Error if the format is invalid
 */
export function validateTicketNumber(sTicketNumber: unknown): string {
    if (typeof sTicketNumber !== "string" || !sTicketNumber.trim()) {
        throw new Error("ticket_number is required and must be a non-empty string.");
    }

    const sTrimmed = sTicketNumber.trim();
    if (!R_TICKET_FORMAT.test(sTrimmed)) {
        throw new Error(
            `Invalid incident number format: "${sTrimmed}". Expected format: INC followed by 7-10 digits (e.g. INC0010001).`
        );
    }

    return sTrimmed.toUpperCase();
}

/**
 * Validates that a string argument is present and non-empty.
 *
 * @param value - The raw argument value
 * @param sName - The parameter name (used in the error message)
 * @returns The trimmed string
 * @throws Error if the value is missing or blank
 */
export function requireNonEmptyString(value: unknown, sName: string): string {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${sName} is required and must be a non-empty string.`);
    }
    return value.trim();
}
