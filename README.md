# Vidora 1.4 – Vercel

Diese Version ist für direktes Deployment auf Vercel gedacht.

## Deployment

Den gesamten Ordner als Vercel-Projekt deployen. Keine lokale Node.js-App und kein `npm start` nötig.

Die Vercel Functions liegen unter `api/`.

## Neue Funktion

Im Instanzmenü gibt es:

**🔍 Instanzen automatisch suchen**

Vidora fragt mehrere öffentliche Instanzlisten ab, sammelt gefundene URLs und testet sie gegen mehrere Invidious-v1-Endpunkte. Nur kompatible Instanzen werden automatisch zur Liste hinzugefügt.

404/5xx bei einer Instanz werden beim eigentlichen API-Aufruf als Failover behandelt.

## Hinweis

Öffentliche Invidious-Instanzen ändern sich häufig. Die automatische Suche ist deshalb bewusst dynamisch und nutzt mehrere Quellen. Der Video-Embed wird weiterhin von der ausgewählten Invidious-Instanz geladen; wenn diese Embeds blockiert, kann der Player selbst trotz funktionierender API nicht angezeigt werden.
