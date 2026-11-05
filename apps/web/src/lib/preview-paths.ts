/**
 * 027 — pure helpers for the «Forhåndsvis» flow (contracts/preview-route.md §A).
 *
 * `previewUrl` feeds each draft-enabled collection's `admin.preview`; `isSafeInternalPath` guards the
 * `/api/preview` redirect so a crafted link can never bounce an editor to another origin.
 */

export type PreviewCollection = 'news' | 'learning-pages' | 'projects' | 'events' | 'pages';

const PREFIX: Record<PreviewCollection, string> = {
  news: '/news/',
  'learning-pages': '/laering/',
  projects: '/prosjekter/',
  events: '/events/',
  pages: '/',
};

/** The public address a document of `collection` with `slug` has once published. */
export function previewPathFor(collection: PreviewCollection, slug: string): string {
  return `${PREFIX[collection]}${encodeURIComponent(slug)}`;
}

/**
 * The CMS «Forhåndsvis» target, or `null` when the document has no address yet (Payload then hides
 * the button). Relative, so it stays on the origin the editor is already signed in to.
 */
export function previewUrl(
  collection: PreviewCollection,
  slug: string | null | undefined,
): string | null {
  if (typeof slug !== 'string' || !slug.trim()) return null;
  return `/api/preview?path=${encodeURIComponent(previewPathFor(collection, slug))}`;
}

const MAX_PATH_LENGTH = 512;

/**
 * True only for a same-origin absolute path: starts with a single `/`, no `//` or `/\` (which
 * browsers treat as protocol-relative), no backslashes, no control characters, no scheme, bounded.
 */
export function isSafeInternalPath(path: unknown): path is string {
  if (typeof path !== 'string') return false;
  if (path.length === 0 || path.length > MAX_PATH_LENGTH) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.includes('\\')) return false;
  if (/[\u0000-\u001f\u007f]/.test(path)) return false;
  // Belt and braces: resolving against a dummy origin must not change the origin.
  try {
    const url = new URL(path, 'http://kihub.invalid');
    if (url.origin !== 'http://kihub.invalid') return false;
  } catch {
    return false;
  }
  return true;
}
