# Umgebungsvariablen

Better NPM kann über Umgebungsvariablen konfiguriert werden, hauptsächlich für Telemetrie- und Datenschutzeinstellungen.

## Verfügbare Variablen

| Variable | Standard | Beschreibung |
|----------|---------|-------------|
| `VERSION_CHECK_ENABLED` | `true` | Auf `false` setzen, um die GitHub-API-Versionsprüfung zu deaktivieren. Wenn deaktiviert, werden keine externen Anfragen für Versionsinformationen gestellt. |
| `IP_RANGES_FETCH_ENABLED` | `true` | Auf `false` setzen, um das Abrufen von CDN-IP-Ranges aus externen Quellen zu deaktivieren. |
| `DB_SQLITE_FILE` | `/data/database.sqlite` | Pfad zur SQLite-Datenbankdatei |
| `DB_MYSQL_HOST` | — | MySQL/MariaDB-Host |
| `DB_MYSQL_PORT` | `3306` | MySQL/MariaDB-Port |
| `DB_MYSQL_USER` | — | MySQL/MariaDB-Benutzername |
| `DB_MYSQL_PASSWORD` | — | MySQL/MariaDB-Passwort |
| `DB_MYSQL_NAME` | — | MySQL/MariaDB-Datenbankname |

## Datenschutzmodus

Um Better NPM mit Null externen Netzwerkanfragen (vollständiger Datenschutzmodus) auszuführen, setzen Sie:

```yaml
environment:
  VERSION_CHECK_ENABLED: "false"
  IP_RANGES_FETCH_ENABLED: "false"
```

## Docker Compose Beispiel

```yaml
services:
  app:
    image: ghcr.io/snxrcs/better-npm:latest
    ports:
      - "80:80"
      - "443:443"
      - "81:81"
    environment:
      VERSION_CHECK_ENABLED: "false"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```
