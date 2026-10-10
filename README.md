# MemeHistory

Edukacyjny generator memów wideo w stylu "face-paste edit": oryginalny klip mema,
wklejona twarz postaci historycznej, tekst wypełniony metodą slot-filling i krótki
kontekst historyczny z cytatami ze źródeł.

## Start

```bash
npm install            # postinstall kopiuje WASM MediaPipe i pobiera model do public/mediapipe
cp .env.example .env.local   # uzupełnij ANTHROPIC_API_KEY
npm run dev
```

Assety dodajesz ręcznie: klipy do `public/templates`, twarze PNG do `public/faces`
(instrukcje w README w tych folderach).

## Struktura

```
app/
  api/generate/route.ts   POST: źródła -> LLM -> weryfikacja -> JSON
  page.tsx                stan aplikacji i układ ekranu
components/               ModeSwitch, TemplateGrid, GeneratorForm, MemePreview, ContextSheet
data/                     templates.ts, characters.ts, demoResponses.ts (tryb offline)
lib/
  schemas.ts              typy + schematy zod
  matchCharacter.ts       temat -> postać po keywords
  sources.ts              kuratorskie fakty + Wikipedia, identyfikatory S1, S2...
  prompt.ts               prompt systemowy i wiadomość użytkownika
  llm.ts                  wywołanie Claude (structured output)
  verify.ts               sourceId, dosłowne cytaty, URL-e, struktura szablonu
  faceTracker.ts          MediaPipe FaceLandmarker, wygładzanie, fallback na keyframes
  faceSticker.ts          PNG twarzy -> naklejka z białym obrysem
  drawFrame.ts            jedna funkcja rysująca klatkę (podgląd i eksport)
  exportVideo.ts          captureStream + audio + MediaRecorder
scripts/                  setup-mediapipe.mjs, cut_face.py
```

## Checklista przed demo

Testy
- [ ] Chrome (desktop i Android) oraz Safari na iPhonie: podgląd gra, twarz trzyma się głowy.
- [ ] Eksport: pobrany plik ma dźwięk oryginału, pełną długość i wygląda jak podgląd
      (Safari zapisuje .mp4, starszy Chrome .webm).
- [ ] Brak twarzy w kadrze / twarz bokiem: wklejka przechodzi na `faceKeyframes`
      i nie skacze. Dla każdego klipu dopasuj keyframes ręcznie.
- [ ] Wszystkie 3 tryby, temat spoza bazy (komunikat zamiast mema), `insufficientSources`.
- [ ] "Zmień twarz" podmienia postać bez zapytania do API.
- [ ] Długi tekst mema: belka łamie linie i nie zasłania twarzy.

Assety
- [ ] Klipy: 9:16, do 10 s, H.264 + AAC, nazwy jak w `data/templates.ts`.
- [ ] Twarze: PNG z przezroczystym tłem, sama głowa, nazwy jak w `data/characters.ts`.
- [ ] `originalText` i `textTemplate` przepisane z prawdziwych memów dla tych klipów.

Brak internetu na sali
- [ ] `NEXT_PUBLIC_OFFLINE_DEMO=1` w `.env.local` i ponowny build: odpowiedzi idą
      z `data/demoResponses.ts` (podmień je wcześniej na zapisane odpowiedzi z API).
- [ ] MediaPipe działa lokalnie z `public/mediapipe` (sprawdź, że jest tam `face_landmarker.task`).
- [ ] Uruchom `npm run build && npm run start` na laptopie jako plan B dla Vercela.
- [ ] Nagraj wcześniej 2-3 gotowe memy jako plan C.

Wdrożenie
- [ ] `ANTHROPIC_API_KEY` (i zalecane `WIKIPEDIA_USER_AGENT`) ustawione w Vercelu.
