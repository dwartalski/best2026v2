import type { LlmOutput, MemeSource, MemeTemplate } from "@/lib/schemas";
import type { Source } from "@/lib/sources";

const MAX_QUOTE_WORDS = 25;
const MIN_QUOTE_WORDS = 3;
const URL_PATTERN = /(https?:\/\/|www\.)\S+/i;

export interface VerifyContext {
  sources: Source[];
  templates: MemeTemplate[];
  allowedCharacterIds: string[];
  /** Ustawione, gdy szablon wybrał użytkownik (tryby video i hybrid). */
  requiredTemplateId?: string;
}

export type VerifyResult =
  | { ok: true; sources: MemeSource[] }
  | { ok: false; errors: string[] };

/** Normalizacja do porównań: wielkość liter, białe znaki, warianty cudzysłowów i myślników. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[„”“‟"«»]/g, '"')
    .replace(/[‘’‚']/g, "'")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Slot-filling: stałe słowa z textTemplate muszą zostać na swoich miejscach,
 * a każdy [SLOT] musi być wypełniony niepustym tekstem.
 */
export function matchesTemplate(memeText: string, textTemplate: string): boolean {
  const pattern = textTemplate
    .split(/\[[^\]]+\]/)
    .map((literal) => {
      const words = escapeRegExp(normalizeText(literal)).replace(/ /g, "\\s+");
      return words ? `\\b${words}\\b` : "";
    })
    .join("\\s*(.+?)\\s*");
  return new RegExp(`^${pattern}$`).test(normalizeText(memeText));
}

export function verifyOutput(output: LlmOutput, context: VerifyContext): VerifyResult {
  const errors: string[] = [];
  const sourceById = new Map(context.sources.map((source) => [source.id, source]));

  const template = context.templates.find((t) => t.id === output.templateId);
  if (!template) {
    errors.push(`templateId "${output.templateId}" nie istnieje w bazie.`);
  } else if (
    context.requiredTemplateId &&
    template.id !== context.requiredTemplateId
  ) {
    errors.push(`templateId musi być równe "${context.requiredTemplateId}".`);
  }

  if (!context.allowedCharacterIds.includes(output.characterId)) {
    errors.push(
      `characterId "${output.characterId}" jest niedozwolone. Dozwolone: ${context.allowedCharacterIds.join(", ")}.`,
    );
  }

  if (template && !matchesTemplate(output.memeText, template.textTemplate)) {
    errors.push(
      `memeText nie zachowuje struktury szablonu "${template.textTemplate}". Zmieniaj wyłącznie fragmenty w nawiasach kwadratowych.`,
    );
  }

  for (const [field, value] of [
    ["memeText", output.memeText],
    ["shortContext", output.shortContext],
  ] as const) {
    if (!value.trim()) errors.push(`${field} jest puste.`);
    if (URL_PATTERN.test(value)) errors.push(`${field} nie może zawierać linków.`);
  }

  if (output.evidence.length === 0) {
    errors.push("Brak dowodów (evidence). Każdy fakt wymaga cytatu ze źródła.");
  }

  const verified: MemeSource[] = [];
  for (const item of output.evidence) {
    const source = sourceById.get(item.sourceId);
    if (!source) {
      errors.push(`Źródło "${item.sourceId}" nie istnieje na liście źródeł.`);
      continue;
    }
    if (source.characterId !== output.characterId) {
      errors.push(
        `Źródło ${source.id} dotyczy innej postaci niż "${output.characterId}".`,
      );
      continue;
    }

    const quote = normalizeText(item.quote);
    const wordCount = quote.split(" ").filter(Boolean).length;
    if (wordCount < MIN_QUOTE_WORDS || wordCount > MAX_QUOTE_WORDS) {
      errors.push(
        `Cytat z ${source.id} ma ${wordCount} słów; dozwolone ${MIN_QUOTE_WORDS}-${MAX_QUOTE_WORDS}.`,
      );
      continue;
    }
    if (!normalizeText(source.text).includes(quote)) {
      errors.push(
        `Cytat "${item.quote}" nie występuje dosłownie w źródle ${source.id}.`,
      );
      continue;
    }

    // Tytuł i URL bierzemy z naszej listy, nigdy z odpowiedzi modelu.
    verified.push({
      id: source.id,
      title: source.title,
      url: source.url,
      quote: item.quote.trim(),
    });
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, sources: verified };
}
