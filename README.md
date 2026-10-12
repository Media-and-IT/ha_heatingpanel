# Heating Panel (Heizungssteuerung) für Home Assistant

Eigene Seite in der Home-Assistant-Seitenleiste, über die du deine Heizkörperthermostate
komplett per Oberfläche steuerst. Kein YAML, keine Automationen nötig.

- **Zonen**: je Raum oder je Heizkörper eine Zone, jeder Zone weist du ein oder mehrere Thermostate zu.
- **Zeitplan-Modus**: pro Wochentag 5 aneinandergrenzende Zeitfenster. Das erste und das letzte bilden
  zusammen die Nacht und teilen sich eine Temperatur, es gibt also 4 Temperaturen pro Tag.
  Grenzen per Schieberegler verschieben, einen Tag per „Kopieren für“ auf andere Tage übertragen.
- **Manueller Modus**: eine oder mehrere Zonen für X Stunden auf eine feste Temperatur, danach gilt wieder der Zeitplan.
- **Urlaubsmodus**: Zonen bleiben auf einer festen Temperatur, bis du ihn ausschaltest.

## Installation über HACS

1. HACS öffnen, oben rechts „⋮“ → **Benutzerdefinierte Repositories**.
2. URL `https://github.com/Media-and-IT/ha_heatingpanel` eintragen, Typ **Integration**, hinzufügen.
3. „Heating Panel“ in HACS suchen und herunterladen.
4. Home Assistant neu starten.
5. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Heating Panel**.
6. In der Seitenleiste erscheint der Eintrag **Heizung**.

## Bedienung

1. **Zone hinzufügen**, Namen vergeben, unter **Thermostate** die passenden `climate`-Entitäten anhaken.
2. Zeitplan einstellen: Montag aufklappen, Grenzen ziehen (15-Minuten-Raster), Temperaturen wählen.
3. Über **Kopieren für** z. B. „Arbeitstage“ wählen, **Kopieren**, dann **Speichern**.

Der Regler **Woche** unten verschiebt eine Grenze an allen Tagen gleichzeitig um denselben Betrag.
Unterschiedliche Zeiten (z. B. Wochenende) bleiben dabei erhalten.
Am Rechner lassen sich die Griffe auch per Tastatur bewegen (Pfeiltasten, mit Umschalt in Stundenschritten).

## Wie geregelt wird

- Ein Tag im Zeitplan läuft von **05:00 bis 05:00** am Folgetag. Die Nacht gehört also zum Vorabend.
- Vorrang: **Manuell** vor **Urlaub** vor **Zeitplan**. Ein manueller Boost im Urlaubsmodus
  fällt nach Ablauf wieder auf die Urlaubstemperatur zurück.
- Die Integration prüft jede Minute und sendet eine Temperatur **nur, wenn sich das Ziel der Zone ändert**
  (und nach einem Neustart). Wer am Thermostat selbst dreht, behält seinen Wert bis zum nächsten Wechsel.
- Thermostate im Modus **Aus** werden nicht angefasst (z. B. im Sommer). Sobald sie wieder an sind,
  bekommen sie die aktuelle Zieltemperatur.
- Nicht erreichbare Thermostate werden jede Minute erneut versucht.
- Die Zieltemperatur wird auf `min_temp`/`max_temp` des Thermostats begrenzt.

## Aktionen für Automationen

Für z. B. „Urlaubsmodus an, wenn alle weg sind“ gibt es diese Aktionen (Zonen per Name, leer = alle Zonen):

| Aktion | Felder |
| --- | --- |
| `heatingpanel.set_vacation` | `zones`, `temperature` |
| `heatingpanel.clear_vacation` | `zones` |
| `heatingpanel.set_manual` | `zones`, `temperature`, `hours` |
| `heatingpanel.clear_manual` | `zones` |

## Entwicklung

Aufbau:

- `custom_components/heatingpanel/` ist die Integration (Python): Speicherung der Zonen in
  `.storage/heatingpanel`, Minutentakt, Websocket-API für das Panel, Aktionen.
- `custom_components/heatingpanel/frontend/heatingpanel-panel.js` ist das Panel, ein Web Component ohne Build-Schritt.

Tests (Python 3.13):

```bash
pip install -r requirements_test.txt
pip install home-assistant-frontend==<Version aus homeassistant/components/frontend/manifest.json>
python -m pytest -q
```
