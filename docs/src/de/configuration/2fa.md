# Zwei-Faktor-Authentifizierung (2FA)

Better NPM unterstützt TOTP-basierte Zwei-Faktor-Authentifizierung zum Schutz von Benutzerkonten.

## Einrichtung

1. Melden Sie sich beim Admin-Panel an
2. Klicken Sie auf Ihren Avatar in der oberen rechten Ecke
3. Wählen Sie **Zwei-Faktor-Authentifizierung**
4. Scannen Sie den QR-Code mit Ihrer Authentifizierungs-App (Google Authenticator, Authy, etc.)
5. Geben Sie den 6-stelligen Code ein, um zu bestätigen

## Funktionsweise

- Nach Eingabe von Benutzername und Passwort werden Benutzer mit aktivierter 2FA aufgefordert, einen TOTP-Code einzugeben
- Der Code ändert sich alle 30 Sekunden
- 2FA ist pro Benutzer und optional — Administratoren können es nicht auf Benutzer erzwingen

## SSO-Benutzer

SSO-Benutzer überspringen 2FA vollständig. Der Identity-Provider (Authelia, Authentik, etc.) ist für Multi-Faktor-Authentifizierung in SSO-Setups verantwortlich.

## LDAP-Benutzer

LDAP-authentifizierte Benutzer können 2FA genauso wie lokale Benutzer einrichten. Das TOTP-Geheimnis wird lokal gespeichert, unabhängig vom LDAP-Verzeichnis.

## 2FA deaktivieren

Benutzer können 2FA aus demselben Zwei-Faktor-Authentifizierung-Menü deaktivieren, indem sie einen gültigen Code eingeben und die Deaktivierung bestätigen.
