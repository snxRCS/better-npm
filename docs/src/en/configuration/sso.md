# SSO / Trusted Header Authentication

Better NPM supports Single Sign-On via trusted reverse proxy headers, compatible with Authelia, Authentik, Keycloak, and similar identity providers.

## How It Works

When SSO is enabled, the login page checks for HTTP headers set by your reverse proxy. If a valid `Remote-Email` header is found, the user is automatically logged in without entering a password.

## Setup

1. Navigate to **Settings > LDAP** in the admin panel
2. Enable LDAP (Internal + LDAP or LDAP Only)
3. Check **Enable SSO (Trusted Header Auth)**
4. Configure your reverse proxy to set the required headers

## Required Headers

Your reverse proxy must set these headers when forwarding requests to Better NPM:

| Header | Required | Description |
|--------|----------|-------------|
| `Remote-Email` | Yes | User's email address |
| `Remote-User` | No | Username |
| `Remote-Name` | No | Display name |
| `Remote-Groups` | No | Comma-separated group list (used for admin role mapping) |

## SSO Admin Emails

You can specify a comma-separated list of email addresses that should always receive the admin role when logging in via SSO, regardless of their group membership.

```
admin@example.com, ops@example.com
```

## SSO Logout URL

When a user logs out of Better NPM, they can be redirected to your identity provider's logout endpoint to end the SSO session completely.

```
https://auth.example.com/logout
```

## Authelia Example

Include the provided `authelia-location.conf` in your nginx configuration:

```nginx
include conf.d/include/authelia-location.conf;
```

This sets up `auth_request` to forward authentication to Authelia and extracts the `Remote-*` headers.

## Notes

- SSO users skip 2FA (the identity provider handles multi-factor authentication)
- Users are auto-created on first SSO login if they don't exist
- Admin role can be assigned via `Remote-Groups` header or the SSO Admin Emails list
- If `Remote-Groups` is missing, Better NPM falls back to looking up groups directly via LDAP
