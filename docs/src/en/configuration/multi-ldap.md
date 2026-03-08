# Multi-LDAP Server Failover

Better NPM supports configuring multiple LDAP servers for high availability. If the primary server is unreachable, the system automatically tries the next server in priority order.

## Configuration

In **Settings > LDAP**, scroll to the **Multi-Server Failover** section and add your servers:

| Field | Description |
|-------|-------------|
| Server URL | Full LDAP URL, e.g. `ldap://ldap1.example.com:389` |
| Priority | Lower number = tried first (e.g. 10, 20, 30) |
| Label | Optional descriptive label (e.g. "Primary", "Replica") |

## How It Works

1. When an LDAP operation is needed (login, user sync, group lookup), Better NPM tries servers in priority order
2. If a server connection fails, the next server is tried automatically
3. The first successful connection is used for the operation
4. Each operation independently selects the best available server

## Backwards Compatibility

If no servers are configured in the multi-server section, Better NPM uses the single host/URL from the Connection Settings section, exactly as before.

## Example Setup

| URL | Priority | Label |
|-----|----------|-------|
| `ldap://ldap-primary.example.com:389` | 10 | Primary |
| `ldap://ldap-replica1.example.com:389` | 20 | Replica EU |
| `ldap://ldap-replica2.example.com:389` | 30 | Replica US |

## Connection Status

The connection status badge shows which server is currently connected and the total number of configured servers (e.g., "Connected (3 servers)").

## Notes

- All servers must share the same Base DN, Bind DN, and search configuration
- Only the server URL differs between entries
- The `Test Connection` button tests failover across all configured servers
