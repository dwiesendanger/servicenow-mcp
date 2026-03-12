import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isRedactionEnabled, redactContent, redactText } from "../redaction.js";

describe("redaction", () => {
    const sOriginalEnv = process.env.SERVICENOW_DISABLE_REDACTION;

    beforeEach(() => {
        delete process.env.SERVICENOW_DISABLE_REDACTION;
    });

    afterEach(() => {
        if (sOriginalEnv !== undefined) {
            process.env.SERVICENOW_DISABLE_REDACTION = sOriginalEnv;
        } else {
            delete process.env.SERVICENOW_DISABLE_REDACTION;
        }
    });

    describe("isRedactionEnabled", () => {
        it("returns true by default", () => {
            expect(isRedactionEnabled()).toBe(true);
        });

        it("returns false when SERVICENOW_DISABLE_REDACTION=true", () => {
            process.env.SERVICENOW_DISABLE_REDACTION = "true";
            expect(isRedactionEnabled()).toBe(false);
        });

        it("returns false when SERVICENOW_DISABLE_REDACTION=TRUE (case-insensitive)", () => {
            process.env.SERVICENOW_DISABLE_REDACTION = "TRUE";
            expect(isRedactionEnabled()).toBe(false);
        });

        it("returns true for any other value", () => {
            process.env.SERVICENOW_DISABLE_REDACTION = "false";
            expect(isRedactionEnabled()).toBe(true);
        });
    });

    describe("redactText", () => {
        it("redacts email addresses", () => {
            const sInput = "Contact john.doe@example.com for details";
            expect(redactText(sInput)).toBe("Contact [EMAIL REDACTED] for details");
        });

        it("redacts multiple emails", () => {
            const sInput = "From a@b.com to c@d.org";
            expect(redactText(sInput)).toBe("From [EMAIL REDACTED] to [EMAIL REDACTED]");
        });

        it("redacts international phone numbers", () => {
            const sInput = "Call +49 123 456 7890 please";
            expect(redactText(sInput)).toBe("Call [PHONE REDACTED] please");
        });

        it("redacts US phone format", () => {
            const sInput = "Phone: (555) 123-4567";
            expect(redactText(sInput)).toBe("Phone: [PHONE REDACTED]");
        });

        it("redacts IP addresses", () => {
            const sInput = "Server at 192.168.1.100 is down";
            expect(redactText(sInput)).toBe("Server at [IP REDACTED] is down");
        });

        it("redacts corporate IDs", () => {
            const sInput = "User I775229 reported the issue";
            expect(redactText(sInput)).toBe("User [CORP_ID REDACTED] reported the issue");
        });

        it("does not redact short numbers (avoiding false positives)", () => {
            const sInput = "Priority 1, Impact 2, Count: 42";
            expect(redactText(sInput)).toBe("Priority 1, Impact 2, Count: 42");
        });

        it("preserves incident numbers (INC followed by digits)", () => {
            // INC + 7 digits matches corporate ID pattern, but let's verify the behavior
            const sInput = "Incident INC0010001 created";
            const sResult = redactText(sInput);
            // INC0010001 has 10 chars after 'I' prefix, the corporate ID pattern matches I + 6-7 digits
            // INC0010001 = I + "NC0010001" which is not just digits, so it should NOT match corp ID
            expect(sResult).toBe("Incident INC0010001 created");
        });

        it("skips redaction when disabled", () => {
            process.env.SERVICENOW_DISABLE_REDACTION = "true";
            const sInput = "Email: test@example.com, IP: 10.0.0.1";
            expect(redactText(sInput)).toBe(sInput);
        });
    });

    describe("redactContent", () => {
        it("redacts text items in content array", () => {
            const aContent: Array<{ type: "text"; text: string }> = [
                { type: "text", text: "Contact admin@corp.com" },
                { type: "text", text: "Server 10.0.0.1" },
            ];
            const aResult = redactContent(aContent);
            expect(aResult[0].text).toBe("Contact [EMAIL REDACTED]");
            expect(aResult[1].text).toBe("Server [IP REDACTED]");
        });

        it("returns original content when redaction is disabled", () => {
            process.env.SERVICENOW_DISABLE_REDACTION = "true";
            const aContent: Array<{ type: "text"; text: string }> = [{ type: "text", text: "admin@corp.com" }];
            const aResult = redactContent(aContent);
            expect(aResult[0].text).toBe("admin@corp.com");
        });

        it("does not mutate the original array", () => {
            const aContent: Array<{ type: "text"; text: string }> = [{ type: "text", text: "test@test.com" }];
            const aResult = redactContent(aContent);
            expect(aResult).not.toBe(aContent);
            expect(aContent[0].text).toBe("test@test.com");
        });
    });
});
