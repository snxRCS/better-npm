# Full Setup Instructions

## Running the App

Create a `docker-compose.yml` file or use one of the included compose files from the repository:

| File | Database | LDAP Server | Docker Secrets |
|------|----------|-------------|----------------|
| `docker-compose.yml` | SQLite | – | – |
| `docker-compose.mariadb.yml` | MariaDB | – | – |
| `docker-compose.postgres.yml` | PostgreSQL | – | – |
| `docker-compose.lldap.yml` | SQLite | LLDAP | – |
| `docker-compose.full.yml` | MariaDB | LLDAP | Yes |

### Quick Start (SQLite)

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

Then:

```bash
docker compose up -d
```

## Using MySQL / MariaDB Database

If you opt for the MySQL configuration you will have to provide the database server yourself.

It's easy to use another docker container for your database also and link it as part of the docker stack, so that's what the following examples
are going to use.

Here is an example of what your `docker-compose.yml` will look like when using a MariaDB container:

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

> **Tip:** A ready-to-use file is included in the repository: `docker-compose.mariadb.yml`

> **Warning:**
> Please note, that `DB_MYSQL_*` environment variables will take precedent over `DB_SQLITE_*` variables. So if you keep the MySQL variables, you will not be able to use SQLite.

### Optional: MySQL / MariaDB SSL

You can enable TLS for the MySQL/MariaDB connection with these environment variables:

- `DB_MYSQL_SSL`: Enable SSL when set to true. If unset or false, SSL disabled (previous default behaviour).
- `DB_MYSQL_SSL_REJECT_UNAUTHORIZED`: (default: true) Validate the server certificate chain. Set to false to allow self‑signed/unknown CA.
- `DB_MYSQL_SSL_VERIFY_IDENTITY`: (default: true) Performs host name / identity verification.

## Using Postgres database

Similar to the MySQL server setup:

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

> **Tip:** A ready-to-use file is included in the repository: `docker-compose.postgres.yml`

> **Warning:** Custom Postgres schema is not supported, as such `public` will be used.

## With LLDAP (LDAP Server)

Get started with LDAP quickly using LLDAP – a lightweight, open-source LDAP server written in Rust.

```bash
docker compose -f docker-compose.lldap.yml up -d
```

- **NPM Admin UI:** http://localhost:81 (default: `admin@example.com` / `changeme`)
- **LLDAP Admin UI:** http://localhost:17170 (default: `admin` / `admin_password`)

After starting, configure LDAP in NPM under **Settings → LDAP Authentication**.

> **Tip:** A ready-to-use file is included in the repository: `docker-compose.lldap.yml`

## Full Stack (MariaDB + LLDAP + Docker Secrets)

Production-ready setup with MariaDB, LLDAP, and Docker Secrets for secure credential storage.

```bash
# 1. Create secrets
mkdir -p .secrets
echo "your_root_password" > .secrets/db_root_password.txt
echo "your_npm_password"  > .secrets/mysql_password.txt
chmod 600 .secrets/*.txt

# 2. Start the stack
docker compose -f docker-compose.full.yml up -d
```

> **Tip:** A ready-to-use file is included in the repository: `docker-compose.full.yml`

## Running on Raspberry PI / ARM devices

The docker images support the following architectures:
- amd64
- arm64

> **Warning:** `armv7` is no longer supported in version 2.14+. This is due to Nodejs dropping support for armhf. Please use the `2.13.7` image tag if this applies to you.

The docker images are a manifest of all the architecture docker builds supported, so this means
you don't have to worry about doing anything special and you can follow the common instructions above.

Check out the [container registry](https://github.com/snxRCS/better-npm/pkgs/container/better-npm)
for a list of supported architectures and if you want one that doesn't exist,
[create a feature request](https://github.com/snxRCS/better-npm/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=).

## Initial Run

After the app is running for the first time, the following will happen:

1. JWT keys will be generated and saved in the data folder
2. The database will initialize with table structures
3. A default admin user will be created

This process can take a couple of minutes depending on your machine.
