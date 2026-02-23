# Better NPM

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker Image](https://img.shields.io/badge/ghcr.io-better--npm-blue)](https://github.com/snxRCS/better-npm/pkgs/container/better-npm)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-informational)](https://snxrcs.github.io/better-npm/)

A community-driven fork of [Nginx Proxy Manager](https://github.com/NginxProxyManager/nginx-proxy-manager) with **LDAP/AD authentication**, **SSO**, **Two-Factor Auth**, **Multi-LDAP failover**, **i18n**, and a modern sidebar UI — fully open source (MIT).

---

## Features

- **LDAP / Active Directory** — Three auth modes (Internal, Internal+LDAP, LDAP-Only) with OpenLDAP, AD, and LLDAP support
- **SSO / Trusted Headers** — Auto-login via Authelia, Authentik, Keycloak (Remote-Email/User/Name/Groups)
- **Two-Factor Authentication** — TOTP-based 2FA with backup codes
- **Multi-LDAP Failover** — Multiple LDAP servers with priority-based failover
- **LDAP Avatars** — Displays `thumbnailPhoto` / `jpegPhoto` from LDAP automatically
- **Modern Sidebar UI** — Redesigned vertical sidebar with responsive mobile support
- **Internationalization** — English and German, extensible to more languages
- **LDAP User Sync** — Bulk-sync all LDAP users with one click
- **Group → Admin Role Mapping** — Admin role based on LDAP group membership
- **Auto-Create Users** — Local accounts created on first LDAP/SSO login
- **Docker Multi-Arch** — `amd64` and `arm64` via GitHub Container Registry
- **Automated CI/CD** — Auto-versioning, Docker builds, GitHub Releases, Docs deployment

---

## Quick Start (SQLite)

```yaml
# docker-compose.yml
services:
  app:
    image: ghcr.io/snxrcs/better-npm:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "81:81"
    environment:
      TZ: "Europe/Berlin"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

```bash
docker compose up -d
```

Open **http://localhost:81** → login with `admin@example.com` / `changeme` → change your password → go to **Settings → LDAP Authentication**.

---

## Docker Compose Variants

| File | Database | LDAP Server | Docker Secrets |
|------|----------|-------------|----------------|
| [`docker-compose.yml`](docker-compose.yml) | SQLite | – | – |
| [`docker-compose.mariadb.yml`](docker-compose.mariadb.yml) | MariaDB | – | – |
| [`docker-compose.postgres.yml`](docker-compose.postgres.yml) | PostgreSQL | – | – |
| [`docker-compose.lldap.yml`](docker-compose.lldap.yml) | SQLite | LLDAP | – |
| [`docker-compose.full.yml`](docker-compose.full.yml) | MariaDB | LLDAP | Yes |

MariaDB SSL is supported via `DB_MYSQL_SSL`, `DB_MYSQL_SSL_REJECT_UNAUTHORIZED`, and `DB_MYSQL_SSL_VERIFY_IDENTITY`. Docker images support `amd64` and `arm64`.

---

## LDAP Configuration Examples

### LLDAP

| Setting | Value |
|---------|-------|
| Auth Mode | Internal + LDAP |
| Host | `lldap` |
| Port | `3890` |
| Bind DN | `uid=admin,ou=people,dc=example,dc=com` |
| Bind Password | `admin_password` |
| Base DN | `ou=people,dc=example,dc=com` |
| Search Filter | `(\|(uid={{USERNAME}})(mail={{USERNAME}}))` |
| Email Attribute | `mail` |
| Name Attribute | `displayName` |

### Active Directory

| Setting | Value |
|---------|-------|
| Auth Mode | Internal + LDAP |
| Host | `dc.yourdomain.com` |
| Port | `389` (or `636` for LDAPS) |
| Bind DN | `CN=svc-npm,OU=Service Accounts,DC=yourdomain,DC=com` |
| Base DN | `DC=yourdomain,DC=com` |
| Search Filter | `(sAMAccountName={{USERNAME}})` |

### OpenLDAP

| Setting | Value |
|---------|-------|
| Auth Mode | Internal + LDAP |
| Host | `openldap` |
| Port | `389` |
| Bind DN | `cn=admin,dc=example,dc=com` |
| Base DN | `dc=example,dc=com` |
| Search Filter | `(uid={{USERNAME}})` |

---

## Environment Variables

All standard NPM environment variables are supported. LDAP/SSO configuration is done entirely through the web UI.

| Variable | Description |
|----------|-------------|
| `TZ` | Timezone (e.g., `Europe/Berlin`) |
| `DISABLE_IPV6` | Set to `true` if IPv6 is not available |
| `DB_SQLITE_FILE` | Custom SQLite file path |
| `DB_MYSQL_HOST` | MariaDB/MySQL hostname |
| `DB_MYSQL_PORT` | MariaDB/MySQL port (default: `3306`) |
| `DB_MYSQL_USER` / `DB_MYSQL_PASSWORD` | Database credentials (supports `__FILE` suffix) |
| `DB_MYSQL_NAME` | Database name |
| `DB_POSTGRES_HOST` / `DB_POSTGRES_PORT` | PostgreSQL connection |
| `DB_POSTGRES_USER` / `DB_POSTGRES_PASSWORD` | PostgreSQL credentials |
| `DB_POSTGRES_NAME` | PostgreSQL database name |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ldap/config` | Get LDAP configuration |
| `PUT` | `/api/ldap/config` | Update LDAP configuration |
| `POST` | `/api/ldap/test` | Test LDAP connection |
| `GET` | `/api/ldap/status` | LDAP connection status |
| `POST` | `/api/ldap/sync` | Sync all LDAP users |
| `GET` | `/api/ldap/auth` | Proxy auth endpoint (HTTP Basic → LDAP) |

---

## Documentation

Full documentation at **[snxrcs.github.io/better-npm](https://snxrcs.github.io/better-npm/)** — LDAP, SSO, 2FA, Multi-LDAP, and environment variable reference.

---

## Contributing

Contributions are welcome! Please open an issue or pull request on [GitHub](https://github.com/snxRCS/better-npm).

## Original Project

Fork of [Nginx Proxy Manager](https://github.com/NginxProxyManager/nginx-proxy-manager) by Jamie Curnow. All original features preserved. LDAP uses the open-source [ldapjs](https://github.com/ldapjs/node-ldapjs) library (MIT).

## License

MIT — Same as the original project.
