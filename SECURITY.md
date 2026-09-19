# Security Policy

## Reporting a vulnerability

Please report security issues privately via GitHub Security Advisories
("Report a vulnerability" on the repository's **Security** tab), or by opening a
minimal issue that does **not** disclose exploit details and asking a maintainer
for a private channel.

Please do not open public issues describing exploitable vulnerabilities.

## What to expect

- Acknowledgement of your report.
- An assessment and, where applicable, a fix and coordinated disclosure.

## Hardening in this project

- Strict Content-Security-Policy and standard security headers (`next.config.ts`).
- Rate limiting and input validation on API routes.
- No third-party account mutation; playlist export requires explicit confirmation.
- Dependency updates are automated via Dependabot and gated by CI.
