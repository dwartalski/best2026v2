# HestoReels

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

## Tryb "Wklej link" i hosting

Tryb pobiera klip z Instagram Reels, TikToka lub YouTube Shorts przez `yt-dlp`
(paczka `youtube-dl-exec`) i skleja ścieżki FFmpegiem z paczki `ffmpeg-static`.
`npm install` pobiera do `bin/` samodzielną binarkę yt-dlp (`scripts/setup-ytdlp.mjs`):
ma wbudowane curl_cffi, bez którego TikTok odrzuca zapytania, i nie wymaga Pythona.

- Działa lokalnie oraz na hostingu z prawdziwym serwerem Node: Railway, Render, VPS.
- **Nie działa na Vercelu** (limity rozmiaru i czasu funkcji, brak trwałego dysku). Na Vercelu
  dalej działają pozostałe tryby oraz "albo wgraj plik", bo wgrany klip w ogóle nie
  trafia na serwer: klatki wyciąga przeglądarka.
- Instagram często wymaga logowania. Wyeksportuj cookies do pliku (format Netscape)
  i wskaż go w `IG_COOKIES_PATH`.
- Limity: 30 s, 50 MB, bez playlist. Pobrane klipy leżą w `IMPORTS_DIR`
  (domyślnie katalog tymczasowy systemu), cache analiz i generacji w `data/cache/`.

## Struktura

```
app/
  api/generate/route.ts      POST: źródła -> LLM -> weryfikacja -> JSON (+ tryb link, cache)
  api/import/route.ts        POST { url }: walidacja domeny, yt-dlp, metadane
  api/imports/[id]/route.ts  GET: wydaje pobrany klip (z obsługą Range)
  api/analyze/route.ts       POST: klatki + caption -> tymczasowy szablon (cache po importId)
  page.tsx                   stan aplikacji i układ ekranu
components/                  ModeSwitch, TemplateGrid, GeneratorForm, LinkPanel,
                             StageProgress, MemePreview, ContextSheet
data/                        templates.ts, characters.ts, demoResponses.ts, cache/ (gitignore)
lib/
  schemas.ts                 typy + schematy zod
  matchCharacter.ts          temat -> postać po keywords
  sources.ts                 kuratorskie fakty + Wikipedia, identyfikatory S1, S2...
  prompt.ts                  prompt systemowy generowania mema
  analyzePrompt.ts           prompt systemowy analizy klipu
  llm.ts                     wywołania Claude (structured output, obrazy)
  verify.ts                  sourceId, dosłowne cytaty, URL-e, struktura szablonu
  fileCache.ts               cache w pamięci + plik JSON
  importLimits.ts            dozwolone domeny i limity klipu (wspólne dla serwera i klienta)
  importStore.ts             pobieranie yt-dlp, mapowanie błędów, pliki importów
  extractFrames.ts           5 klatek JPEG <= 512 px + detekcja twarzy (przeglądarka)
  linkPipeline.ts            pobranie/plik -> klatki -> analiza (przeglądarka)
  api.ts                     klient endpointów
  faceTracker.ts             MediaPipe FaceLandmarker, wybór twarzy, wygładzanie, keyframes
  faceSticker.ts             PNG twarzy -> naklejka z białym obrysem
  drawFrame.ts               jedna funkcja rysująca klatkę (podgląd i eksport)
  exportVideo.ts             captureStream + audio + MediaRecorder
scripts/                     setup-mediapipe.mjs, setup-ytdlp.mjs, cut_face.py
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
- [ ] "Wklej link": po jednym linku z YouTube Shorts, TikToka i Instagrama; "Generuj w locie"
      przechodzi wszystkie etapy; drugi raz ten sam link nie woła LLM (cache).
- [ ] Wgranie pliku (mp4/mov z telefonu), klip z kilkoma twarzami (tapnięcie wybiera),
      klip bez twarzy (ręczne ustawienie wklejki).

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
- [ ] `ANTHROPIC_API_KEY` (i zalecane `WIKIPEDIA_USER_AGENT`) ustawione na hostingu.
- [ ] Jeśli demo ma pokazywać "Wklej link": hosting to Railway/Render albo laptop, nie Vercel.
