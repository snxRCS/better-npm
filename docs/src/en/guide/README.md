# Better NPM

A modern, open-source fork of Nginx Proxy Manager with enterprise features like LDAP authentication, SSO, and two-factor authentication — all in a clean, redesigned interface.

- [Quick Setup](#quick-setup)
- [Full Setup](setup/)
- [Screenshots](screenshots/)

## Project Goal

Better NPM extends the original Nginx Proxy Manager with features needed for professional and self-hosted environments — LDAP, SSO, 2FA, and a modern sidebar UI — while keeping the simplicity that made NPM great. No license costs, fully open-source.

## Features

- Modern sidebar UI with responsive design and dark/light mode
- LDAP authentication (OpenLDAP, Active Directory, LLDAP) with multi-server failover
- SSO via trusted headers (Authelia, Authentik, Keycloak)
- Two-factor authentication (TOTP) for all users
- Internationalization (English + German, easily extensible)
- Free SSL using Let's Encrypt or custom certificates
- Forward domains, redirections, streams and 404 hosts
- Access Lists and basic HTTP Authentication
- Advanced Nginx configuration for power users
- User management, permissions and audit log
- Docker multi-arch (amd64 + arm64)

## Hosting your home network

1. Your home router will have a Port Forwarding section somewhere. Log in and find it
2. Add port forwarding for port 80 and 443 to the server hosting this project
3. Configure your domain name details to point to your home, either with a static IP or a service like DuckDNS or Amazon Route53
4. Use Better NPM as your gateway to forward to your other web based services

## Quick Setup

1. Install Docker and Docker Compose

- [Docker Install documentation](https://docs.docker.com/get-docker/)
- [Docker Compose Install documentation](https://docs.docker.com/compose/install/)

2. Create a `docker-compose.yml` file:

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

3. Bring up your stack:

```bash
docker compose up -d
```

4. Log in to the Admin UI

When your docker container is running, connect to it on port `81` for the admin interface.
Default credentials: `admin@example.com` / `changeme`

## Contributing

All are welcome to create pull requests for this project, against the `main` branch.

CI is used in this project. All PRs must pass before being considered. After passing,
docker builds for PRs are available on GitHub Container Registry for manual verifications.

### Contributors

Special thanks to [all of our contributors](https://github.com/snxRCS/better-npm/graphs/contributors)
and the original [Nginx Proxy Manager](https://github.com/NginxProxyManager/nginx-proxy-manager) project.

## Getting Support

1. [Found a bug?](https://github.com/snxRCS/better-npm/issues)
2. [Discussions](https://github.com/snxRCS/better-npm/discussions)
