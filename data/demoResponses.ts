import type { GenerateResponse } from "@/lib/schemas";

// Odpowiedzi na tryb offline (NEXT_PUBLIC_OFFLINE_DEMO=1). Cytaty pochodzą
// dosłownie z kuratorskich faktów w data/characters.ts. Przed demo warto
// podmienić je na prawdziwe odpowiedzi zapisane z /api/generate.
export const demoResponses: GenerateResponse[] = [
  {
    templateId: "speed_reaction",
    characterId: "henry_viii",
    memeText: "how kings who behead 2 wives react when you ask for a divorce",
    shortContext:
      "Henryk VIII miał sześć żon, dwie z nich zostały ścięte, a gdy papież odmówił unieważnienia jego małżeństwa, zerwał z Rzymem.",
    sources: [
      {
        id: "S2",
        title: "Henryk VIII Tudor – Wikipedia",
        url: "https://pl.wikipedia.org/wiki/Henryk_VIII_Tudor",
        quote: "Dwie żony Henryka VIII zostały ścięte",
      },
      {
        id: "S3",
        title: "Akt supremacji – Wikipedia",
        url: "https://pl.wikipedia.org/wiki/Akt_supremacji",
        quote: "Gdy papież odmówił unieważnienia małżeństwa z Katarzyną Aragońską, Henryk VIII zerwał z Rzymem",
      },
    ],
    insufficientSources: false,
  },
  {
    templateId: "dafoe_looking_up",
    characterId: "napoleon",
    memeText:
      "napoleon realizing marching the grande armée into russia ends with a retreat from moscow",
    shortContext:
      "W 1812 roku Napoleon wyruszył z Wielką Armią na Rosję. Wyprawa zakończyła się katastrofalnym odwrotem spod Moskwy.",
    sources: [
      {
        id: "S2",
        title: "Inwazja na Rosję (1812) – Wikipedia",
        url: "https://pl.wikipedia.org/wiki/Inwazja_na_Rosj%C4%99_(1812)",
        quote: "wyprawa zakończyła się katastrofalnym odwrotem spod Moskwy",
      },
    ],
    insufficientSources: false,
  },
  {
    templateId: "side_eye",
    characterId: "copernicus",
    memeText:
      "the church in 1616 when copernicus's book says the earth goes around the sun",
    shortContext:
      "Kopernik opisał model, w którym Ziemia krąży wokół Słońca. W 1616 roku jego dzieło trafiło na kościelny indeks ksiąg zakazanych.",
    sources: [
      {
        id: "S1",
        title: "Mikołaj Kopernik – Wikipedia",
        url: "https://pl.wikipedia.org/wiki/Miko%C5%82aj_Kopernik",
        quote: "w którym Ziemia krąży wokół Słońca",
      },
      {
        id: "S4",
        title: "O obrotach sfer niebieskich – Wikipedia",
        url: "https://pl.wikipedia.org/wiki/O_obrotach_sfer_niebieskich",
        quote: "trafiło na kościelny indeks ksiąg zakazanych",
      },
    ],
    insufficientSources: false,
  },
];
