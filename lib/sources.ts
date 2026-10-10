import type { Character } from "@/lib/schemas";

export interface Source {
  id: string;
  characterId: string;
  kind: "curated" | "wikipedia";
  title: string;
  url: string;
  text: string;
}

type WikiLang = "pl" | "en";

interface WikiArticle {
  title: string;
  url: string;
  text: string;
}

// Wikimedia mocno limituje anonimowe, generyczne User-Agenty; ustaw własny z kontaktem.
const USER_AGENT = process.env.WIKIPEDIA_USER_AGENT ?? "MemeHistory/0.1 (hackathon project)";
const FETCH_TIMEOUT_MS = 5000;
// Wstępy artykułów bywają długie; obcinamy na granicy akapitu. Weryfikacja
// cytatów działa na tym samym, obciętym tekście, który widzi model.
const MAX_ARTICLE_CHARS = 6000;

const articleCache = new Map<string, Promise<WikiArticle | null>>();

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Wikipedia ${response.status}: ${url}`);
  return response.json();
}

function apiUrl(lang: WikiLang, params: Record<string, string>): string {
  const query = new URLSearchParams({ format: "json", ...params });
  return `https://${lang}.wikipedia.org/w/api.php?${query}`;
}

function truncateAtParagraph(text: string): string {
  if (text.length <= MAX_ARTICLE_CHARS) return text;
  const cut = text.lastIndexOf("\n", MAX_ARTICLE_CHARS);
  return text.slice(0, cut > 0 ? cut : MAX_ARTICLE_CHARS).trim();
}

/**
 * MediaWiki Search API jako generator: jedno zapytanie znajduje hasło i od
 * razu zwraca jego wstęp oraz kanoniczny URL. Mniej zapytań = mniej 429.
 */
async function searchIntro(lang: WikiLang, query: string): Promise<WikiArticle | null> {
  const data = (await fetchJson(
    apiUrl(lang, {
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrlimit: "3",
      prop: "extracts|info",
      inprop: "url",
      exintro: "1",
      explaintext: "1",
      exlimit: "3",
    }),
  )) as {
    query?: {
      pages?: Record<string, { title: string; index: number; extract?: string; fullurl?: string }>;
    };
  };

  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  const page =
    pages.find((candidate) => candidate.title.toLowerCase() === query.toLowerCase()) ?? pages[0];
  if (!page?.extract?.trim() || !page.fullurl) return null;
  return { title: page.title, url: page.fullurl, text: page.extract };
}

/** REST API /page/summary: krótsze streszczenie, używane gdy wyszukiwanie nic nie zwróci. */
async function fetchSummary(lang: WikiLang, title: string): Promise<WikiArticle | null> {
  const summary = (await fetchJson(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title.replace(/ /g, "_"),
    )}`,
  )) as {
    type?: string;
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  };

  const url = summary.content_urls?.desktop?.page;
  if (summary.type !== "standard" || !summary.extract?.trim() || !url) return null;
  return { title: summary.title ?? title, url, text: summary.extract };
}

async function fetchArticle(lang: WikiLang, query: string): Promise<WikiArticle | null> {
  const article = (await searchIntro(lang, query)) ?? (await fetchSummary(lang, query));
  if (!article) return null;
  return {
    title: `${article.title} – Wikipedia (${lang})`,
    url: article.url,
    text: truncateAtParagraph(article.text.trim()),
  };
}

/** pl.wikipedia.org z fallbackiem na en. Błąd sieci = brak źródła, nie błąd żądania. */
function getWikipediaArticle(character: Character): Promise<WikiArticle | null> {
  const cached = articleCache.get(character.id);
  if (cached) return cached;

  const pending = (async () => {
    for (const lang of ["pl", "en"] as const) {
      try {
        const article = await fetchArticle(lang, character.wikipediaTitle[lang]);
        if (article) return article;
      } catch (error) {
        console.warn(`[sources] ${character.id}/${lang}:`, error);
      }
    }
    return null;
  })();

  articleCache.set(character.id, pending);
  // Nieudanych pobrań nie trzymamy w cache, żeby kolejne żądanie spróbowało ponownie.
  void pending.then((article) => {
    if (!article) articleCache.delete(character.id);
  });
  return pending;
}

/**
 * Zbiera źródła dla podanych postaci: najpierw kuratorskie fakty, potem
 * Wikipedia. Każde źródło dostaje identyfikator S1, S2... w tej kolejności.
 */
export async function collectSources(candidates: Character[]): Promise<Source[]> {
  // Po kolei, nie równolegle: seria jednoczesnych zapytań kończy się 429 z Wikipedii.
  const articles: (WikiArticle | null)[] = [];
  for (const character of candidates) {
    articles.push(await getWikipediaArticle(character));
  }
  const sources: Omit<Source, "id">[] = [];

  candidates.forEach((character, index) => {
    for (const fact of character.facts) {
      sources.push({
        characterId: character.id,
        kind: "curated",
        title: fact.sourceTitle,
        url: fact.sourceUrl,
        text: fact.text,
      });
    }
    const article = articles[index];
    if (article) {
      sources.push({ characterId: character.id, kind: "wikipedia", ...article });
    }
  });

  return sources.map((source, index) => ({ id: `S${index + 1}`, ...source }));
}
