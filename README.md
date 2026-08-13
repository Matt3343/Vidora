# Vidora 1.5 – Vercel

V1.5 behebt die fehlerhafte Annahme aus V1.4, dass ein einzelner fehlender
Invidious-Endpunkt eine komplette Instanz unbrauchbar macht.

## Instanzdiagnose

Für jede Instanz werden separat geprüft:

- Website `/`
- `/api/v1/stats`
- `/api/v1/search`
- `/api/v1/trending`

Eine Instanz wird als **API nutzbar** betrachtet, wenn mindestens einer der
API-Endpunkte erfolgreich antwortet. Die Ergebnisse werden im Instanzmenü
sichtbar angezeigt.

## Automatische Suche

"🔍 Instanzen automatisch suchen" liest die offizielle Invidious-Instanzliste
und prüft die dort gefundenen Instanzen. Die offizielle Liste ist bewusst die
Quelle, statt beliebige URLs aus dem Web zu übernehmen.

## Deployment

Gesamten Ordner auf Vercel deployen. Keine `vercel.json`, kein `npm start`.

`/api/health` kann zum Testen des Deployments verwendet werden.

## Hinweis

Eine funktionierende Invidious-Webseite beweist nicht, dass jeder API-Endpunkt
oder das Embedding funktioniert. Genau deshalb zeigt V1.5 die einzelnen
Fähigkeiten separat an.
