import { describe, expect, it } from "vitest";
import { requireNonEmptyString, validateTicketNumber } from "../validation.js";

describe("validateTicketNumber", () => {
    it("accepts a valid incident number", () => {
        expect(validateTicketNumber("INC0010001")).toBe("INC0010001");
    });

    it("normalises to upper case", () => {
        expect(validateTicketNumber("inc0010001")).toBe("INC0010001");
    });

    it("accepts 10-digit incident numbers", () => {
        expect(validateTicketNumber("INC0123456789")).toBe("INC0123456789");
    });

    it("trims whitespace", () => {
        expect(validateTicketNumber("  INC0010001  ")).toBe("INC0010001");
    });

    it("rejects empty string", () => {
        expect(() => validateTicketNumber("")).toThrow("ticket_number is required");
    });

    it("rejects whitespace-only string", () => {
        expect(() => validateTicketNumber("   ")).toThrow("ticket_number is required");
    });

    it("rejects non-string values", () => {
        expect(() => validateTicketNumber(undefined)).toThrow("ticket_number is required");
        expect(() => validateTicketNumber(null)).toThrow("ticket_number is required");
        expect(() => validateTicketNumber(42)).toThrow("ticket_number is required");
    });

    it("rejects wrong prefix", () => {
        expect(() => validateTicketNumber("CHG0010001")).toThrow("Invalid incident number format");
    });

    it("rejects too few digits", () => {
        expect(() => validateTicketNumber("INC123")).toThrow("Invalid incident number format");
    });

    it("rejects too many digits (>10)", () => {
        expect(() => validateTicketNumber("INC12345678901")).toThrow("Invalid incident number format");
    });

    it("rejects letters after INC", () => {
        expect(() => validateTicketNumber("INCabcdefg")).toThrow("Invalid incident number format");
    });
});

describe("requireNonEmptyString", () => {
    it("returns trimmed value for valid strings", () => {
        expect(requireNonEmptyString("  hello  ", "field")).toBe("hello");
    });

    it("throws for empty string", () => {
        expect(() => requireNonEmptyString("", "comment")).toThrow("comment is required");
    });

    it("throws for whitespace-only string", () => {
        expect(() => requireNonEmptyString("   ", "comment")).toThrow("comment is required");
    });

    it("throws for non-string values", () => {
        expect(() => requireNonEmptyString(undefined, "field")).toThrow("field is required");
        expect(() => requireNonEmptyString(null, "field")).toThrow("field is required");
        expect(() => requireNonEmptyString(123, "field")).toThrow("field is required");
    });
});
