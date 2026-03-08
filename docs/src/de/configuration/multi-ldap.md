# Multi-LDAP Server Failover

Better NPM unterstützt die Konfiguration mehrerer LDAP-Server für hohe Verfügbarkeit. Wenn der primäre Server unerreichbar ist, versucht das System automatisch, den nächsten Server in Prioritätsreihenfolge zu verwenden.

## Konfiguration

Navigieren Sie in **Einstellungen > LDAP** zum Abschnitt **Multi-Server Failover** und fügen Sie Ihre Server hinzu:

| Feld | Beschreibung |
|-------|-------------|
| Server URL | Vollständige LDAP-URL, z.B. `ldap://ldap1.example.com:389` |
| Priorität | Niedrigere Zahl = wird zuerst versucht (z.B. 10, 20, 30) |
| Label | Optionales beschreibendes Label (z.B. "Primary", "Replica") |

## Funktionsweise

1. Wenn eine LDAP-Operation erforderlich ist (Login, Benutzersynchronisation, Gruppensuche), versucht Better NPM Server in Prioritätsreihenfolge
2. Wenn eine Serververbindung fehlschlägt, wird automatisch der nächste Server versucht
3. Die erste erfolgreiche Verbindung wird für die Operation verwendet
4. Jede Operation wählt unabhängig den besten verfügbaren Server

## Rückwärtskompatibilität

Wenn im Multi-Server-Abschnitt keine Server konfiguriert sind, verwendet Better NPM den einzelnen Host/URL aus dem Abschnitt Verbindungseinstellungen, genau wie zuvor.

## Beispieleinrichtung

| URL | Priorität | Label |
|-----|----------|-------|
| `ldap://ldap-primary.example.com:389` | 10 | Primary |
| `ldap://ldap-replica1.example.com:389` | 20 | Replica EU |
| `ldap://ldap-replica2.example.com:389` | 30 | Replica US |

## Verbindungsstatus

Das Verbindungsstatuszeichen zeigt, welcher Server derzeit verbunden ist und die Gesamtanzahl der konfigurierten Server (z.B. "Verbunden (3 Server)").

## Notizen

- Alle Server müssen denselben Base DN, Bind DN und eine Suchkonfiguration teilen
- Nur die Server-URL unterscheidet sich zwischen den Einträgen
- Die Schaltfläche `Test Connection` testet Failover über alle konfigurierten Server
