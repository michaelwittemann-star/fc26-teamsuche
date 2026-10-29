# FC 26 Teamsuche

Website, die Mannschaften aus EA FC 26 (Online-Saisons) danach findet, welche Spielertypen im Kader stehen.
Beispiel: alle Teams mit 2 Stürmern mit Tempo > 90, 3 Flügelspielern mit Dribbling > 80 und einem Innenverteidiger ab 198 cm.

- Beliebig viele **Spielerprofile**: Mindestanzahl, Positionen (alle, die der Spieler spielen kann, oder nur die Hauptposition) und beliebig viele Wertebedingungen (Hauptwerte, alle Einzelattribute, Größe, Alter, Gesamtstärke, Technik-Sterne, schwacher Fuß).
- Jeder Spieler zählt nur für **ein** Profil (bipartites Matching), damit „2 Stürmer + 3 Flügel“ wirklich 5 verschiedene Spieler bedeutet.
- Ergebnistabelle mit Sternen, GES/ANG/MIT/ABW und den passenden Spielern; Klick auf den Teamnamen zeigt Standardaufstellung auf dem Feld und den ganzen Kader (Klick auf Spieler = alle Werte).
- Filter: Vereine / Nationalteams / Frauen, Sterne von–bis, Team-/Ligasuche, „nur Startelf“.
- Die Suche steht in der URL und lässt sich als Link teilen.

## Daten

Quelle ist [fifacm.com](https://www.fifacm.com/26/teams), letztes FC-26-Kader-Update (23.06.2026). FC 26 wird nicht mehr aktualisiert, ein einmaliger Abruf reicht.

| Schritt | Befehl | Ergebnis |
|---|---|---|
| Abrufen (fortsetzbar, ~1 Seite/s, mehrere Stunden) | `npm run scrape` | `data/raw/` (teams.json, team/*.json, players.jsonl) |
| Aufbereiten | `npm run data` | `public/data/fc26.json` |

- **Hauptwerte** (Tempo, Schießen, …) berechnet `build_data.py` aus den Einzelwerten mit den EA-Gewichten. Die Gewichte sind an 1.380 Spielern der offiziellen EA-Ratings-Datenbank geprüft, ohne Abweichung (Rundung: kaufmännisch).
- **Sterne** gibt es in keiner Quelle; sie werden aus der Team-Gesamtwertung geschätzt: 5★ ab 83, darunter je 4 Punkte eine halbe Stufe. Geprüft an den veröffentlichten Release-Sternen (z. B. 5★ für Lombardia FC 84 / Bayern 83, 4,5★ für Atlético 82 bis Leverkusen 80, 4★ für Teams mit 77–78). An den Grenzen kann das Spiel einen halben Stern abweichen.
- robots.txt von fifacm sperrt nur gefilterte Spielerlisten (`/players/*?*`); Team- und Spielerseiten sind erlaubt.

## Entwicklung

```
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
```
