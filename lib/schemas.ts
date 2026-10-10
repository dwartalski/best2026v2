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
  /** "imported" = tymczasowy szablon z /api/analyze; brak pola = szablon z data/templates.ts. */
  source: z.enum(["builtin", "imported"]).optional(),
});
export type MemeTemplate = z.infer<typeof MemeTemplateSchema>;

/** Id importu: u_<hash URL-a> dla linków, f_<hash pliku> dla wgranych plików. */
export const ImportIdSchema = z.string().regex(/^[uf]_[a-f0-9]{16,64}$/);

/** Szablon przysłany przez klienta: te same pola, ale z limitami długości, bo trafia do promptu. */
export const ImportedTemplateSchema = z.object({
  id: z.string().regex(/^import_[uf]_[a-f0-9]{16,64}$/),
  videoUrl: z.string().max(500),
  title: z.string().max(120),
  vibe: z.array(z.string().max(40)).min(1).max(8),
  originalText: z.string().min(1).max(300),
  textTemplate: z.string().min(1).max(300),
  source: z.literal("imported"),
});
export type ImportedTemplate = z.infer<typeof ImportedTemplateSchema>;

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
    mode: z.enum(["text", "video", "hybrid", "link"]),
    userInput: z.string().trim().max(200).optional(),
    templateId: z.string().optional(),
    customTemplate: ImportedTemplateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "link") {
      if (!value.customTemplate) {
        ctx.addIssue({
          code: "custom",
          path: ["customTemplate"],
          message: "Brak szablonu z analizy klipu.",
        });
      }
      return;
    }
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

// ---------- Import i analiza klipu z linku ----------

export const ImportRequestSchema = z.object({ url: z.string().trim().max(500) });

export const ImportResponseSchema = z.object({
  importId: ImportIdSchema,
  videoUrl: z.string(),
  caption: z.string(),
  author: z.string(),
  duration: z.number(),
});
export type ImportResponse = z.infer<typeof ImportResponseSchema>;

export const MAX_FRAMES = 5;

export const AnalyzeRequestSchema = z.object({
  importId: ImportIdSchema,
  frames: z
    .array(z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/).max(400_000))
    .min(1)
    .max(MAX_FRAMES),
  caption: z.string().max(2500),
  author: z.string().max(120).optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

/** Odpowiedź modelu analizującego klatki klipu. */
export const ClipAnalysisSchema = z.object({
  vibe: z.array(z.string()),
  emotionSummary: z.string(),
  onScreenText: z.string().nullable(),
  originalText: z.string(),
  textTemplate: z.string(),
  confidence: z.enum(["high", "low"]),
});
export type ClipAnalysis = z.infer<typeof ClipAnalysisSchema>;

export const AnalyzeResponseSchema = z.object({
  template: ImportedTemplateSchema,
  analysis: ClipAnalysisSchema,
  cached: z.boolean(),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

export const ApiErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "UNSUPPORTED_PLATFORM",
  "LOGIN_REQUIRED",
  "CLIP_TOO_LONG",
  "CLIP_TOO_LARGE",
  "IMPORT_FAILED",
  "IMPORT_NOT_FOUND",
  "ANALYSIS_FAILED",
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
