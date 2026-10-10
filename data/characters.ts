import type { Character } from "@/lib/schemas";

// keywords to rdzenie słów (bez końcówek fleksyjnych i bez polskich znaków),
// dopasowywane jako podciągi tematu: "kleopatr" łapie "Kleopatra", "Kleopatry".
export const characters: Character[] = [
  {
    id: "napoleon",
    name: "Napoleon Bonaparte",
    era: "1769–1821, Francja",
    faceImageUrl: "/faces/napoleon.png",
    portraitSource:
      "https://commons.wikimedia.org/wiki/File:Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg",
    keywords: ["napoleon", "bonaparte", "waterloo", "wielka armia", "elba"],
    wikipediaTitle: { pl: "Napoleon Bonaparte", en: "Napoleon" },
    facts: [
      {
        text: "Napoleon koronował się na cesarza Francuzów 2 grudnia 1804 roku w katedrze Notre-Dame w Paryżu.",
        sourceTitle: "Napoleon Bonaparte – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Napoleon_Bonaparte",
      },
      {
        text: "W 1812 roku Napoleon wyruszył z Wielką Armią na Rosję; wyprawa zakończyła się katastrofalnym odwrotem spod Moskwy.",
        sourceTitle: "Inwazja na Rosję (1812) – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Inwazja_na_Rosj%C4%99_(1812)",
      },
      {
        text: "Po abdykacji w 1814 roku Napoleon został zesłany na Elbę, skąd uciekł w 1815 roku i wrócił do władzy na okres zwany „Stu dniami”.",
        sourceTitle: "Sto dni Napoleona – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Sto_dni_Napoleona",
      },
      {
        text: "Napoleon przegrał bitwę pod Waterloo 18 czerwca 1815 roku, po czym został zesłany na Wyspę Świętej Heleny, gdzie zmarł w 1821 roku.",
        sourceTitle: "Bitwa pod Waterloo – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Bitwa_pod_Waterloo",
      },
    ],
  },
  {
    id: "henry_viii",
    name: "Henryk VIII",
    era: "1491–1547, Anglia",
    faceImageUrl: "/faces/henry_viii.png",
    portraitSource:
      "https://commons.wikimedia.org/wiki/File:After_Hans_Holbein_the_Younger_-_Portrait_of_Henry_VIII_-_Google_Art_Project.jpg",
    keywords: ["henryk viii", "henryk 8", "henry viii", "tudor", "boleyn"],
    wikipediaTitle: { pl: "Henryk VIII Tudor", en: "Henry VIII" },
    facts: [
      {
        text: "Henryk VIII miał sześć żon: Katarzynę Aragońską, Annę Boleyn, Jane Seymour, Annę z Kleve, Katarzynę Howard i Katarzynę Parr.",
        sourceTitle: "Henryk VIII Tudor – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Henryk_VIII_Tudor",
      },
      {
        text: "Dwie żony Henryka VIII zostały ścięte: Anna Boleyn w 1536 roku i Katarzyna Howard w 1542 roku.",
        sourceTitle: "Henryk VIII Tudor – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Henryk_VIII_Tudor",
      },
      {
        text: "Gdy papież odmówił unieważnienia małżeństwa z Katarzyną Aragońską, Henryk VIII zerwał z Rzymem; Akt supremacji z 1534 roku uczynił go głową Kościoła Anglii.",
        sourceTitle: "Akt supremacji – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Akt_supremacji",
      },
      {
        text: "W latach 1536–1541 Henryk VIII przeprowadził kasatę klasztorów w Anglii i przejął ich majątki.",
        sourceTitle: "Henryk VIII Tudor – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Henryk_VIII_Tudor",
      },
    ],
  },
  {
    id: "cleopatra",
    name: "Kleopatra VII",
    era: "69–30 p.n.e., Egipt",
    faceImageUrl: "/faces/cleopatra.png",
    portraitSource:
      "https://commons.wikimedia.org/wiki/File:Kleopatra-VII.-Altes-Museum-Berlin1.jpg",
    keywords: ["kleopatr", "cleopatr", "ptolemeusz", "akcjum"],
    wikipediaTitle: { pl: "Kleopatra", en: "Cleopatra" },
    facts: [
      {
        text: "Kleopatra VII była ostatnią władczynią Egiptu z dynastii Ptolemeuszy.",
        sourceTitle: "Kleopatra – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Kleopatra",
      },
      {
        text: "Kleopatra związała się z Juliuszem Cezarem i urodziła syna znanego jako Cezarion.",
        sourceTitle: "Kleopatra – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Kleopatra",
      },
      {
        text: "Flota Kleopatry i Marka Antoniusza przegrała z Oktawianem bitwę pod Akcjum w 31 roku p.n.e.",
        sourceTitle: "Bitwa pod Akcjum – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Bitwa_pod_Akcjum",
      },
      {
        text: "Kleopatra popełniła samobójstwo w 30 roku p.n.e., a Egipt stał się prowincją rzymską.",
        sourceTitle: "Kleopatra – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Kleopatra",
      },
    ],
  },
  {
    id: "caesar",
    name: "Juliusz Cezar",
    era: "100–44 p.n.e., Rzym",
    faceImageUrl: "/faces/caesar.png",
    portraitSource:
      "https://commons.wikimedia.org/wiki/File:Gaius_Iulius_Caesar_(Vatican_Museum).jpg",
    keywords: ["cezar", "caesar", "rubikon", "idy marcowe", "brutus"],
    wikipediaTitle: { pl: "Gajusz Juliusz Cezar", en: "Julius Caesar" },
    facts: [
      {
        text: "W latach 58–50 p.n.e. Juliusz Cezar podbił Galię.",
        sourceTitle: "Wojny galijskie – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Wojny_galijskie",
      },
      {
        text: "W 49 roku p.n.e. Cezar przekroczył z wojskiem Rubikon, rozpoczynając wojnę domową z Pompejuszem.",
        sourceTitle: "Gajusz Juliusz Cezar – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Gajusz_Juliusz_Cezar",
      },
      {
        text: "W 44 roku p.n.e. Cezar został mianowany dyktatorem wieczystym.",
        sourceTitle: "Gajusz Juliusz Cezar – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Gajusz_Juliusz_Cezar",
      },
      {
        text: "Cezar został zamordowany w idy marcowe, 15 marca 44 roku p.n.e., przez grupę senatorów, wśród których byli Brutus i Kasjusz.",
        sourceTitle: "Gajusz Juliusz Cezar – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Gajusz_Juliusz_Cezar",
      },
    ],
  },
  {
    id: "copernicus",
    name: "Mikołaj Kopernik",
    era: "1473–1543, Prusy Królewskie",
    faceImageUrl: "/faces/copernicus.png",
    portraitSource:
      "https://commons.wikimedia.org/wiki/File:Nikolaus_Kopernikus.jpg",
    keywords: ["kopernik", "copernicus", "heliocentry", "o obrotach"],
    wikipediaTitle: { pl: "Mikołaj Kopernik", en: "Nicolaus Copernicus" },
    facts: [
      {
        text: "Mikołaj Kopernik opisał heliocentryczny model Układu Słonecznego, w którym Ziemia krąży wokół Słońca.",
        sourceTitle: "Mikołaj Kopernik – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Miko%C5%82aj_Kopernik",
      },
      {
        text: "Dzieło Kopernika „O obrotach sfer niebieskich” ukazało się drukiem w Norymberdze w 1543 roku, w roku jego śmierci.",
        sourceTitle: "O obrotach sfer niebieskich – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/O_obrotach_sfer_niebieskich",
      },
      {
        text: "Kopernik był kanonikiem warmińskim i większość życia spędził we Fromborku.",
        sourceTitle: "Mikołaj Kopernik – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/Miko%C5%82aj_Kopernik",
      },
      {
        text: "W 1616 roku „O obrotach sfer niebieskich” trafiło na kościelny indeks ksiąg zakazanych.",
        sourceTitle: "O obrotach sfer niebieskich – Wikipedia",
        sourceUrl: "https://pl.wikipedia.org/wiki/O_obrotach_sfer_niebieskich",
      },
    ],
  },
];

export const characterById = new Map(characters.map((c) => [c.id, c]));
