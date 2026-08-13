# Vidora 1.3 – Vercel Edition

Diese Version ist für ein Vercel-Projekt gedacht. Das Frontend liegt in `index.html`, die Backend-Endpunkte liegen unter `api/` und werden von Vercel als Functions ausgeführt.

Vercel unterstützt Node.js Functions direkt; die API-Dateien werden daher serverseitig ausgeführt und nicht im Browser. Die Konfiguration verwendet Node.js 24.

## Deployment

1. ZIP entpacken.
2. Den Inhalt als neues Vercel-Projekt deployen oder mit GitHub verbinden.
3. Keine `npm start`-Ausführung nötig.
4. Danach die `*.vercel.app`-URL öffnen.

## Wichtig

Die Instanzliste wird pro Browser in einem Cookie gespeichert, weil Vercel Functions nicht als dauerhafter Node-Prozess laufen.

Die öffentlichen Invidious-Instanzen können jederzeit ausfallen oder einzelne API-Endpunkte deaktivieren. Vidora behandelt HTTP-Fehler wie 404/5xx beim API-Aufruf als Failover-Signal und versucht die nächste Instanz.

## Lokaler Vercel-Test

Optional:

```bash
npm install -g vercel
vercel dev
```

