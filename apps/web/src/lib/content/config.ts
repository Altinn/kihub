import type { ContentModule } from './ports';

/**
 * 023 — which content source serves each editorial module (contracts/content-source.md §1–§2).
 *
 * One optional setting per module, read once at startup. Absent or blank means `payload`; values are
 * trimmed and case-insensitive; anything else is a configuration error. Settings for modules that do
 * not exist are never read, so they are ignored. There is deliberately NO fallback on error: a
 * mistyped value must stop the application, never quietly serve a module from the wrong source.
 */

/** Module order: the order errors are reported in. */
export const CONTENT_MODULES: readonly ContentModule[] = [
  'news',
  'events',
  'projects',
  'learning',
  'frontpage',
  'siteChrome',
];

export const SETTING_FOR_MODULE: Readonly<Record<ContentModule, string>> = {
  news: 'CONTENT_SOURCE_NEWS',
  events: 'CONTENT_SOURCE_EVENTS',
  projects: 'CONTENT_SOURCE_PROJECTS',
  learning: 'CONTENT_SOURCE_LEARNING',
  frontpage: 'CONTENT_SOURCE_FRONTPAGE',
  siteChrome: 'CONTENT_SOURCE_SITE_CHROME',
};

/** The implemented sources. The Umbraco feature adds `'umbraco'` here and to the registry table. */
export const SOURCE_IDS = ['payload'] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const DEFAULT_SOURCE: SourceId = 'payload';

export type ContentSourceConfig = Readonly<Record<ContentModule, SourceId>>;

export class ContentSourceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentSourceConfigError';
  }
}

function isSourceId(value: string): value is SourceId {
  return (SOURCE_IDS as readonly string[]).includes(value);
}

export function readContentSourceConfig(env: Record<string, string | undefined>): ContentSourceConfig {
  const config = {} as Record<ContentModule, SourceId>;
  const problems: string[] = [];

  for (const contentModule of CONTENT_MODULES) {
    const setting = SETTING_FOR_MODULE[contentModule];
    const raw = env[setting];
    const value = (raw ?? '').trim().toLowerCase();
    if (value === '') {
      config[contentModule] = DEFAULT_SOURCE;
    } else if (isSourceId(value)) {
      config[contentModule] = value;
    } else {
      problems.push(`${setting}="${raw}" (accepted: ${SOURCE_IDS.join(', ')})`);
    }
  }

  if (problems.length) {
    throw new ContentSourceConfigError(
      `Invalid content source configuration: ${problems.join('; ')}`,
    );
  }
  return config;
}
