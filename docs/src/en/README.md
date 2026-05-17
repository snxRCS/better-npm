# Better NPM

A beautiful, open-source interface for managing Nginx proxy hosts — with LDAP, SSO, 2FA, Uptime Monitor, Live Traffic, and Docker Container Selector built in.

## Features

| Feature | Description |
|---------|-------------|
| **LDAP Authentication** | OpenLDAP, Active Directory, LLDAP. Three auth modes with multi-server failover. |
| **SSO / Trusted Headers** | Authelia, Authentik, Keycloak. Auto-create users from proxy headers. |
| **Two-Factor Auth** | TOTP-based 2FA for all users. Works with Google Authenticator, Authy, etc. |
| **Uptime Monitor** | Automatic health checks every 60s. Live status badges on every proxy host and a dedicated uptime page with response times and uptime %. |
| **Live Traffic** | Real-time request stream from nginx access logs — shows host, method, path, status code, and response time. |
| **Docker Container Selector** | Pick a running container from a dropdown when adding a proxy host — auto-fills the forward hostname and port. |
| **Free SSL** | Built-in Let's Encrypt with auto-renewal. |
| **Modern UI** | Tabbed proxy host modal with icons, sidebar navigation, responsive design, privacy-safe avatars. |
| **Docker Ready** | SQLite, MySQL, MariaDB, PostgreSQL. Simple docker-compose setup. |
| **i18n** | English and German included. Easily extensible. |

## Quick Start

```bash
docker pull ghcr.io/snxrcs/better-npm:latest
```

See the [Installation Guide](en/setup/) for full instructions.
