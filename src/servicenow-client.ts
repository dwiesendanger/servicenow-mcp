/**
 * Reusable ServiceNow REST API client.
 * Encapsulates authentication, base URL handling, and common API operations.
 */
import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import type { ServiceNowApiResponse, ServiceNowIncident } from "./types.js";

/** Default request timeout in milliseconds (30 seconds). */
const I_DEFAULT_TIMEOUT_MS = 30_000;

/** Maximum number of retry attempts for transient failures. */
const I_MAX_RETRIES = 2;

/** HTTP status codes that are safe to retry. */
const A_RETRYABLE_STATUS_CODES = [408, 429, 502, 503, 504];

/** Fields returned for single-incident lookups. */
const S_DETAIL_FIELDS = [
    "sys_id", "number", "short_description", "description", "state",
    "priority", "urgency", "impact", "assigned_to", "caller_id",
    "category", "subcategory", "assignment_group", "opened_at",
    "closed_at", "resolved_at", "close_code", "close_notes",
    "sys_created_on", "sys_updated_on", "work_notes", "comments",
].join(",");

/** Fields returned for list / search queries (lighter payload). */
const S_LIST_FIELDS = [
    "sys_id", "number", "short_description", "state",
    "priority", "assigned_to", "assignment_group", "opened_at",
].join(",");

export class ServiceNowClient {
    private readonly httpClient: AxiosInstance;

    constructor(instanceUrl: string, username: string, password: string) {
        // Remove trailing slash from instance URL if present
        const sBaseUrl = instanceUrl.replace(/\/+$/, "");

        this.httpClient = axios.create({
            baseURL: `${sBaseUrl}/api/now`,
            timeout: I_DEFAULT_TIMEOUT_MS,
            auth: { username, password },
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        });

        // Intercept responses to detect hibernating instances and non-JSON replies
        this.httpClient.interceptors.response.use(
            (oResponse: AxiosResponse) => {
                this._checkForHtmlResponse(oResponse);
                return oResponse;
            },
            (oError: unknown) => {
                // Also check error responses (e.g. redirects to hibernation page)
                if (axios.isAxiosError(oError) && oError.response) {
                    this._checkForHtmlResponse(oError.response);
                }
                throw oError;
            }
        );
    }

    /**
     * Checks an Axios response for unexpected HTML content instead of JSON.
     * Throws a descriptive error if HTML is detected, which typically indicates
     * the instance is unavailable, requires authentication via browser, or the URL is wrong.
     *
     * @param oResponse - The Axios response to inspect
     */
    private _checkForHtmlResponse(oResponse: AxiosResponse): void {
        const sContentType = oResponse.headers?.["content-type"] || "";
        if (sContentType.includes("text/html")) {
            throw new Error(
                "Unexpected HTML response from ServiceNow API. " +
                "The instance may be unavailable, the URL may be incorrect, " +
                "or the credentials may be invalid."
            );
        }
    }

    /**
     * Creates a ServiceNowClient from environment variables.
     * Throws if required environment variables are missing.
     *
     * @returns A configured ServiceNowClient instance
     */
    static fromEnvironment(): ServiceNowClient {
        const sUrl = process.env.SERVICENOW_INSTANCE_URL;
        const sUser = process.env.SERVICENOW_USERNAME;
        const sPass = process.env.SERVICENOW_PASSWORD;

        if (!sUrl || !sUser || !sPass) {
            throw new Error(
                "Missing ServiceNow credentials. Please ensure SERVICENOW_INSTANCE_URL, " +
                "SERVICENOW_USERNAME, and SERVICENOW_PASSWORD are set in your .env file."
            );
        }

        return new ServiceNowClient(sUrl, sUser, sPass);
    }

    /**
     * Executes an HTTP request with automatic retry for transient failures.
     *
     * @param fnRequest - A function that returns the Axios promise to execute
     * @returns The Axios response
     */
    private async _executeWithRetry<T>(fnRequest: () => Promise<AxiosResponse<T>>): Promise<AxiosResponse<T>> {
        let oLastError: unknown;
        for (let iAttempt = 0; iAttempt <= I_MAX_RETRIES; iAttempt++) {
            try {
                return await fnRequest();
            } catch (oError: unknown) {
                oLastError = oError;
                const bRetryable =
                    axios.isAxiosError(oError) &&
                    oError.response != null &&
                    A_RETRYABLE_STATUS_CODES.includes(oError.response.status);

                if (!bRetryable || iAttempt === I_MAX_RETRIES) {
                    throw oError;
                }
                // Exponential back-off: 500ms, 1500ms
                await new Promise((resolve) => setTimeout(resolve, 500 * (iAttempt + 1)));
            }
        }
        throw oLastError;
    }

    /**
     * Fetches a single incident by its number (e.g. INC0000001).
     *
     * @param sNumber - The incident number
     * @returns The incident record or null if not found
     */
    async getIncidentByNumber(sNumber: string): Promise<ServiceNowIncident | null> {
        const oResponse = await this._executeWithRetry(() =>
            this.httpClient.get<ServiceNowApiResponse<ServiceNowIncident>>(
                "/table/incident",
                {
                    params: {
                        sysparm_query: `number=${sNumber}`,
                        sysparm_display_value: "true",
                        sysparm_fields: S_DETAIL_FIELDS,
                        sysparm_limit: 1,
                    },
                }
            )
        );

        const aResults = oResponse.data.result;
        return aResults.length > 0 ? aResults[0] : null;
    }

    /**
     * Searches incidents based on a ServiceNow encoded query string.
     *
     * @param sQuery - ServiceNow encoded query (e.g. "state=1^priority=1")
     * @param iLimit - Maximum number of results to return (default: 10)
     * @returns Array of matching incident records
     */
    async searchIncidents(sQuery: string, iLimit: number = 10): Promise<ServiceNowIncident[]> {
        const oResponse = await this._executeWithRetry(() =>
            this.httpClient.get<ServiceNowApiResponse<ServiceNowIncident>>(
                "/table/incident",
                {
                    params: {
                        sysparm_query: sQuery,
                        sysparm_display_value: "true",
                        sysparm_fields: S_LIST_FIELDS,
                        sysparm_limit: iLimit,
                    },
                }
            )
        );

        return oResponse.data.result;
    }

    /**
     * Creates a new incident with the provided fields.
     *
     * @param oData - Partial incident data for creation
     * @returns The created incident record
     */
    async createIncident(oData: Partial<ServiceNowIncident>): Promise<ServiceNowIncident> {
        const oResponse = await this._executeWithRetry(() =>
            this.httpClient.post(
                "/table/incident",
                oData,
                {
                    params: {
                        sysparm_display_value: "true",
                        sysparm_fields: S_DETAIL_FIELDS,
                    },
                }
            )
        );

        const oResult = oResponse.data?.result ?? oResponse.data;
        if (!oResult || typeof oResult !== "object") {
            throw new Error(
                `Unexpected create response structure: ${JSON.stringify(oResponse.data).substring(0, 200)}`
            );
        }
        return oResult as ServiceNowIncident;
    }

    /**
     * Updates an existing incident identified by sys_id.
     *
     * @param sSysId - The sys_id of the incident to update
     * @param oData - Partial incident data to update
     * @returns The updated incident record
     */
    async updateIncident(sSysId: string, oData: Partial<ServiceNowIncident>): Promise<ServiceNowIncident> {
        const oResponse = await this._executeWithRetry(() =>
            this.httpClient.patch(
                `/table/incident/${sSysId}`,
                oData,
                {
                    params: {
                        sysparm_display_value: "true",
                        sysparm_fields: S_DETAIL_FIELDS,
                    },
                }
            )
        );

        const oResult = oResponse.data?.result ?? oResponse.data;
        if (!oResult || typeof oResult !== "object") {
            throw new Error(
                `Unexpected update response structure: ${JSON.stringify(oResponse.data).substring(0, 200)}`
            );
        }
        return oResult as ServiceNowIncident;
    }

    /**
     * Adds a work note or customer-visible comment to an incident.
     *
     * @param sSysId - The sys_id of the incident
     * @param sComment - The comment text
     * @param bWorkNote - If true, adds as work note; if false, as customer comment (default: true)
     * @returns The updated incident record
     */
    async addComment(sSysId: string, sComment: string, bWorkNote: boolean = true): Promise<ServiceNowIncident> {
        const oData: Record<string, string> = bWorkNote
            ? { work_notes: sComment }
            : { comments: sComment };

        return this.updateIncident(sSysId, oData as Partial<ServiceNowIncident>);
    }

    /**
     * Resolves an incident by setting the state to "Resolved" (6) with resolution notes.
     *
     * @param sSysId - The sys_id of the incident
     * @param sCloseCode - The close code (e.g. "Solved (Permanently)")
     * @param sCloseNotes - Resolution notes
     * @returns The updated incident record
     */
    async resolveIncident(
        sSysId: string,
        sCloseCode: string,
        sCloseNotes: string
    ): Promise<ServiceNowIncident> {
        return this.updateIncident(sSysId, {
            state: "6",
            close_code: sCloseCode,
            close_notes: sCloseNotes,
        } as Partial<ServiceNowIncident>);
    }
}
