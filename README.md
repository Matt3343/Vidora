# Vidora 1.2

## Start
Node.js 18+ (empfohlen Node.js 20+):

```bash
npm install
npm start
```

Dann http://localhost:3000 öffnen.

## Was in 1.2 geändert wurde

- Der Instanz-Test behandelt HTTP 404 nicht mehr als Fehler beim Hinzufügen.
- Es werden mehrere Health-/Kompatibilitätstests versucht.
- Eine Instanz wird immer erst gespeichert und danach getestet.
- Eine momentan nicht erreichbare Instanz kann trotzdem in der Liste bleiben.
- Automatisches Failover bleibt aktiv.
- Suche, Trends und Video-Details wechseln bei einem API-Fehler automatisch zur nächsten Instanz.
- Der Player verwendet die Instanz, die die Videodaten erfolgreich geliefert hat.

## Instanzen

Über ⚙ können Instanzen hinzugefügt, getestet und entfernt werden.

Beispiel:

https://inv.nadeko.net

Öffentliche Invidious-Instanzen können jederzeit ausfallen oder API-Endpunkte ändern. Kein öffentliches Instanzverzeichnis kann daher eine dauerhafte Verfügbarkeit garantieren.
