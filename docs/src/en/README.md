# Better NPM

A beautiful, open-source interface for managing Nginx proxy hosts — with LDAP, SSO, and 2FA built in.

## Features

| Feature | Description |
|---------|-------------|
| **LDAP Authentication** | OpenLDAP, Active Directory, LLDAP. Three auth modes with multi-server failover. |
| **SSO / Trusted Headers** | Authelia, Authentik, Keycloak. Auto-create users from proxy headers. |
| **Two-Factor Auth** | TOTP-based 2FA for all users. Works with Google Authenticator, Authy, etc. |
| **Free SSL** | Built-in Let's Encrypt with auto-renewal. |
| **Modern UI** | Sidebar navigation, responsive design, privacy-safe avatars. |
| **Docker Ready** | SQLite, MySQL, MariaDB, PostgreSQL. Simple docker-compose setup. |
| **i18n** | English and German included. Easily extensible. |

## Quick Start

```bash
docker pull ghcr.io/snxrcs/better-npm:latest
```

See the [Installation Guide](en/setup/) for full instructions.
