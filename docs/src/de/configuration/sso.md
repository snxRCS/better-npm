# SSO / Trusted-Header-Authentifizierung

Better NPM unterstützt Single Sign-On via trusted Reverse-Proxy-Header, kompatibel mit Authelia, Authentik, Keycloak und ähnlichen Identity-Providern.

## Funktionsweise

Wenn SSO aktiviert ist, überprüft die Anmeldeseite HTTP-Header, die von Ihrem Reverse Proxy gesetzt werden. Wenn ein gültiger `Remote-Email`-Header gefunden wird, wird der Benutzer automatisch angemeldet, ohne ein Passwort einzugeben.

## Einrichtung

1. Navigieren Sie zu **Einstellungen > LDAP** im Admin-Panel
2. Aktivieren Sie LDAP (Intern + LDAP oder Nur LDAP)
3. Aktivieren Sie **SSO aktivieren (Trusted Header Auth)**
4. Konfigurieren Sie Ihren Reverse Proxy, um die erforderlichen Header zu setzen

## Erforderliche Header

Ihr Reverse Proxy muss diese Header setzen, wenn Anfragen an Better NPM weitergeleitet werden:

| Header | Erforderlich | Beschreibung |
|--------|----------|-------------|
| `Remote-Email` | Ja | E-Mail-Adresse des Benutzers |
| `Remote-User` | Nein | Benutzername |
| `Remote-Name` | Nein | Anzeigename |
| `Remote-Groups` | Nein | Kommagetrennte Gruppenliste (wird für Admin-Rollenzuordnung verwendet) |

## SSO Admin E-Mails

Sie können eine kommagetrennte Liste von E-Mail-Adressen angeben, die beim Login via SSO immer die Admin-Rolle erhalten, unabhängig von ihrer Gruppenmitgliedschaft.

```
admin@example.com, ops@example.com
```

## SSO Abmelde-URL

Wenn sich ein Benutzer von Better NPM abmeldet, kann er zur Abmelde-URL Ihres Identity-Providers umgeleitet werden, um die SSO-Sitzung vollständig zu beenden.

```
https://auth.example.com/logout
```

## Authelia Beispiel

Binden Sie die bereitgestellte `authelia-location.conf` in Ihre nginx-Konfiguration ein:

```nginx
include conf.d/include/authelia-location.conf;
```

Dies richtet `auth_request` ein, um die Authentifizierung an Authelia weiterzuleiten und die `Remote-*`-Header zu extrahieren.

## Notizen

- SSO-Benutzer überspringen 2FA (der Identity-Provider handhabt Multi-Faktor-Authentifizierung)
- Benutzer werden beim ersten SSO-Login automatisch erstellt, wenn sie nicht existieren
- Admin-Rolle kann über den `Remote-Groups`-Header oder die SSO-Admin-E-Mails-Liste zugewiesen werden
- Wenn `Remote-Groups` fehlt, versucht Better NPM, Gruppen direkt über LDAP zu suchen
