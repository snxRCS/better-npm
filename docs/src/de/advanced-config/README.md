# Erweiterte Konfiguration

## Prozesse als Benutzer/Gruppe ausführen

Standardmäßig werden die Services (nginx usw.) als `root`-Benutzer innerhalb des Docker-Containers ausgeführt.
Sie können dieses Verhalten ändern, indem Sie die folgenden Umgebungsvariablen setzen.
Sie werden nicht nur die Services als dieser Benutzer/Gruppe ausführen, sondern auch die Ownership
auf die `data`- und `letsencrypt`-Ordner beim Start ändern.

```yml
services:
  app:
    image: 'ghcr.io/snxrcs/better-npm:{{VERSION}}'
    environment:
      PUID: 1000
      PGID: 1000
    # ...
```

Dies kann die Nebenwirkung eines fehlgeschlagenen Container-Starts aufgrund von Zugriff verweigert beim Öffnen von Port 80 auf einigen Systemen haben. Der einzige Weg, dies zu beheben, ist, die Variablen zu entfernen
und als Standard-Root-Benutzer auszuführen.

## Best Practice: Docker-Netzwerk verwenden

Für diejenigen, die einige ihrer Upstream-Services im Docker auf demselben Docker-Host wie NPM ausführen lassen möchten, ist hier ein Trick, um Dinge etwas besser zu sichern. Durch die Erstellung eines benutzerdefinierten Docker-Netzwerks
müssen Sie keine Ports für Ihre Upstream-Services auf allen Docker-Host-Schnittstellen veröffentlichen.

Erstellen Sie ein Netzwerk, z.B. "scoobydoo":

```bash
docker network create scoobydoo
```

Fügen Sie dann das Folgende zur `docker-compose.yml`-Datei für sowohl NPM als auch alle anderen
Services auf diesem Docker-Host hinzu:

```yml
networks:
  default:
    external: true
    name: scoobydoo
```

Schauen wir uns ein Portainer-Beispiel an:

```yml
services:

  portainer:
    image: portainer/portainer
    privileged: true
    volumes:
      - './data:/data'
      - '/var/run/docker.sock:/var/run/docker.sock'
    restart: unless-stopped

networks:
  default:
    external: true
    name: scoobydoo
```

Jetzt können Sie in der NPM UI einen Proxy-Host mit `portainer` als Hostname erstellen,
und `9000` als Port. Obwohl dieser Port nicht in der docker-compose-Datei aufgelistet ist, wird er vom Portainer Docker-Image für Sie "exponiert" und ist nicht auf
dem Docker-Host außerhalb dieses Docker-Netzwerks verfügbar. Der Service-Name wird als
Hostname verwendet, also stellen Sie sicher, dass Ihre Service-Namen eindeutig sind, wenn Sie dasselbe Netzwerk verwenden.

## Docker Healthcheck

Das `Dockerfile`, das dieses Projekt erstellt, enthält keinen `HEALTHCHECK`, aber Sie können sich für dieses
Feature entscheiden, indem Sie das Folgende zum Service in Ihrer `docker-compose.yml`-Datei hinzufügen:

```yml
healthcheck:
  test: ["CMD", "/usr/bin/check-health"]
  interval: 10s
  timeout: 3s
```

## Docker File Secrets

Dieses Image unterstützt die Verwendung von Docker-Secrets zum Importieren von Dateien und zum Schutz von sensiblen Benutzernamen oder Passwörtern davor, dass sie in Klartextform übergeben oder beibehalten werden.

Sie können jede Umgebungsvariable aus einer Datei setzen, indem Sie `__FILE` (Doppelunterstrich FILE) zum Umgebungsvariablennamen hinzufügen.

```yml
secrets:
  # Secrets sind Single-Line-Textdateien, bei denen der einzige Inhalt das Secret ist
  # Pfade in diesem Beispiel nehmen an, dass Secrets in einem lokalen Ordner namens ".secrets" gespeichert sind
  DB_ROOT_PWD:
    file: .secrets/db_root_pwd.txt
  MYSQL_PWD:
    file: .secrets/mysql_pwd.txt

services:
  app:
    image: 'ghcr.io/snxrcs/better-npm:{{VERSION}}'
    restart: unless-stopped
    ports:
      # Public HTTP Port:
      - '80:80'
      # Public HTTPS Port:
      - '443:443'
      # Admin Web Port:
      - '81:81'
    environment:
      # Diese sind die Einstellungen für den Zugriff auf Ihre Datenbank
      DB_MYSQL_HOST: "db"
      DB_MYSQL_PORT: 3306
      DB_MYSQL_USER: "npm"
      # DB_MYSQL_PASSWORD: "npm"  # verwenden Sie stattdessen ein Secret
      DB_MYSQL_PASSWORD__FILE: /run/secrets/MYSQL_PWD
      DB_MYSQL_NAME: "npm"
      # Wenn Sie lieber Sqlite verwenden möchten, entfernen Sie alle DB_MYSQL_*-Zeilen oben
      # Kommentieren Sie dies aus, wenn IPv6 auf Ihrem Host nicht aktiviert ist
      # DISABLE_IPV6: 'true'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    secrets:
      - MYSQL_PWD
    depends_on:
      - db

  db:
    image: 'linuxserver/mariadb'
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD__FILE: /run/secrets/DB_ROOT_PWD
      MYSQL_DATABASE: 'npm'
      MYSQL_USER: 'npm'
      MYSQL_PASSWORD__FILE: /run/secrets/MYSQL_PWD
      TZ: 'Australia/Brisbane'
    volumes:
      - ./mariadb:/config
    secrets:
      - DB_ROOT_PWD
      - MYSQL_PWD
```


## IPv6 deaktivieren

Auf einigen Docker-Hosts ist IPv6 möglicherweise nicht aktiviert. In diesen Fällen kann die folgende Meldung in den Logs angezeigt werden:

> Address family not supported by protocol

Die einfache Lösung ist, eine Docker-Umgebungsvariable zum Better NPM Stack hinzuzufügen:

```yml
    environment:
      DISABLE_IPV6: 'true'
```

## IP-Ranges-Abruf deaktivieren

Standardmäßig ruft NPM IP-Ranges von CloudFront und Cloudflare beim Anwendungsstart ab. In Umgebungen mit eingeschränktem Internetzugang oder zur Beschleunigung des Container-Starts kann dieser Abruf deaktiviert werden:

```yml
    environment:
      IP_RANGES_FETCH_ENABLED: 'false'
```

## Benutzerdefinierte Nginx-Konfigurationen

Wenn Sie ein fortgeschrittenerer Benutzer sind, möchten Sie vielleicht mehr Nginx-Anpassbarkeit.

NPM hat die Fähigkeit, verschiedene benutzerdefinierte Konfigurationsschnipsel an verschiedenen Orten einzubinden.

Sie können Ihre benutzerdefinierten Konfigurationsschnipsel-Dateien unter `/data/nginx/custom` wie folgt hinzufügen:

 - `/data/nginx/custom/root_top.conf`: Eingebunden am Anfang von nginx.conf
 - `/data/nginx/custom/root.conf`: Eingebunden am Ende von nginx.conf
 - `/data/nginx/custom/http_top.conf`: Eingebunden am Anfang des Haupt-HTTP-Blocks
 - `/data/nginx/custom/http.conf`: Eingebunden am Ende des Haupt-HTTP-Blocks
 - `/data/nginx/custom/events.conf`: Eingebunden am Ende des Events-Blocks
 - `/data/nginx/custom/stream.conf`: Eingebunden am Ende des Haupt-Stream-Blocks
 - `/data/nginx/custom/server_proxy.conf`: Eingebunden am Ende eines jeden Proxy-Server-Blocks
 - `/data/nginx/custom/server_redirect.conf`: Eingebunden am Ende eines jeden Umlenkungs-Server-Blocks
 - `/data/nginx/custom/server_stream.conf`: Eingebunden am Ende eines jeden Stream-Server-Blocks
 - `/data/nginx/custom/server_stream_tcp.conf`: Eingebunden am Ende eines jeden TCP-Stream-Server-Blocks
 - `/data/nginx/custom/server_stream_udp.conf`: Eingebunden am Ende eines jeden UDP-Stream-Server-Blocks
 - `/data/nginx/custom/server_dead.conf`: Eingebunden am Ende eines jeden 404-Server-Blocks

Jede Datei ist optional.


## X-FRAME-OPTIONS Header

Sie können den Wert des [`X-FRAME-OPTIONS`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options) Headers
konfigurieren, indem Sie ihn als Docker-Umgebungsvariable angeben. Der Standard, falls nicht angegeben, ist `deny`.

```yml
  ...
  environment:
    X_FRAME_OPTIONS: "sameorigin"
  ...
```

## Logrotate-Einstellungen anpassen

Standardmäßig dreht NPM die Access- und Error-Logs wöchentlich und behält 4 bzw. 10 Log-Dateien.
Abhängig von der Nutzung kann dies zu großen Log-Dateien führen, besonders bei Access-Logs.
Sie können die Logrotate-Konfiguration über ein Mount anpassen (wenn Ihre benutzerdefinierte Konfiguration `logrotate.custom` ist):

```yml
  volumes:
    ...
    - ./logrotate.custom:/etc/logrotate.d/nginx-proxy-manager
```

Als Referenz kann die Standard-Konfiguration [hier](https://github.com/snxRCS/better-npm/blob/main/docker/rootfs/etc/logrotate.d/nginx-proxy-manager) gefunden werden.

## GeoIP2-Modul aktivieren

Um das GeoIP2-Modul zu aktivieren, können Sie die benutzerdefinierte Konfigurationsdatei `/data/nginx/custom/root_top.conf` erstellen und den folgenden Snippet einbinden:

```
load_module /usr/lib/nginx/modules/ngx_http_geoip2_module.so;
load_module /usr/lib/nginx/modules/ngx_stream_geoip2_module.so;
```

## Automatische Admin-Erstellung

Das Setzen dieser Umgebungsvariablen erstellt den Standard-Benutzer beim Start und überspringt den UI-Bildschirm zum Einrichten des ersten Benutzers:

```
    environment:
      INITIAL_ADMIN_EMAIL: my@example.com
      INITIAL_ADMIN_PASSWORD: mypassword1
```
