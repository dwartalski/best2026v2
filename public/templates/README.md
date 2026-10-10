# Klipy szablonów

Pliki `.mp4` nazwane jak `videoUrl` w `data/templates.ts`:
`speed_reaction.mp4`, `dafoe_looking_up.mp4`, `side_eye.mp4`.

- Pionowe 9:16 (np. 720x1280), maks. ok. 10 s, H.264 + AAC (działa w Chrome i Safari).
- Jedna wyraźna twarz w kadrze przez większość klipu.
- Po dodaniu klipu sprawdź `faceKeyframes` w `data/templates.ts`: to awaryjna
  pozycja twarzy, gdy MediaPipe jej nie wykryje.
