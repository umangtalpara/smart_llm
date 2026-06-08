# Architectural & Implementation Decisions

> This file is updated by the AI when instructed. Every significant decision is recorded with context, rationale, and alternatives considered.

---

## Decision Log

| ID | Date | Decision | Rationale | Status |
|----|------|----------|-----------|--------|
| ADR-001 | 2026-06-08 | Datadog Logging Integration | Implemented structured logging (JSON in production, colored text in development) and direct buffered HTTP logs intake forwarding. | Accepted |

---

## Decisions

### ADR-001: Datadog Logging Integration

**Date**: 2026-06-08  
**Status**: Accepted  
**Decider**: Antigravity (AI Coding Assistant)  
**Phase**: Phase 4 / Logging & Monitoring

#### Context

The application required a structured logging solution that integrates seamlessly with Datadog. The logs needed to capture request metadata, handled and unhandled errors, and request execution times in a standardized format to facilitate easy log analysis and system monitoring.

#### Decision

We implemented a custom, zero-dependency `DatadogLoggerService` that implements NestJS's standard `LoggerService` interface.
- In **development** mode, it outputs colored, human-readable terminal logs.
- In **production** or **staging** modes, it writes structured JSON logs to stdout/stderr.
- If `DD_API_KEY` is provided, it asynchronously forwards log payloads in batches of up to 10 logs (or every 2 seconds) directly to Datadog's HTTPS Logs Intake endpoint (`https://http-intake.logs.<DD_SITE>/api/v2/logs`) using Node.js's native `https` module to avoid performance blocks or external library dependencies.
- We also added a global `RequestLoggingMiddleware` that generates a unique `requestId` per request, attaches it to the request context, and logs sanitised request parameters and response latency.
- The global `HttpExceptionFilter` was updated to log exceptions using this logger, correlating error details with the corresponding `requestId`.

#### Alternatives Considered

1. **Winston with winston-datadog transport**: Rejected because it pulls in heavy external dependencies (`winston`, `@types/winston`, transport libraries) which can cause dependency bloat, version mismatches in serverless deployment platforms (like Vercel), and execution latency.
2. **Standard stdout/stderr logging only**: Rejected because while it works well with platforms that collect stdout (like ECS/Vercel integration), it doesn't support agentless log shipping for custom hosting setups that don't run a native Datadog agent.

#### Consequences

- **Positive**:
  - Unified structured JSON logging for NestJS bootstrap and components.
  - Zero-dependency implementation makes the app highly portable, fast, and secure.
  - Automatic request correlation using `requestId`.
  - Native agentless HTTP forwarding fallback for Serverless (Vercel) / Docker environments.
- **Negative**:
  - Requires maintaining the custom batch queueing logic, although it is simple and self-contained.
- **Neutral**:
  - Requires setting `DD_API_KEY` and other `DD_*` environment variables in `.env` for direct intake.

---

*Last updated: 2026-06-08 — Datadog Logging Integration implemented*
