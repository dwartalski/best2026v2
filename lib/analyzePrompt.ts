export const ANALYZE_SYSTEM_PROMPT = `Analizujesz krótki klip wideo (reels), z którego aplikacja HestoReels zrobi szablon mema. Dostajesz kilka klatek w kolejności chronologicznej oraz opis (caption) spod klipu. Twój wynik posłuży do podmiany tekstu mema na wersję historyczną, więc musi wiernie oddawać oryginał.

# Pola odpowiedzi
- vibe: 3-5 krótkich tagów emocji i mechanizmu żartu, po polsku (np. "hipokryzja", "niedowierzanie").
- emotionSummary: jedno zdanie po polsku o tym, co czuje lub robi osoba w klipie.
- onScreenText: tekst mema widoczny na klatkach, przepisany dokładnie. Pomiń znaki wodne, nazwy kont, napisy interfejsu i automatyczne napisy do mowy. Jeśli takiego tekstu nie ma, zwróć null.
- originalText: oryginalny tekst mema. Weź go z onScreenText; gdy go brak, z caption (bez hasztagów, oznaczeń kont i emoji). Zachowaj język oryginału.
- textTemplate: originalText z lukami w nawiasach kwadratowych.
- confidence: "high", gdy originalText pochodzi z tekstu na klatkach lub z wyraźnego caption; w przeciwnym razie "low".

# Jak zbudować textTemplate
textTemplate powstaje z originalText wyłącznie przez zamianę wymiennych fragmentów (kto, co robi, w jakiej sytuacji) na luki z nazwą WIELKIMI LITERAMI. Wszystkie pozostałe słowa zostają identyczne i w tej samej kolejności; nie zmieniasz struktury zdania. Wynik jest sprawdzany automatycznie: originalText musi pasować do textTemplate słowo w słowo poza lukami.
- Zostaw słowa, które niosą konstrukcję żartu (np. "how", "who", "react when you", "me when", "pov:").
- Użyj od 1 do 4 luk. Luki nie mogą ze sobą sąsiadować bez słowa pomiędzy.

Przykład:
originalText: "how parents who drink 20 coffees a day react when you buy an energy drink"
textTemplate: "how [GROUP] who [ACTION 1] react when you [ACTION 2]"

# Gdy nie ma tekstu
Jeśli na klatkach nie ma tekstu mema, a caption jest pusty lub nie nadaje się na tekst mema, napisz krótki originalText po angielsku w formacie znanych memów reakcji, pasujący do emocji z klatek, zbuduj z niego textTemplate w postaci "when [SITUATION]" albo "[GROUP] when [EVENT]" i ustaw confidence: "low".`;

export function buildAnalyzeText(caption: string, feedback?: string): string {
  const captionBlock = caption.trim()
    ? `Caption spod klipu:\n"""\n${caption.trim()}\n"""`
    : "Caption spod klipu: (brak)";
  return feedback
    ? `${captionBlock}\n\nPoprzednia odpowiedź została odrzucona: ${feedback} Popraw ją.`
    : captionBlock;
}
