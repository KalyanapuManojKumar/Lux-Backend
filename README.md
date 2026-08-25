# Growth Funnel Backend API

A production-grade, secure, and resilient Node.js & TypeScript backend service acting as the server-side control and orchestration layer between a React qualification/lead funnel (e.g. [Disability Path](https://funnel.disabilitypath.org/qualification-v30)), **Meta Conversions API (CAPI)**, and **n8n automation webhooks** (which syncs leads to **Airtable**).

---

## 1. Architecture Overview

```
                         USER / APPLICANT
                                │
                                ▼
                       React Lead Funnel
                                │
                                │ POST /api/leads
                                ▼
                  ┌───────────────────────────┐
                  │    Growth Funnel API      │
                  │                           │
                  │  • Request ID (Tracing)   │
                  │  • Rate Limiting (DDoS)   │
                  │  • Zod Validation (400)   │
                  │  • Idempotency Check      │
                  │  • Data Normalization     │
                  │  • Authoritative event_id │
                  │  • Qualification Engine   │
                  │  • Structured Pino Logger │
                  └─────────────┬─────────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
      ┌──────────────────┐              ┌──────────────────┐
      │    Meta CAPI     │              │   n8n Webhook    │
      │                  │              │                  │
      │ • SHA-256 Hashing│              │ • Business Lead  │
      │ • Raw Matching   │              │ • Attribution    │
      │ • Event Matching │              │ • X-Secret Auth  │
      │ • Bounded Retry  │              │ • Bounded Retry  │
      └──────────────────┘              └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │     Airtable     │
                                        │  (Managed CRM)   │
                                        └──────────────────┘
```

---

## 2. Core Principles & Features

- **Layered Architecture**: Clean separation between routes, controllers, validation schemas, business logic (`QualificationService`), third-party dispatch (`MetaService`, `N8nService`), and shared utilities.
- **Authoritative Deduplication**: Backend generates a single, cryptographically secure `event_id` (`evt_<timestamp>_<hex>`) used across Meta Browser Pixel, Meta Server CAPI, and n8n records.
- **Meta CAPI Compliance**:
  - SHA-256 hashing for PII (`em`, `ph`, `fn`, `ln`) after strict normalization.
  - Raw matching signals preserved without hashing (`client_ip_address`, `client_user_agent`, `fbp`, `fbc`).
  - Automatic `fbc` generation (`fb.1.<timestamp>.<fbclid>`) when `fbclid` is present.
- **Attribution Preservation**: Captures and normalizes UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`), `fbclid`, and `gclid`.
- **Qualification Engine**: Isolated, deterministic evaluation logic (age range, employment status, disability benefit status, condition duration).
- **Fault-Tolerant & Decoupled Downstream**: Dispatches Meta and n8n independently using `Promise.allSettled`. If one service fails, the other still completes, and partial delivery statuses are clearly reported.
- **Resilience & Bounded Retries**: Automatic exponential backoff with jitter for transient errors (5xx, timeouts, ECONNRESET). Permanent 4xx client/auth errors are never retried.
- **Security & Privacy**:
  - Pino structured logging with automated PII and secret redaction.
  - Request ID injection (`req_<hex>` / `X-Request-ID`) on all logs and responses.
  - Rate limiting (30 req/min per IP) on lead submissions.
  - Strict CORS origin whitelisting (`ALLOWED_ORIGINS`).
  - Webhook protection via `X-Webhook-Secret`.

---

## 3. Tech Stack

- **Runtime**: Node.js (v20+)
- **Language**: TypeScript (Strict mode, ES2022 / NodeNext)
- **Framework**: Express 5
- **Validation**: Zod 4
- **HTTP Client**: Axios with custom retry wrappers
- **Logging**: Pino & pino-http (Structured JSON with PII sanitization)
- **Testing**: Vitest & Supertest
- **Security**: express-rate-limit, cors, dotenv

---

## 4. Directory Structure

```
src/
├── config/
│   ├── env.ts              # Zod-validated environment config with fail-fast check
│   └── meta.config.ts      # Meta CAPI endpoint and constant definitions
├── controllers/
│   └── lead.controller.ts  # Thin controller handling request parsing and response
├── middleware/
│   ├── error.middleware.ts      # Centralized error handler and 404 handler
│   ├── rate-limit.middleware.ts # IP-based submission rate limiter
│   └── request-id.middleware.ts # X-Request-ID generation and propagation
├── routes/
│   ├── health.routes.ts    # GET /api/health probe
│   └── lead.routes.ts      # POST /api/leads route
├── schemas/
│   ├── lead.schema.ts      # Zod validation for inbound lead payload
│   └── meta.schema.ts      # Zod validation for Meta CAPI event payloads
├── services/
│   ├── lead.service.ts          # Core intake, deduplication & orchestration pipeline
│   ├── meta.service.ts          # Meta CAPI event builder, hashing & dispatch
│   ├── n8n.service.ts           # n8n webhook payload builder, auth & dispatch
│   └── qualification.service.ts # Deterministic qualification rules engine
├── types/
│   └── lead.ts             # TypeScript interfaces for leads, payloads, and responses
├── utils/
│   ├── attribution.ts      # UTM sanitization and fbc generation helper
│   ├── event-id.ts         # Authoritative event, lead, and request ID generator
│   ├── hashing.ts          # Meta CAPI compliant normalizers and SHA-256 hasher
│   ├── logger.ts           # Pino structured logger with PII redaction
│   └── retry.ts            # Exponential backoff retry utility
├── app.ts                  # Express application setup
└── server.ts               # Server bootstrap and graceful shutdown handlers
```

---

## 5. Getting Started

### Prerequisites
- Node.js (v20.x or higher)
- npm (v10.x or higher)

### 1. Installation
```bash
git clone <repository-url>
cd lux-backend
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP server listening port | `3000` |
| `NODE_ENV` | Runtime environment (`development`, `test`, `production`) | `development` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins | `http://localhost:3000,http://localhost:5173` |
| `META_ACCESS_TOKEN` | Meta System User Graph API access token | `EAA...` |
| `META_PIXEL_ID` | Meta Dataset / Pixel ID | `123456789012345` |
| `META_API_VERSION` | Meta Graph API version | `v20.0` |
| `META_TEST_EVENT_CODE`| Optional: Test event code from Events Manager | `TEST12345` |
| `N8N_WEBHOOK_URL` | Destination webhook URL for n8n workflow | `https://n8n.example.com/webhook/lead-ingest` |
| `N8N_WEBHOOK_SECRET` | Shared secret sent via `X-Webhook-Secret` header | `super_secret_webhook_key` |
| `REQUEST_TIMEOUT_MS` | External HTTP timeout in milliseconds | `8000` |
| `RATE_LIMIT_WINDOW_MS`| Rate limit sliding window (ms) | `60000` (1 min) |
| `RATE_LIMIT_MAX` | Max submissions per window per IP | `30` |

### 3. Running Locally
```bash
# Start in development mode with live reloading
npm run dev

# Run TypeScript typecheck
npm run typecheck

# Run test suite with Vitest
npm test

# Build production bundle
npm run build

# Start production server
npm start
```

---

## 6. API Reference

### Health Check
**Endpoint**: `GET /api/health`

#### Response (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-08-25T01:45:00.000Z",
  "service": "growth-funnel-api",
  "uptime": 124
}
```

---

### Ingest Lead Submission
**Endpoint**: `POST /api/leads`

#### Headers:
```http
Content-Type: application/json
X-Request-ID: req_optional_client_trace_id
Idempotency-Key: optional_unique_client_key
```

#### Request Payload:
```json
{
  "contact": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+15551234567"
  },
  "answers": {
    "age": 42,
    "employmentStatus": "unemployed",
    "receivingBenefits": "no",
    "conditionDuration": "12_months_or_longer",
    "underDoctorCare": "yes"
  },
  "attribution": {
    "fbclid": "IwAR1234567890abcdef",
    "utmSource": "facebook",
    "utmMedium": "paid_social",
    "utmCampaign": "disability_ssdi_v30",
    "utmContent": "video_ad_variation_1",
    "utmTerm": "disability lawyer"
  },
  "tracking": {
    "fbp": "fb.1.1724567890.987654321",
    "fbc": "fb.1.1724567890.IwAR1234567890abcdef"
  }
}
```

#### Success Response (201 Created):
```json
{
  "success": true,
  "leadId": "lead_1724567890123_a1b2c3d4e5f6",
  "eventId": "evt_1724567890123_9f8e7d6c5b4a",
  "qualification": {
    "status": "qualified",
    "reason": "Applicant meets standard preliminary qualification criteria."
  },
  "tracking": {
    "meta": "accepted",
    "automation": "accepted"
  }
}
```

#### Validation Error (400 Bad Request):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid lead data"
  },
  "requestId": "req_8b9a0c1d2e3f"
}
```

#### Rate Limit Exceeded (429 Too Many Requests):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many submissions from this IP address. Please wait a moment before trying again."
  },
  "requestId": "req_8b9a0c1d2e3f"
}
```

---

## 7. Meta CAPI Deduplication Strategy

When measuring conversions across both client-side Meta Pixel and server-side Conversions API (CAPI), duplicate counting must be prevented.

### How Deduplication Works:
1. **Authoritative Event ID**: The backend generates a unique, cryptographically secure `eventId` (e.g. `evt_1724567890_abc123`).
2. **Server-Side Dispatch**: The backend immediately fires the `Lead` event to Meta CAPI containing `event_id = "evt_1724567890_abc123"`.
3. **Response to Client**: The backend returns the `eventId` in the API response JSON.
4. **Client-Side Pixel**: The React frontend fires the browser Meta Pixel event using the **identical** `eventID`:
   ```javascript
   fbq('track', 'Lead', {
     qualification_status: response.qualification.status
   }, {
     eventID: response.eventId
   });
   ```
5. **Meta Deduplication Window**: Meta automatically identifies matching `event_name` (`"Lead"`) and `event_id` received within 48 hours, combining the browser and server signals into a single, high-fidelity conversion.

### Event Matching Signals Passed to Meta:
- `em`: Lowercase trimmed SHA-256 hash
- `ph`: Digits-only normalized E.164 SHA-256 hash
- `fn`: Lowercase punctuation-stripped SHA-256 hash
- `ln`: Lowercase punctuation-stripped SHA-256 hash
- `client_ip_address`: Raw client IP (never hashed)
- `client_user_agent`: Raw client browser user agent (never hashed)
- `fbp`: Facebook browser cookie (raw)
- `fbc`: Facebook click ID cookie (raw, or built from `fbclid`)

---

## 8. n8n Automation & Airtable Integration

The backend never connects directly to Airtable. All lead data is forwarded to an **n8n Webhook**:

```
Backend API
    │
    │ POST /webhook/lead-ingest (X-Webhook-Secret)
    ▼
n8n Workflow
    ├── Data Normalization & Formatting
    ├── Duplicate Check in Airtable
    ├── Airtable Create/Update Record
    ├── Notification Trigger (Slack / Email / CRM)
    └── Error Handling & Dead Letter Logging
```

### Why this architecture?
1. **Decoupled Automation**: Marketing and automation workflows can be modified, enriched, or routed to multiple CRMs without deploying new backend code.
2. **Security**: Airtable Personal Access Tokens (PAT) and table schemas are stored exclusively within n8n.
3. **Resilience**: n8n provides workflow execution logs, retry queues, and webhook history.

---

## 9. Failure Handling & Resilience

| Scenario | System Behavior | User Impact |
| :--- | :--- | :--- |
| **Meta CAPI 5xx / Timeout** | Retried up to 2 times with exponential backoff. If still failing, logged as error with `requestId`. Lead is still processed by n8n. | User receives `201 Created` with `tracking.meta: "failed"` and `tracking.automation: "accepted"`. |
| **n8n Webhook 5xx / Timeout** | Retried up to 2 times. If still failing, logged with structured payload for replay/recovery. | User receives `201 Created` with `tracking.automation: "failed"`. |
| **Rapid Double-Click / Retry** | Caught by in-memory idempotency cache (keyed by normalized contact hash or `Idempotency-Key`). Downstream calls are not duplicated. | User receives original `201 Created` with cached `leadId` and `eventId`. |
| **Malformed Inbound Data** | Rejected immediately with HTTP `400 VALIDATION_ERROR`. | Clear validation feedback; invalid data never touches downstream systems. |

---

## 10. Architectural Trade-offs

### 1. In-Memory Idempotency Cache vs. Redis
- **Current Approach**: In-memory sliding TTL cache (5 minutes) keyed by deterministic SHA-256 hash of normalized email + phone.
- **Trade-off**: Zero infrastructure overhead, perfect for single-instance or take-home scale.
- **Production Roadmap**: In a multi-replica containerized deployment (e.g. Kubernetes / AWS ECS), replace the in-memory map with a Redis cluster using `SET key value EX 300 NX`.

### 2. Synchronous Orchestration vs. Message Queue (RabbitMQ / SQS)
- **Current Approach**: `Promise.allSettled` with bounded 8-second timeouts and bounded retries.
- **Trade-off**: Simple, synchronous feedback loop allowing the frontend to receive the authoritative `event_id` immediately for pixel sync.
- **Production Roadmap**: For high-volume lead surges (>1,000 req/sec), introduce a background queue (BullMQ / AWS SQS) where `POST /api/leads` immediately acknowledges receipt, and background workers dispatch to Meta and n8n with persistent dead-letter queues.

---

## 11. Testing & Quality Assurance

Run the test suite:
```bash
npm test
```

### Test Coverage Highlights:
- `test/unit/hashing.test.ts`: Email, phone, and name normalization and SHA-256 hashing.
- `test/unit/qualification.test.ts`: Deterministic qualification rules for age, employment, duration, benefits.
- `test/unit/attribution.test.ts`: `fbc` generation from `fbclid`, UTM extraction.
- `test/unit/retry.test.ts`: Transient error retry logic (500/503/429/timeouts) and non-retry on 400.
- `test/unit/meta.service.test.ts`: CAPI payload formatting, hashing verification, raw matching headers.
- `test/unit/n8n.service.test.ts`: Webhook payload format and secret headers.
- `test/integration/api.test.ts`: Full HTTP endpoint tests for `GET /api/health`, `POST /api/leads`, 400 validation errors, partial downstream failure, and idempotency deduplication.
