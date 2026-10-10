import { z } from "zod";

// ---------- Dane statyczne (szablony i postacie) ----------

/**
 * Ręczna klatka kluczowa pozycji twarzy. Wszystko znormalizowane względem
 * klatki wideo: x/y to środek twarzy (0..1), scale to odległość między oczami
 * jako ułamek szerokości klatki, rotation to kąt linii oczu w radianach.
 */
export const FaceKeyframeSchema = z.object({
  t: z.number().min(0),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().positive(),
  rotation: z.number(),
});
export type FaceKeyframe = z.infer<typeof FaceKeyframeSchema>;

export const MemeTemplateSchema = z.object({
  id: z.string(),
  videoUrl: z.string(),
  title: z.string(),
  vibe: z.array(z.string()).min(1),
  originalText: z.string(),
  textTemplate: z.string(),
  faceKeyframes: z.array(FaceKeyframeSchema).optional(),
});
export type MemeTemplate = z.infer<typeof MemeTemplateSchema>;

export const CharacterFactSchema = z.object({
  text: z.string(),
  sourceTitle: z.string(),
  sourceUrl: z.url(),
});
export type CharacterFact = z.infer<typeof CharacterFactSchema>;

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  era: z.string(),
  faceImageUrl: z.string(),
  portraitSource: z.url(),
  keywords: z.array(z.string()).min(1),
  wikipediaTitle: z.object({ pl: z.string(), en: z.string() }),
  facts: z.array(CharacterFactSchema).min(3).max(5),
});
export type Character = z.infer<typeof CharacterSchema>;

// ---------- API ----------

export const GenerateRequestSchema = z
  .object({
    mode: z.enum(["text", "video", "hybrid"]),
    userInput: z.string().trim().max(200).optional(),
    templateId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode !== "video" && !value.userInput) {
      ctx.addIssue({
        code: "custom",
        path: ["userInput"],
        message: "Podaj temat lub kontekst.",
      });
    }
    if (value.mode !== "text" && !value.templateId) {
      ctx.addIssue({
        code: "custom",
        path: ["templateId"],
        message: "Wybierz szablon.",
      });
    }
  });
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type GenerateMode = GenerateRequest["mode"];

/** Surowa odpowiedź modelu. URL-i tu celowo nie ma: dokleja je backend. */
export const LlmOutputSchema = z.object({
  insufficientSources: z.boolean(),
  templateId: z.string(),
  characterId: z.string(),
  memeText: z.string(),
  shortContext: z.string(),
  evidence: z.array(
    z.object({
      claim: z.string(),
      sourceId: z.string(),
      quote: z.string(),
    }),
  ),
});
export type LlmOutput = z.infer<typeof LlmOutputSchema>;

export const MemeSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.url(),
  quote: z.string(),
});
export type MemeSource = z.infer<typeof MemeSourceSchema>;

export const GenerateResponseSchema = z.object({
  templateId: z.string(),
  characterId: z.string(),
  memeText: z.string(),
  shortContext: z.string(),
  sources: z.array(MemeSourceSchema),
  insufficientSources: z.boolean(),
});
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

export const ApiErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "CHARACTER_NOT_FOUND",
  "TEMPLATE_NOT_FOUND",
  "VERIFICATION_FAILED",
  "LLM_ERROR",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({ code: ApiErrorCodeSchema, message: z.string() }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
