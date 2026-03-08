# Better NPM

Eine moderne, quelloffene Oberfläche zur Verwaltung von Nginx-Proxy-Hosts — mit LDAP, SSO und 2FA.

## Funktionen

| Funktion | Beschreibung |
|----------|-------------|
| **LDAP-Authentifizierung** | OpenLDAP, Active Directory, LLDAP. Drei Auth-Modi mit Multi-Server-Failover. |
| **SSO / Trusted Headers** | Authelia, Authentik, Keycloak. Automatische Benutzererstellung aus Proxy-Headern. |
| **Zwei-Faktor-Auth** | TOTP-basierte 2FA für alle Benutzer. Funktioniert mit Google Authenticator, Authy, etc. |
| **Kostenloses SSL** | Integriertes Let's Encrypt mit automatischer Verlängerung. |
| **Moderne UI** | Sidebar-Navigation, responsives Design, datenschutzsichere Avatare. |
| **Docker Ready** | SQLite, MySQL, MariaDB, PostgreSQL. Einfaches docker-compose Setup. |
| **i18n** | Englisch und Deutsch enthalten. Leicht erweiterbar. |

## Schnellstart

```bash
docker pull ghcr.io/snxrcs/better-npm:latest
```

Siehe die [Installationsanleitung](de/setup/) für vollständige Anweisungen.
