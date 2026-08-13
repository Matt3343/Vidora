# Vidora – Node.js + Invidious

## Voraussetzungen
- Node.js 18+ (empfohlen: Node.js 20+)

## Starten

```bash
npm install
npm start
```

Danach öffnen:
http://localhost:3000

## Was enthalten ist

- YouTube-artige Oberfläche
- Suche über Invidious
- Trends
- Video-Detailseite
- Invidious Embed-Player
- Node.js-Backend als Proxy (kein Browser-CORS-Problem zur Invidious-API)
- Verwaltung mehrerer Invidious-Instanzen
- Instanzen prüfen/löschen/hinzufügen
- automatisches Failover: schlägt eine Instanz fehl, probiert das Backend die nächste
- einfache Fehler- und Statusanzeige

## Standard-Instanzen

Die Liste steht in `server.js` ganz oben:

```js
let instances = [
  "https://inv.nadeko.net",
  "https://yewtu.be",
  "https://invidious.nerdvpn.de"
];
```

Du kannst sie dort dauerhaft ändern. Weitere Instanzen kannst du auch in der Weboberfläche hinzufügen.

Hinweis: Öffentliche Invidious-Instanzen können jederzeit offline gehen, Rate-Limits haben oder ihre API-Zugriffe ändern. Das Failover hilft bei Ausfällen, garantiert aber keine Verfügbarkeit.
