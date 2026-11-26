# Security Policy

## Authentication & Token Handling

- Google authentication uses Firebase Auth client-side popups with the minimal `https://www.googleapis.com/auth/spreadsheets` scope.
- OAuth access tokens are cached strictly in memory and cleared on sign-out; they are never written to `localStorage`, `sessionStorage`, or cookies.
- Mutating operations on linked Google Sheets require explicit user confirmation in the UI prior to execution.
- No server-side secrets or private API keys are committed to this repository.

## Reporting a Vulnerability

If you discover a security issue, please open a private security advisory in the repository's **Security** tab rather than filing a public issue.
