import type { MemeTemplate } from "@/lib/schemas";

// originalText i textTemplate przepisujemy z prawdziwego mema dla danego klipu.
// Stałe słowa w textTemplate (poza [SLOTAMI]) są egzekwowane przez lib/verify.ts.
export const templates: MemeTemplate[] = [
  {
    id: "speed_reaction",
    videoUrl: "/templates/speed_reaction.mp4",
    title: "Oburzona reakcja",
    vibe: ["hipokryzja", "oburzenie", "szok", "przesada"],
    originalText:
      "how parents who drink 20 coffees a day react when you buy an energy drink",
    textTemplate: "how [GROUP] who [ACTION 1] react when you [ACTION 2]",
    faceKeyframes: [
      { t: 0, x: 0.5, y: 0.36, scale: 0.17, rotation: 0 },
      { t: 4, x: 0.52, y: 0.34, scale: 0.19, rotation: 0.05 },
      { t: 10, x: 0.5, y: 0.36, scale: 0.17, rotation: 0 },
    ],
  }
];

export const templateById = new Map(templates.map((t) => [t.id, t]));
