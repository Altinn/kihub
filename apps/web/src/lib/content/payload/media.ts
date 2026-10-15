import type { Media, User } from '@/payload-types';
import type { Author, ContentImage, ImageRendition, RenditionName } from '../types';

/**
 * 023 — Payload `Media` / `User` → KI Hub `ContentImage` / `Author` (data-model.md).
 *
 * Mapping is exact on purpose (research R3): every nullable stays nullable, a size entry that exists
 * is kept even with a `null` url, and an absent size key stays absent — so `pickCardImage`,
 * `pickArticleImage` and `LearningImage` keep their behaviour byte for byte.
 */

const RENDITIONS: readonly RenditionName[] = ['card', 'card2x', 'content', 'content2x'];

/** `null` for an unset relation or a bare id (not populated — e.g. the media item was deleted). */
export function toContentImage(value: number | Media | null | undefined): ContentImage | null {
  if (!value || typeof value !== 'object') return null;
  const renditions: ContentImage['renditions'] = {};
  for (const name of RENDITIONS) {
    const size = value.sizes?.[name];
    if (!size) continue;
    const rendition: ImageRendition = {
      url: size.url ?? null,
      width: size.width ?? null,
      height: size.height ?? null,
    };
    renditions[name] = rendition;
  }
  return {
    url: value.url ?? null,
    width: value.width ?? null,
    height: value.height ?? null,
    alt: value.alt,
    focalX: value.focalX ?? null,
    focalY: value.focalY ?? null,
    updatedAt: value.updatedAt ?? null,
    renditions,
  };
}

/** `null` when the relation is unset or unpopulated. */
export function toAuthor(value: number | User | null | undefined): Author | null {
  if (!value || typeof value !== 'object') return null;
  return { name: value.name ?? null, email: value.email ?? null };
}
