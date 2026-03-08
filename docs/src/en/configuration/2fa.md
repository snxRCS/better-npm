# Two-Factor Authentication (2FA)

Better NPM supports TOTP-based two-factor authentication to protect user accounts.

## Setup

1. Log in to the admin panel
2. Click your avatar in the top-right corner
3. Select **Two-Factor Authentication**
4. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
5. Enter the 6-digit code to confirm

## How It Works

- After entering username and password, users with 2FA enabled are prompted for a TOTP code
- The code changes every 30 seconds
- 2FA is per-user and optional — admins cannot force it on users

## SSO Users

SSO users skip 2FA entirely. The identity provider (Authelia, Authentik, etc.) is responsible for multi-factor authentication in SSO setups.

## LDAP Users

LDAP-authenticated users can set up 2FA just like local users. The TOTP secret is stored locally, independent of the LDAP directory.

## Disabling 2FA

Users can disable 2FA from the same Two-Factor Authentication menu by entering a valid code and confirming the disable action.
