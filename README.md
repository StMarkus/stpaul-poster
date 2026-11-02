# Kursposter-Generator – Online-Kurs Evangelisation

Erstellt jedes Jahr die deutschen Ankündigungen für den Online-Kurs Evangelisation (St. Paul Coptic Service / SPIMS): Kursinfos und „Anmeldung startet bald“ als JPG/PNG, dazu drei animierte Poster als GIF und MP4.
Anpassbar sind Anmeldezeitraum, Kursangebot (beliebig viele Kurse), Bibelverse und alle übrigen Texte.

## Passwortschutz

Die Seite ist **verschlüsselt**. Öffentlich (im Repo und auf GitHub Pages) liegen nur:

- `index.html`: Anmeldeseite, entschlüsselt den Generator im Browser
- `app.bin`: der komplette Generator (Code und Hintergrundbilder), AES-256-GCM-verschlüsselt, Schlüssel per PBKDF2-SHA256 (600.000 Runden) aus dem Passwort
- `fonts.css`, `assets/fonts/`: frei lizenzierte Schriften (SIL OFL)
- `tools/encrypt.mjs`, `vendor-src/`: Build-Werkzeuge

Der unverschlüsselte Generator liegt in `src/` und steht in `.gitignore`. **`src/` niemals committen.** Bewahre den Ordner sicher auf (z. B. Synology); ohne ihn lässt sich der Generator nicht mehr ändern.

### Passwort setzen oder ändern

```sh
node tools/encrypt.mjs        # fragt das Passwort ab (Node 18+), schreibt app.bin
git add app.bin && git commit -m "Generator aktualisiert" && git push
```

Nach einer Passwortänderung müssen sich alle neu anmelden, auch wer „angemeldet bleiben“ gewählt hatte.
Wichtig: Es gibt ein gemeinsames Passwort für alle. Wer es kennt, kann es weitergeben. Bei Bedarf einfach ein neues setzen.

## Änderungen am Generator

1. Lokal starten: `python3 -m http.server 8000`, dann `http://localhost:8000/src/` öffnen (unverschlüsselte Entwicklerversion).
2. In `src/` ändern:
   - `templates.js`: Layout der Vorlagen. Statische Vorlagen in 1080er Koordinaten, animierte in 368er Koordinaten.
   - `app.js`: Oberfläche, Standardwerte (`DEFAULTS`) und Export (GIF über gifenc, MP4 über WebCodecs + mp4-muxer).
   - `bg/`: Hintergründe.
3. `node tools/encrypt.mjs` ausführen, `app.bin` committen und pushen.

`src/vendor.js` neu bauen: `cd vendor-src && npm install && npm run build`.

## GitHub Pages

Settings → Pages → „Deploy from a branch“ → `main` / `(root)`.
MP4-Export braucht einen aktuellen Chrome-, Edge- oder Safari-Browser; GIF und JPG gehen überall.
