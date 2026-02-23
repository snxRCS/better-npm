# Environment Variables

Better NPM can be configured via environment variables, mainly for telemetry and privacy settings.

## Available Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VERSION_CHECK_ENABLED` | `true` | Set to `false` to disable the GitHub API version check. When disabled, no external requests are made for version info. |
| `IP_RANGES_FETCH_ENABLED` | `true` | Set to `false` to disable fetching CDN IP ranges from external sources. |
| `DB_SQLITE_FILE` | `/data/database.sqlite` | Path to the SQLite database file |
| `DB_MYSQL_HOST` | — | MySQL/MariaDB host |
| `DB_MYSQL_PORT` | `3306` | MySQL/MariaDB port |
| `DB_MYSQL_USER` | — | MySQL/MariaDB username |
| `DB_MYSQL_PASSWORD` | — | MySQL/MariaDB password |
| `DB_MYSQL_NAME` | — | MySQL/MariaDB database name |

## Privacy Mode

To run Better NPM with zero external network requests (full privacy mode), set:

```yaml
environment:
  VERSION_CHECK_ENABLED: "false"
  IP_RANGES_FETCH_ENABLED: "false"
```

## Docker Compose Example

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
