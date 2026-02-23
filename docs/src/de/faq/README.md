# FAQ

## Muss ich Docker verwenden?

Ja, so wird dieses Projekt ausgeliefert.

Dies macht es einfacher, das Projekt zu unterstützen, wenn wir die Kontrolle über die Version von Nginx und andere Pakete haben, die das Projekt nutzt.

## Kann ich es auf einem Raspberry Pi ausführen?

Ja! Das Docker-Image ist Multi-Arch und wird für verschiedene Architekturen erstellt. Falls das Ihre nicht [aufgelistet](https://github.com/snxRCS/better-npm/pkgs/container/better-npm) ist, eröffnen Sie ein [GitHub Issue](https://github.com/snxRCS/better-npm/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=).

## Ich kann meinen Service nicht richtig proxyen?

Ihre beste Chance ist, die [Reddit-Community um Unterstützung zu bitten](https://www.reddit.com/r/nginxproxymanager/). Sicherheit in Zahlen.

## Wenn ich Benutzername und Passwort-Zugriffskontrolle zu einem Proxy-Host hinzufüge, kann ich mich nicht mehr in die App einloggen.

Eine Access Control List (ACL) mit Benutzername und Passwort erfordert, dass der Browser diesen Benutzernamen und dieses Passwort immer im `Authorization`-Header bei jeder Anfrage sendet. Wenn Ihre proxied App auch Authentifizierung erfordert (wie Better NPM selbst), wird die App höchstwahrscheinlich auch den `Authorization`-Header verwenden, um diese Informationen zu übertragen, da dies der standardisierte Header für diese Art von Informationen ist. Jedoch ist das Haben mehrerer gleicher Header im [Internet-Standard](https://www.rfc-editor.org/rfc/rfc7230#section-3.2.2) nicht erlaubt und fast alle Apps unterstützen keine mehrfachen Werte im `Authorization`-Header. Daher wird eines der beiden Logins unterbrochen. Dies kann nur behoben werden, indem eines der Logins entfernt wird oder indem die App geändert wird, um andere nicht-standardisierte Header für die Authentifizierung zu verwenden.
