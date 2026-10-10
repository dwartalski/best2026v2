import type { Character, GenerateMode, LlmOutput, MemeTemplate } from "@/lib/schemas";
import type { Source } from "@/lib/sources";

export const SYSTEM_PROMPT = `Jesteś redaktorem aplikacji HestoReels. Aplikacja bierze oryginalny klip znanego mema, wkleja na twarz osoby w klipie twarz postaci historycznej i podmienia napis. Twoje zadanie: dobrać postać i szablon oraz napisać tekst mema i krótki kontekst historyczny. Humor pochodzi z szablonu, a fakty wyłącznie ze źródeł, które dostajesz w wiadomości.

# Źródła i fakty
Używaj tylko faktów z dostarczonych źródeł. Jeśli źródła nie wystarczą, zwróć insufficientSources: true zamiast zgadywać.
- Źródła mają identyfikatory [S1], [S2]... i są przypisane do konkretnej postaci. Korzystaj tylko ze źródeł postaci, którą wybierasz.
- Nie korzystaj z własnej wiedzy o historii, nawet jeśli jesteś pewien faktu. Aplikacja ma charakter edukacyjny i każdy fakt jest potem automatycznie sprawdzany względem tekstu źródła; fakt bez pokrycia powoduje odrzucenie całej odpowiedzi.
- Liczby, daty, imiona i nazwy przepisuj dokładnie tak, jak podaje źródło.
- Nie podawaj żadnych linków ani adresów URL. Linki dokleja backend.

# memeText: reguła slot-filling
Nie wymyślasz własnej struktury żartu. Każdy szablon ma originalText (oryginalny tekst mema) i textTemplate (ten sam tekst ze slotami w nawiasach kwadratowych).
- Przepisz textTemplate słowo w słowo i podmień wyłącznie sloty [W NAWIASACH]. Wszystkie słowa poza nawiasami zostają bez zmian i w tej samej kolejności.
- Sloty wypełniaj podmiotami, obiektami i akcjami wziętymi ze źródeł, tak jak w zabawie Mad Libs.
- Zachowaj język, rytm i długość originalText: małe litery, potoczny internetowy styl, bez kropki na końcu, bez emoji i hasztagów.
- Relacja między slotami ma odtwarzać mechanizm oryginalnego żartu (np. hipokryzję, spóźnione uświadomienie, niedowierzanie).

Przykład dla textTemplate "how [GROUP] who [ACTION 1] react when you [ACTION 2]":
originalText: "how parents who drink 20 coffees a day react when you buy an energy drink"
memeText dla Henryka VIII: "how kings who behead 2 wives react when you ask for a divorce"

# shortContext
1-2 zdania po polsku, które wprost wyjaśniają sytuację z żartu komuś, kto nie zna tej historii. Tylko fakty ze źródeł, bez komentarza i bez ocen.
Przykład: "Henryk VIII miał sześć żon, dwie skazał na ścięcie, a wcześniej zerwał z Rzymem, by uzyskać rozwód."

# Wybór postaci i szablonu
- templateId i characterId wybieraj wyłącznie z list podanych w wiadomości. Jeśli wiadomość narzuca któryś z nich, użyj dokładnie tej wartości.
- Gdy wybierasz sam, dopasuj emocje (pole vibe szablonu) do wydarzenia z życia postaci, które jest opisane w źródłach.

# evidence
Dla każdego faktu użytego w memeText lub shortContext dodaj wpis:
- claim: fakt własnymi słowami, po polsku,
- sourceId: identyfikator źródła, z którego pochodzi,
- quote: dosłowny, ciągły fragment tekstu tego źródła (3-20 słów), skopiowany znak po znaku, bez skrótów, wielokropków i poprawek.
Fakt, którego nie potrafisz podeprzeć takim cytatem, usuń z memeText i shortContext.

# Gdy źródła nie wystarczą
Jeśli ze źródeł nie da się uczciwie wypełnić szablonu, zwróć insufficientSources: true, puste memeText i shortContext oraz pustą listę evidence. Pola templateId i characterId wypełnij najlepszym kandydatem.`;

interface PromptInput {
  mode: GenerateMode;
  userInput?: string;
  templates: MemeTemplate[];
  characters: Character[];
  sources: Source[];
  requiredTemplateId?: string;
}

function describeTask({ mode, userInput, characters, requiredTemplateId }: PromptInput): string {
  const forcedCharacter = characters.length === 1 ? characters[0] : null;
  const lines: string[] = [];

  if (mode === "text") {
    lines.push(`Użytkownik podał temat: "${userInput}".`);
    lines.push("Wybierz szablon, którego vibe najlepiej pasuje do tego tematu.");
  } else if (mode === "video") {
    lines.push("Użytkownik wybrał klip i nie podał tematu.");
    lines.push(
      "Odczytaj vibe szablonu i dobierz postać oraz wydarzenie historyczne, które pasują do tych emocji.",
    );
  } else if (mode === "link" && !userInput) {
    lines.push("Użytkownik zaimportował własny klip i nie podał tematu.");
    lines.push(
      "Odczytaj vibe szablonu i dobierz postać oraz wydarzenie historyczne, które pasują do tych emocji.",
    );
  } else {
    lines.push(`Użytkownik wybrał klip i podał luźny kontekst: "${userInput}".`);
    lines.push("Dobierz postać pasującą do kontekstu i połącz ją z klipem.");
  }

  if (requiredTemplateId) lines.push(`templateId musi być równe "${requiredTemplateId}".`);
  if (forcedCharacter) lines.push(`characterId musi być równe "${forcedCharacter.id}".`);
  return lines.join("\n");
}

export function buildUserPrompt(input: PromptInput): string {
  const templates = input.templates
    .map(
      (t) =>
        `- id: ${t.id}\n  vibe: ${t.vibe.join(", ")}\n  originalText: "${t.originalText}"\n  textTemplate: "${t.textTemplate}"`,
    )
    .join("\n");

  const characters = input.characters
    .map((c) => `- id: ${c.id} (${c.name}, ${c.era})`)
    .join("\n");

  const sources = input.sources
    .map((s) => `[${s.id}] postać: ${s.characterId} | ${s.title}\n${s.text}`)
    .join("\n\n");

  return `# Zadanie
${describeTask(input)}

# Dostępne szablony
${templates}

# Dostępne postacie
${characters}

# Źródła
${sources}`;
}

/** Druga próba: model dostaje swoją odrzuconą odpowiedź i listę błędów weryfikacji. */
export function buildRetryPrompt(
  basePrompt: string,
  previous: LlmOutput,
  errors: string[],
): string {
  return `${basePrompt}

# Poprzednia próba została odrzucona
Twoja poprzednia odpowiedź:
${JSON.stringify(previous, null, 2)}

Automatyczna weryfikacja zgłosiła błędy:
${errors.map((error) => `- ${error}`).join("\n")}

Popraw odpowiedź. Cytaty kopiuj dosłownie z tekstu źródeł powyżej. Jeśli nie da się tego zrobić uczciwie, zwróć insufficientSources: true.`;
}
