/**
 * Data Redaction Layer
 *
 * Filters personally identifiable information (PII) from ServiceNow responses
 * before they are returned to the LLM. This is critical for enterprise compliance
 * when using AI assistants with ticketing systems that contain employee data.
 *
 * Redaction is enabled by default and can be disabled via SERVICENOW_DISABLE_REDACTION=true.
 */

/** Pattern definitions for PII detection */
interface RedactionPattern {
    /** Human-readable name for logging */
    name: string;
    /** Regex to match sensitive data */
    pattern: RegExp;
    /** Replacement string (use $1 etc. for partial redaction) */
    replacement: string;
}

const REDACTION_PATTERNS: RedactionPattern[] = [
    {
        name: "email",
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        replacement: "[EMAIL REDACTED]",
    },
    {
        name: "phone_international",
        // Matches patterns like +49 123 456 7890, (555) 123-4567, +1-800-555-0199
        // Requires at least 7 digits total to avoid false positives on short number sequences
        pattern: /(?:\+\d{1,4}[\s.-])?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,5}/g,
        replacement: "[PHONE REDACTED]",
    },
    {
        name: "ip_address",
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        replacement: "[IP REDACTED]",
    },
    {
        name: "corporate_id",
        pattern: /\b[IiDdCc]\d{6,7}\b/g,
        replacement: "[CORP_ID REDACTED]",
    },
];

/**
 * Checks whether redaction is enabled (default: true).
 *
 * @returns true if redaction should be applied
 */
export function isRedactionEnabled(): boolean {
    return process.env.SERVICENOW_DISABLE_REDACTION?.toLowerCase() !== "true";
}

/**
 * Applies all redaction patterns to the given text.
 *
 * @param sText - The text to redact
 * @returns The redacted text
 */
export function redactText(sText: string): string {
    if (!isRedactionEnabled()) {
        return sText;
    }

    let sRedacted = sText;
    for (const oPattern of REDACTION_PATTERNS) {
        sRedacted = sRedacted.replace(oPattern.pattern, oPattern.replacement);
    }
    return sRedacted;
}

/**
 * Redacts PII from MCP tool response content arrays.
 * Only processes items with type "text".
 *
 * @param aContent - The MCP content array
 * @returns A new content array with redacted text
 */
export function redactContent(
    aContent: Array<{ type: "text"; text: string }>
): Array<{ type: "text"; text: string }> {
    if (!isRedactionEnabled()) {
        return aContent;
    }

    return aContent.map((oItem) => {
        if (oItem.type === "text") {
            return { ...oItem, text: redactText(oItem.text) };
        }
        return oItem;
    });
}
