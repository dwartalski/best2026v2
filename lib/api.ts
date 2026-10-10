import { characters } from "@/data/characters";
import { demoResponses } from "@/data/demoResponses";
import { matchCharacter } from "@/lib/matchCharacter";
import {
  ApiErrorSchema,
  GenerateResponseSchema,
  type GenerateRequest,
  type GenerateResponse,
} from "@/lib/schemas";

const OFFLINE_DEMO = process.env.NEXT_PUBLIC_OFFLINE_DEMO === "1";

function offlineResponse(request: GenerateRequest): GenerateResponse {
  const matched = request.userInput ? matchCharacter(request.userInput, characters) : null;
  const response =
    request.mode === "text"
      ? demoResponses.find((demo) => demo.characterId === matched?.id)
      : demoResponses.find((demo) => demo.templateId === request.templateId);
  if (!response) {
    throw new Error("Tryb offline: dla tego wyboru nie ma zapisanej odpowiedzi.");
  }
  return response;
}

export async function requestMeme(request: GenerateRequest): Promise<GenerateResponse> {
  if (OFFLINE_DEMO) return offlineResponse(request);

  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
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
  return GenerateResponseSchema.parse(data);
}
