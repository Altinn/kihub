import { type ContentSourceConfig, type SourceId, readContentSourceConfig } from './config';
import { payloadSources } from './payload';
import type {
  EventsSource,
  FrontpageSource,
  LearningSource,
  ModuleSources,
  NewsSource,
  ProjectsSource,
  SiteChromeSource,
} from './ports';

/**
 * 023 — the per-module switch (contracts/content-source.md §5). The ONLY module that imports a
 * content source's adapters; facades ask it for "the news source", never for Payload.
 *
 * Adding a source = one entry in `SOURCES` plus its adapters. Moving a module = one setting.
 */
const SOURCES: Readonly<Record<SourceId, ModuleSources>> = {
  payload: payloadSources,
};

/** Pure: each module from the source its setting names. */
export function resolveModuleSources(
  config: ContentSourceConfig,
  table: Readonly<Record<SourceId, ModuleSources>>,
): ModuleSources {
  return {
    news: table[config.news].news,
    events: table[config.events].events,
    projects: table[config.projects].projects,
    learning: table[config.learning].learning,
    frontpage: table[config.frontpage].frontpage,
    siteChrome: table[config.siteChrome].siteChrome,
  };
}

/**
 * Resolved once per process. A configuration error is cached and rethrown on EVERY call — never
 * replaced by a default — so a misconfigured module cannot serve. (The boot check in
 * `instrumentation.ts` normally stops the process before this is ever reached; this is the
 * defence-in-depth for scripts and tests, which do not run `register()`.)
 */
let resolved: { sources: ModuleSources } | { error: unknown } | undefined;

function sources(): ModuleSources {
  if (!resolved) {
    try {
      resolved = { sources: resolveModuleSources(readContentSourceConfig(process.env), SOURCES) };
    } catch (error) {
      resolved = { error };
    }
  }
  if ('error' in resolved) throw resolved.error;
  return resolved.sources;
}

export const newsSource = (): NewsSource => sources().news;
export const eventsSource = (): EventsSource => sources().events;
export const projectsSource = (): ProjectsSource => sources().projects;
export const learningSource = (): LearningSource => sources().learning;
export const frontpageSource = (): FrontpageSource => sources().frontpage;
export const siteChromeSource = (): SiteChromeSource => sources().siteChrome;
