import type { Character } from "@/lib/schemas";

/** Małe litery, bez znaków diakrytycznych (ł obsługiwane osobno, bo NFD go nie rozkłada). */
export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Dopasowanie tematu do postaci po keywords. Wygrywa najdłuższe trafione słowo kluczowe. */
export function matchCharacter(
  topic: string,
  candidates: Character[],
): Character | null {
  const haystack = normalizeForMatch(topic);
  let best: { character: Character; length: number } | null = null;

  for (const character of candidates) {
    for (const keyword of character.keywords) {
      const needle = normalizeForMatch(keyword);
      if (haystack.includes(needle) && needle.length > (best?.length ?? 0)) {
        best = { character, length: needle.length };
      }
    }
  }
  return best?.character ?? null;
}
