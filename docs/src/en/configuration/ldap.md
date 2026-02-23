# LDAP Authentication

Better NPM supports LDAP authentication against OpenLDAP, Active Directory, and LLDAP.

## Authentication Modes

Navigate to **Settings > LDAP** in the admin panel to configure one of three modes:

| Mode | Description |
|------|-------------|
| **Only Internal** | Standard local authentication. LDAP is disabled. |
| **Internal + LDAP** | Users can log in with local credentials or LDAP. Local auth is tried first. |
| **Only LDAP** | Only LDAP authentication is allowed. Ensure at least one LDAP admin user exists! |

## Connection Settings

| Field | Description | Example |
|-------|-------------|---------|
| LDAP Host | Hostname or IP of the LDAP server | `ldap.example.com` |
| Port | LDAP port (389 for LDAP, 636 for LDAPS) | `389` |
| LDAP URL | Full URL (overrides host/port) | `ldaps://ldap.example.com:636` |
| Use STARTTLS | Upgrade connection to TLS | |
| Verify TLS Certificate | Disable for self-signed certs | |

## Bind Credentials

A service account is used to search the LDAP directory. Leave empty for direct bind mode.

| Field | Description | Example |
|-------|-------------|---------|
| Bind DN | Service account DN | `cn=admin,dc=example,dc=com` |
| Bind Password | Service account password | |

### LLDAP Example

```
Bind DN: uid=admin,ou=people,dc=example,dc=com
Base DN: ou=people,dc=example,dc=com
Search Filter: (|(uid={{USERNAME}})(mail={{USERNAME}}))
```

### Active Directory Example

```
Bind DN: cn=svc-npm,cn=Users,dc=corp,dc=example,dc=com
Base DN: dc=corp,dc=example,dc=com
Search Filter: (sAMAccountName={{USERNAME}})
```

## Search Settings

| Field | Description | Default |
|-------|-------------|---------|
| Base DN | Base for user search | `dc=example,dc=com` |
| User DN Template | For direct bind (no service account) | `uid={{USERNAME}},ou=people,dc=example,dc=com` |
| Search Filter | LDAP filter with `{{USERNAME}}` placeholder | `(|(uid={{USERNAME}})(mail={{USERNAME}})(sAMAccountName={{USERNAME}}))` |

## Attribute Mapping

| Field | Default | Description |
|-------|---------|-------------|
| Email Attribute | `mail` | LDAP attribute containing the user's email |
| Name Attribute | `displayName` | LDAP attribute for display name |
| Group Attribute | `memberOf` | LDAP attribute listing group memberships |

## Group & Role Mapping

| Field | Description |
|-------|-------------|
| Admin Group | LDAP group DN. Users in this group get admin role. |
| Sync admin role on every login | Grant/revoke admin on each login based on LDAP groups |
| Auto-create user on first login | Automatically create a local account when an LDAP user logs in for the first time |

## User Sync

Use the **Sync LDAP Users** button to manually import all LDAP users into Better NPM. New users are created, existing users are updated.
