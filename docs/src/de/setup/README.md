# Vollständige Installationsanleitung

## App starten

Erstellen Sie eine `docker-compose.yml`-Datei oder verwenden Sie eine der im Repository enthaltenen Compose-Dateien:

| Datei | Datenbank | LDAP Server | Docker Secrets |
|------|----------|-------------|----------------|
| `docker-compose.yml` | SQLite | – | – |
| `docker-compose.mariadb.yml` | MariaDB | – | – |
| `docker-compose.postgres.yml` | PostgreSQL | – | – |
| `docker-compose.lldap.yml` | SQLite | LLDAP | – |
| `docker-compose.full.yml` | MariaDB | LLDAP | Ja |

### Schnellstart (SQLite)

```yml
services:
  app:
    image: 'ghcr.io/snxrcs/better-npm:latest'
    restart: unless-stopped
    ports:
      - '80:80' # Public HTTP Port
      - '443:443' # Public HTTPS Port
      - '81:81' # Admin Web Port
      # Add any other Stream port you want to expose
      # - '21:21' # FTP
    environment:
      TZ: "Europe/Berlin"
      # Uncomment this if you want to change the location of
      # the SQLite DB file within the container
      # DB_SQLITE_FILE: "/data/database.sqlite"
      # Uncomment this if IPv6 is not enabled on your host
      # DISABLE_IPV6: 'true'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

Danach:

```bash
docker compose up -d
```

## MySQL / MariaDB verwenden

Wenn Sie sich für die MySQL-Konfiguration entscheiden, müssen Sie den Datenbankserver selbst bereitstellen.

Es ist einfach, auch einen anderen Docker-Container für Ihre Datenbank zu verwenden und ihn als Teil des Docker-Stacks zu verlinken. Das ist das, was die folgenden Beispiele zeigen.

Hier ist ein Beispiel für Ihre `docker-compose.yml` bei Verwendung eines MariaDB-Containers:

```yml
services:
  app:
    image: 'ghcr.io/snxrcs/better-npm:latest'
    restart: unless-stopped
    ports:
      - '80:80' # Public HTTP Port
      - '443:443' # Public HTTPS Port
      - '81:81' # Admin Web Port
    environment:
      TZ: "Europe/Berlin"
      DB_MYSQL_HOST: "db"
      DB_MYSQL_PORT: 3306
      DB_MYSQL_USER: "npm"
      DB_MYSQL_PASSWORD: "npm"
      DB_MYSQL_NAME: "npm"
      # Uncomment this if IPv6 is not enabled on your host
      # DISABLE_IPV6: 'true'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    depends_on:
      - db

  db:
    image: 'linuxserver/mariadb:latest'
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: 'npm'
      MYSQL_DATABASE: 'npm'
      MYSQL_USER: 'npm'
      MYSQL_PASSWORD: 'npm'
      TZ: 'Europe/Berlin'
    volumes:
      - ./mariadb:/config
```

> **Tipp:** Eine fertige Datei ist im Repository enthalten: `docker-compose.mariadb.yml`

> **Warnung:**
> Bitte beachten Sie, dass die Umgebungsvariablen `DB_MYSQL_*` Vorrang vor `DB_SQLITE_*`-Variablen haben. Wenn Sie die MySQL-Variablen beibehalten, können Sie SQLite nicht verwenden.

### Optional: MySQL / MariaDB SSL

Sie können TLS für die MySQL/MariaDB-Verbindung mit diesen Umgebungsvariablen aktivieren:

- `DB_MYSQL_SSL`: SSL aktivieren, wenn auf true gesetzt. Falls nicht gesetzt oder false, ist SSL deaktiviert (vorheriges Standardverhalten).
- `DB_MYSQL_SSL_REJECT_UNAUTHORIZED`: (Standard: true) Validiert die Serverzertifikatkette. Auf false setzen, um selbstsignierte/unbekannte CAs zu erlauben.
- `DB_MYSQL_SSL_VERIFY_IDENTITY`: (Standard: true) Führt Hostnamen-/Identitätsverifikation durch.

## Postgres verwenden

Ähnlich zur MySQL-Server-Einrichtung:

```yml
services:
  app:
    image: 'ghcr.io/snxrcs/better-npm:latest'
    restart: unless-stopped
    ports:
      - '80:80' # Public HTTP Port
      - '443:443' # Public HTTPS Port
      - '81:81' # Admin Web Port
    environment:
      TZ: "Europe/Berlin"
      DB_POSTGRES_HOST: 'db'
      DB_POSTGRES_PORT: '5432'
      DB_POSTGRES_USER: 'npm'
      DB_POSTGRES_PASSWORD: 'npmpass'
      DB_POSTGRES_NAME: 'npm'
      # Uncomment this if IPv6 is not enabled on your host
      # DISABLE_IPV6: 'true'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    depends_on:
      - db

  db:
    image: postgres:17
    environment:
      POSTGRES_USER: 'npm'
      POSTGRES_PASSWORD: 'npmpass'
      POSTGRES_DB: 'npm'
    volumes:
      - ./postgresql:/var/lib/postgresql
```

> **Tipp:** Eine fertige Datei ist im Repository enthalten: `docker-compose.postgres.yml`

> **Warnung:** Benutzerdefinierte Postgres-Schemas werden nicht unterstützt. Daher wird `public` verwendet.

## Mit LLDAP (LDAP Server)

Beginnen Sie schnell mit LDAP mit LLDAP – einen leichten, Open-Source-LDAP-Server geschrieben in Rust.

```bash
docker compose -f docker-compose.lldap.yml up -d
```

- **NPM Admin UI:** http://localhost:81 (Standard: `admin@example.com` / `changeme`)
- **LLDAP Admin UI:** http://localhost:17170 (Standard: `admin` / `admin_password`)

Konfigurieren Sie nach dem Start LDAP in NPM unter **Einstellungen → LDAP-Authentifizierung**.

> **Tipp:** Eine fertige Datei ist im Repository enthalten: `docker-compose.lldap.yml`

## Vollständiger Stack (MariaDB + LLDAP + Docker Secrets)

Produktionsbereit mit MariaDB, LLDAP und Docker Secrets für sichere Anmeldedatenspeicherung.

```bash
# 1. Secrets erstellen
mkdir -p .secrets
echo "your_root_password" > .secrets/db_root_password.txt
echo "your_npm_password"  > .secrets/mysql_password.txt
chmod 600 .secrets/*.txt

# 2. Stack starten
docker compose -f docker-compose.full.yml up -d
```

> **Tipp:** Eine fertige Datei ist im Repository enthalten: `docker-compose.full.yml`

## Auf Raspberry PI / ARM-Geräten ausführen

Die Docker-Images unterstützen die folgenden Architekturen:
- amd64
- arm64

> **Warnung:** `armv7` wird in Version 2.14+ nicht mehr unterstützt. Dies liegt daran, dass Nodejs die Unterstützung für armhf eingestellt hat. Verwenden Sie bitte das `2.13.7`-Image-Tag, wenn dies für Sie zutrifft.

Die Docker-Images sind ein Manifest aller unterstützten Docker-Builds für die Architektur. Das bedeutet, dass Sie sich keine Sorgen um etwas Besonderes machen müssen und die obigen allgemeinen Anweisungen befolgen können.

Überprüfen Sie die [Container-Registry](https://github.com/snxRCS/better-npm/pkgs/container/better-npm), um eine Liste der unterstützten Architekturen zu sehen. Wenn Sie eine benötigen, die nicht existiert, [erstellen Sie eine Feature-Anfrage](https://github.com/snxRCS/better-npm/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=).

## Erster Start

Nach dem ersten Start der App passiert folgendes:

1. JWT-Schlüssel werden generiert und im Datenordner gespeichert
2. Die Datenbank wird mit Tabellenstrukturen initialisiert
3. Ein Standard-Admin-Benutzer wird erstellt

Dieser Prozess kann je nach Ihrer Maschine ein paar Minuten dauern.
