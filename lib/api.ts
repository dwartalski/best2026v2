import { characters } from "@/data/characters";
import { demoResponses } from "@/data/demoResponses";
import { matchCharacter } from "@/lib/matchCharacter";
import type { z } from "zod";
import {
  AnalyzeResponseSchema,
  ApiErrorSchema,
  GenerateResponseSchema,
  ImportResponseSchema,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type GenerateRequest,
  type GenerateResponse,
  type ImportResponse,
} from "@/lib/schemas";

const OFFLINE_DEMO = process.env.NEXT_PUBLIC_OFFLINE_DEMO === "1";

function offlineResponse(request: GenerateRequest): GenerateResponse {
  const matched = request.userInput ? matchCharacter(request.userInput, characters) : null;
  const response =
    request.mode === "link"
      ? undefined
      : request.mode === "text"
        ? demoResponses.find((demo) => demo.characterId === matched?.id)
        : demoResponses.find((demo) => demo.templateId === request.templateId);
  if (!response) {
    throw new Error("Tryb offline: dla tego wyboru nie ma zapisanej odpowiedzi.");
  }
  return response;
}

async function postJson<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.");
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const apiError = ApiErrorSchema.safeParse(data);
    throw new Error(
      apiError.success ? apiError.data.error.message : "Coś poszło nie tak. Spróbuj ponownie.",
    );
  }
  return schema.parse(data);
}

export async function requestMeme(request: GenerateRequest): Promise<GenerateResponse> {
  if (OFFLINE_DEMO) return offlineResponse(request);
  return postJson("/api/generate", request, GenerateResponseSchema);
}

export function requestImport(url: string): Promise<ImportResponse> {
  return postJson("/api/import", { url }, ImportResponseSchema);
}

export function requestAnalysis(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  return postJson("/api/analyze", request, AnalyzeResponseSchema);
}
