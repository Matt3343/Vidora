# Vidora 1.1

Node.js-Backend mit Invidious-Suche, Player, Instanzverwaltung und automatischem Failover.

## Start
Node.js 18+ (empfohlen 20+):
```bash
npm install
npm start
```
Dann http://localhost:3000 öffnen.

Die Instanzen können über ⚙ hinzugefügt, getestet und entfernt werden.
Beim Hinzufügen bleibt eine momentan nicht erreichbare Instanz gespeichert; sie kann später beim Failover wieder funktionieren.
