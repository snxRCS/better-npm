# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x.x   | Yes       |
| < 2.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT create a public GitHub issue**
2. Open a private security advisory on GitHub or send an email to the maintainers with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive a response within 48 hours

## LDAP Security Notes

- LDAP bind passwords are stored encrypted in the database
- Use LDAPS (port 636) or STARTTLS for encrypted LDAP connections
- Service account credentials should have minimal read-only permissions
- The proxy auth endpoint (`/api/ldap/auth`) uses HTTP Basic authentication — always use HTTPS

## Fixed Vulnerabilities

| CVE | Severity | Component | Fixed in Version | Description |
|-----|----------|-----------|-----------------|-------------|
| [CVE-2026-42945](https://nginx.org/en/CHANGELOG) | Critical | NGINX < 1.31.0 | v3.0.3 | Heap buffer overflow in `ngx_http_rewrite_module`, potential RCE when ASLR is disabled |
