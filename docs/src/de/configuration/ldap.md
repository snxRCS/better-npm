# LDAP-Authentifizierung

Better NPM unterstützt LDAP-Authentifizierung gegen OpenLDAP, Active Directory und LLDAP.

## Authentifizierungsmodi

Navigieren Sie zu **Einstellungen > LDAP** im Admin-Panel, um einen von drei Modi zu konfigurieren:

| Modus | Beschreibung |
|------|-------------|
| **Nur intern** | Standard lokale Authentifizierung. LDAP ist deaktiviert. |
| **Intern + LDAP** | Benutzer können sich mit lokalen Anmeldedaten oder LDAP anmelden. Lokale Authentifizierung wird zuerst versucht. |
| **Nur LDAP** | Nur LDAP-Authentifizierung ist zulässig. Stellen Sie sicher, dass mindestens ein LDAP-Admin-Benutzer existiert! |

## Verbindungseinstellungen

| Feld | Beschreibung | Beispiel |
|-------|-------------|---------|
| LDAP Host | Hostname oder IP des LDAP-Servers | `ldap.example.com` |
| Port | LDAP-Port (389 für LDAP, 636 für LDAPS) | `389` |
| LDAP URL | Vollständige URL (überschreibt Host/Port) | `ldaps://ldap.example.com:636` |
| STARTTLS verwenden | Verbindung zu TLS aktualisieren | |
| TLS-Zertifikat verifizieren | Deaktivieren für selbstsignierte Zertifikate | |

## Bind-Zugangsdaten

Ein Service-Konto wird zum Durchsuchen des LDAP-Verzeichnisses verwendet. Lassen Sie leer für Direct-Bind-Modus.

| Feld | Beschreibung | Beispiel |
|-------|-------------|---------|
| Bind DN | Service-Konto DN | `cn=admin,dc=example,dc=com` |
| Bind Passwort | Service-Konto Passwort | |

### LLDAP Beispiel

```
Bind DN: uid=admin,ou=people,dc=example,dc=com
Base DN: ou=people,dc=example,dc=com
Search Filter: (|(uid={{USERNAME}})(mail={{USERNAME}}))
```

### Active Directory Beispiel

```
Bind DN: cn=svc-npm,cn=Users,dc=corp,dc=example,dc=com
Base DN: dc=corp,dc=example,dc=com
Search Filter: (sAMAccountName={{USERNAME}})
```

## Sucheinstellungen

| Feld | Beschreibung | Standard |
|-------|-------------|---------|
| Base DN | Basis für Benutzersuche | `dc=example,dc=com` |
| User DN Vorlage | Für Direct Bind (kein Service-Konto) | `uid={{USERNAME}},ou=people,dc=example,dc=com` |
| Suchfilter | LDAP-Filter mit `{{USERNAME}}`-Platzhalter | `(|(uid={{USERNAME}})(mail={{USERNAME}})(sAMAccountName={{USERNAME}}))` |

## Attribut-Zuordnung

| Feld | Standard | Beschreibung |
|-------|---------|-------------|
| E-Mail-Attribut | `mail` | LDAP-Attribut mit der E-Mail des Benutzers |
| Name-Attribut | `displayName` | LDAP-Attribut für den Anzeigenamen |
| Gruppen-Attribut | `memberOf` | LDAP-Attribut das Gruppenmitgliedschaften auflistet |

## Gruppen- und Rollenzuordnung

| Feld | Beschreibung |
|-------|-------------|
| Admin-Gruppe | LDAP-Gruppen-DN. Benutzer in dieser Gruppe erhalten Admin-Rolle. |
| Admin-Rolle bei jedem Login synchronisieren | Admin-Rolle bei jedem Login basierend auf LDAP-Gruppen gewähren/widerrufen |
| Benutzer beim ersten Login automatisch erstellen | Automatisch ein lokales Konto erstellen, wenn sich ein LDAP-Benutzer zum ersten Mal anmeldet |

## Benutzer-Synchronisation

Verwenden Sie die Schaltfläche **LDAP-Benutzer synchronisieren**, um alle LDAP-Benutzer manuell in Better NPM zu importieren. Neue Benutzer werden erstellt, bestehende Benutzer werden aktualisiert.
