# Se, Lyssna, agera. 2026

Separat anmälningssida för S:t Eliyo Scoutkår.

## Aktivitet

- Datum: 24–25 oktober 2026
- Tid: 24 oktober 08:30 – 25 oktober 13:00
- Plats: Färna 3, 730 30 Kolsva, Köping
- Pris: 300 kr
- Grupper: Spårare och Upptäckare
- Swish: 123 184 1493

## Filer

- `index.html` – publik GitHub Pages-sida
- `Code.gs` – Apps Script-backend
- `Index.html` – enkel statusvy för Apps Script

## Google Sheet

Backenden använder samma kalkylark som övriga aktiviteter men skapar/använder ett eget blad:

`Se, Lyssna, agera 2026`

## Aktivering

1. Skapa ett nytt Google Apps Script-projekt.
2. Lägg in hela `Code.gs`.
3. Skapa en HTML-fil som heter `Index` och klistra in hela `Index.html`.
4. Kör `setupActivity()` en gång och godkänn behörigheterna.
5. Deploy → New deployment → Web app.
6. Kör som: Me.
7. Åtkomst: Anyone.
8. Kopiera den publicerade `/exec`-länken.
9. Ersätt `PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE` i GitHub-filens `index.html` med den länken.
10. Aktivera GitHub Pages från branch `main` / root.
