# Changelog

## v3.0.0 — Better NPM

Major rewrite of the LDAP Edition into **Better NPM** with new features, branding, and UI.

### New Features

- **SSO / Trusted Header Authentication** — Auto-login via Authelia, Authentik, Keycloak using `Remote-Email`, `Remote-User`, `Remote-Name`, `Remote-Groups` headers
- **Two-Factor Authentication (2FA)** — TOTP-based 2FA with QR code setup, backup codes, regeneration, and per-user management
- **Multi-LDAP Server Failover** — Configure multiple LDAP servers with priority-based failover for high availability
- **LDAP Avatar Support** — Automatically extract and display `thumbnailPhoto` / `jpegPhoto` from LDAP with MIME type detection
- **Internationalization (i18n)** — Full English and German translations for all UI strings, extensible to more languages
- **Modern Sidebar UI** — Complete UI redesign with vertical sidebar navigation, responsive mobile overlay, and modernized dashboard
- **SSO Admin Emails** — Comma-separated list of email addresses that always receive admin role via SSO
- **SSO Logout Redirect** — Redirect users to SSO provider logout endpoint on NPM logout
- **Connection Status Badge** — Live LDAP connection status with multi-server info in Settings

### Improvements

- Branding updated to "Better NPM" across all frontend, backend, Dockerfile, and documentation
- Gravatar/external avatar dependencies removed — all avatars generated locally (initials SVG) or from LDAP
- Telemetry and external phone-home calls removed
- Version rollover logic: patch 0–99 → minor bumps, minor 0–9 → major bumps
- `camelizeKeys` bug fixed for nested LDAP config objects
- Nginx `proxy_set_header` inheritance fixed for SSO header forwarding
- Auth source tracking (`internal`, `ldap`, `sso`) shown in user list
- Docker image now published to `ghcr.io/snxrcs/better-npm`

### Documentation

- VitePress documentation site with GitHub Pages deployment
- New docs: LDAP Configuration, SSO Setup, 2FA, Multi-LDAP, Environment Variables
- GitHub Actions workflow for automatic docs deployment on push

### CI/CD

- Auto-version bump on push to main with rollover logic
- Multi-arch Docker build (amd64 + arm64) via GitHub Actions
- Automatic GitHub Release creation with changelog
- Docs deployment to GitHub Pages

---

## v2.x — LDAP Edition

Initial LDAP integration fork with three authentication modes, LDAP group mapping, user sync, connection testing, and proxy-level LDAP auth.
