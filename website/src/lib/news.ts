import { getCollection, type CollectionEntry } from "astro:content";

export type NewsArticle = CollectionEntry<"nyheter">;

const isAbsoluteUrl = (value: string) => /^(https?:)?\/\//.test(value) || value.startsWith("data:");

export const withBasePath = (base: string, path: string) => {
  if (isAbsoluteUrl(path)) return path;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path.replace(/^\//, "")}`;
};

export const getNewsUrl = (base: string, article: NewsArticle) =>
  withBasePath(base, `nyheter/${article.id}/`);

export const getNewsImageUrl = (base: string, image: string) => withBasePath(base, image);

export const formatNewsDate = (date: Date) =>
  new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

export const isPublishedNews = (article: NewsArticle, now = new Date()) => {
  if (article.data.draft) return false;
  // Compare at UTC day granularity: date-only pubDate strings (e.g. "2026-06-22") are
  // parsed as UTC midnight by z.coerce.date(), so comparing full timestamps would make
  // articles appear 2 h late in UTC+2. Slicing to YYYY-MM-DD keeps behaviour timezone-neutral.
  const pubDay = article.data.pubDate.toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  return pubDay <= today;
};

export const sortNewsByDate = (articles: NewsArticle[]) =>
  [...articles].sort((first, second) => second.data.pubDate.getTime() - first.data.pubDate.getTime());

export const getPublishedNews = async (now = new Date()) => {
  const articles = await getCollection("nyheter");
  return sortNewsByDate(articles.filter((article) => isPublishedNews(article, now)));
};
