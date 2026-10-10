# Twarze postaci

Pliki PNG z przezroczystym tłem, nazwane jak `faceImageUrl` w `data/characters.ts`:
`napoleon.png`, `henry_viii.png`, `cleopatra.png`, `caesar.png`, `copernicus.png`.

- Źródło: portret z pola `portraitSource` (Wikimedia Commons, domena publiczna).
- Kadr: sama głowa (z włosami / nakryciem głowy), twarz na wprost, oczy poziomo,
  bez marginesów wokół. Wysokość ok. 512-1024 px.
- Wycinanie: `python scripts/cut_face.py portret.jpg public/faces/napoleon.png`
  (wymaga `pip install rembg pillow`) albo remove.bg, potem ręczne przycięcie.

Dopóki pliku nie ma, aplikacja rysuje zastępczy owal z imieniem postaci.
