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

export const isPublishedNews = (article: NewsArticle, now = new Date()) =>
  !article.data.draft && article.data.pubDate.getTime() <= now.getTime();

export const sortNewsByDate = (articles: NewsArticle[]) =>
  [...articles].sort((first, second) => second.data.pubDate.getTime() - first.data.pubDate.getTime());

export const getPublishedNews = async (now = new Date()) => {
  const articles = await getCollection("nyheter");
  return sortNewsByDate(articles.filter((article) => isPublishedNews(article, now)));
};
