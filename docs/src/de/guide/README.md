# Better NPM

Ein moderner, quelloffener Fork von Nginx Proxy Manager mit Enterprise-Funktionen wie LDAP-Authentifizierung, SSO und Zwei-Faktor-Authentifizierung — in einer komplett überarbeiteten Oberfläche.

- [Schnellstart](#schnellstart)
- [Vollständige Installation](de/setup/)
- [Screenshots](de/screenshots/)

## Projektziel

Better NPM erweitert den originalen Nginx Proxy Manager um Funktionen, die in professionellen und selbst-gehosteten Umgebungen benötigt werden — LDAP, SSO, 2FA und eine moderne Sidebar-UI — ohne die Einfachheit zu verlieren, die NPM großartig gemacht hat. Keine Lizenzkosten, vollständig Open Source.

## Funktionen

- Moderne Sidebar-UI mit responsivem Design und Dark/Light Mode
- LDAP-Authentifizierung (OpenLDAP, Active Directory, LLDAP) mit Multi-Server-Failover
- SSO über Trusted Headers (Authelia, Authentik, Keycloak)
- Zwei-Faktor-Authentifizierung (TOTP) für alle Benutzer
- Internationalisierung (Englisch + Deutsch, leicht erweiterbar)
- Kostenloses SSL mit Let's Encrypt oder eigenen Zertifikaten
- Weiterleitungen, Redirections, Streams und 404-Hosts
- Zugriffslisten und HTTP-Basisauthentifizierung
- Erweiterte Nginx-Konfiguration für Power-User
- Benutzerverwaltung, Berechtigungen und Audit-Log
- Docker Multi-Arch (amd64 + arm64)

## Heimnetzwerk hosten

1. Dein Router hat einen Port-Forwarding-Bereich. Logge dich ein und finde ihn
2. Leite Port 80 und 443 an den Server weiter, auf dem dieses Projekt läuft
3. Konfiguriere deine Domain, damit sie auf dein Zuhause zeigt (statische IP oder DuckDNS / Route53)
4. Nutze Better NPM als Gateway zu deinen anderen Web-Services

## Schnellstart

1. Docker und Docker Compose installieren

- [Docker Installationsanleitung](https://docs.docker.com/get-docker/)
- [Docker Compose Installationsanleitung](https://docs.docker.com/compose/install/)

2. Eine `docker-compose.yml` Datei erstellen:

```yml
services:
  app:
    image: 'ghcr.io/snxrcs/better-npm:latest'
    restart: unless-stopped
    environment:
      TZ: "Europe/Berlin"
    ports:
      - '80:80'
      - '81:81'
      - '443:443'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

3. Stack starten:

```bash
docker compose up -d
```

4. Admin-UI aufrufen

Wenn der Container läuft, erreichst du die Verwaltung auf Port `81`.
Standard-Zugangsdaten: `admin@example.com` / `changeme`

## Mitwirken

Pull Requests sind willkommen — gegen den `main` Branch.

CI läuft automatisch. Alle PRs müssen die Tests bestehen. Nach Bestehen sind Docker-Builds für PRs auf der GitHub Container Registry verfügbar.

### Mitwirkende

Besonderen Dank an [alle Mitwirkenden](https://github.com/snxRCS/better-npm/graphs/contributors)
und das originale [Nginx Proxy Manager](https://github.com/NginxProxyManager/nginx-proxy-manager) Projekt.

## Support

1. [Bug gefunden?](https://github.com/snxRCS/better-npm/issues)
2. [Diskussionen](https://github.com/snxRCS/better-npm/discussions)
