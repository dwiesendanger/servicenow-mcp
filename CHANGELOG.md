# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] – 2026-03-12

### Changed

- **Architecture:** Refactored monolithic `index.ts` into modular structure with dedicated tool handlers, shared client, and validation/redaction modules
- **Testing:** Added 31 unit tests (validation + redaction) via Vitest
- **CI:** Added GitHub Actions workflow for automated build & test on Node 18/20/22
- **Security:** Added `SECURITY.md` with credential handling guidance
- **Packaging:** Added `.npmignore` to exclude source/tests from published package

## [1.0.0] – 2026-03-12

### Added

- **Incident Management Tools:**
  - `get_incident` – Retrieve incident details by number
  - `search_incidents` – Search with filters (state, priority, assignment group, etc.)
  - `create_incident` – Create new incidents
  - `update_incident` – Update existing incident fields
  - `add_comment` – Add work notes or customer-visible comments
  - `resolve_incident` – Resolve incidents with notes and resolution codes

- **Security & Safety:**
  - PII redaction enabled by default (emails, phone numbers, IPs, SSNs)
  - Read-only mode via `SERVICENOW_ALLOW_WRITE=false`
  - Input validation for all ticket numbers and required fields

- **Developer Experience:**
  - Human-readable field labels for state, priority, impact, and urgency
  - Structured Markdown output for LLM consumption
  - Detailed Axios error messages with HTTP status codes
  - Comprehensive README with setup instructions

- **Project Infrastructure:**
  - TypeScript with strict compilation
  - MIT License
  - `.env.example` for easy configuration
  - npm publish-ready `package.json` with `files` whitelist
