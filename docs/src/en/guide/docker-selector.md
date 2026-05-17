# Docker Container Selector

When adding or editing a proxy host, Better NPM can list all running Docker containers and their exposed ports — select one to auto-fill the forward hostname and port.

## How It Works

A dropdown labelled **"Pick Docker Container"** appears in the proxy host modal above the Forward Hostname / Port fields. Selecting a container auto-populates:
- **Forward Hostname** → container name (resolvable within the Docker network)
- **Forward Port** → the container's exposed port

## Setup

The container selector requires a **Docker socket proxy** for security. Direct socket mounts (`/var/run/docker.sock`) are not used.

Add `tecnativa/docker-socket-proxy` to your `docker-compose.yml`:

```yaml
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
      DOCKER_HOST: "tcp://dockerproxy:2375"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - default
      - proxy

  dockerproxy:
    image: ghcr.io/tecnativa/docker-socket-proxy:latest
    restart: unless-stopped
    environment:
      CONTAINERS: 1
      POST: 0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - default

networks:
  proxy:
    external: true
```

Key points:
- `DOCKER_HOST: "tcp://dockerproxy:2375"` — tells Better NPM to use the proxy
- `CONTAINERS: 1` — allows reading container info
- `POST: 0` — disables any write operations (read-only)
- The socket is mounted **read-only** in the proxy container

## Security

The socket proxy pattern ensures Better NPM never has direct write access to the Docker daemon. Only the `GET /containers` endpoint is exposed.

## Without Socket Proxy

If `DOCKER_HOST` is not set and `/var/run/docker.sock` is not mounted, the dropdown simply does not appear. The proxy host modal works normally — hostname and port can be entered manually as before.
