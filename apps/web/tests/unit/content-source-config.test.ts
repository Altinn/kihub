import { describe, expect, it } from 'vitest';
import { ContentSourceConfigError, readContentSourceConfig } from '@/lib/content/config';
import type { ModuleSources } from '@/lib/content/ports';
import { resolveModuleSources } from '@/lib/content/registry';

/**
 * 023 T030 (US2, FR-010–FR-013, SC-005) — per-module content-source selection
 * (contracts/content-source.md §2, §5): `payload` is the default, values are trimmed and
 * case-insensitive, and ANY invalid value fails with one error listing every offender.
 */

const ALL_PAYLOAD = {
  news: 'payload',
  events: 'payload',
  projects: 'payload',
  learning: 'payload',
  frontpage: 'payload',
  siteChrome: 'payload',
};

describe('readContentSourceConfig', () => {
  it('defaults every module to payload when nothing is set', () => {
    expect(readContentSourceConfig({})).toEqual(ALL_PAYLOAD);
  });

  it('accepts an explicit payload, identical to unset', () => {
    expect(readContentSourceConfig({ CONTENT_SOURCE_NEWS: 'payload' })).toEqual(ALL_PAYLOAD);
  });

  it('trims and lower-cases; blank means the default', () => {
    expect(
      readContentSourceConfig({
        CONTENT_SOURCE_NEWS: ' Payload ',
        CONTENT_SOURCE_EVENTS: 'PAYLOAD',
        CONTENT_SOURCE_PROJECTS: '',
        CONTENT_SOURCE_LEARNING: '   ',
      }),
    ).toEqual(ALL_PAYLOAD);
  });

  it('maps every module to its own setting, including CONTENT_SOURCE_SITE_CHROME', () => {
    for (const setting of [
      'CONTENT_SOURCE_NEWS',
      'CONTENT_SOURCE_EVENTS',
      'CONTENT_SOURCE_PROJECTS',
      'CONTENT_SOURCE_LEARNING',
      'CONTENT_SOURCE_FRONTPAGE',
      'CONTENT_SOURCE_SITE_CHROME',
    ]) {
      expect(() => readContentSourceConfig({ [setting]: 'nope' })).toThrow(`${setting}="nope"`);
    }
  });

  it('rejects an unknown value, naming the setting, the raw value and the accepted values', () => {
    let error: unknown;
    try {
      readContentSourceConfig({ CONTENT_SOURCE_NEWS: 'paylod' });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ContentSourceConfigError);
    expect((error as Error).message).toBe(
      'Invalid content source configuration: CONTENT_SOURCE_NEWS="paylod" (accepted: payload)',
    );
  });

  it('reports EVERY invalid setting in ONE error, in module order', () => {
    expect(() =>
      readContentSourceConfig({
        CONTENT_SOURCE_SITE_CHROME: 'x',
        CONTENT_SOURCE_NEWS: 'paylod',
        CONTENT_SOURCE_EVENTS: 'umbraco',
      }),
    ).toThrow(
      'Invalid content source configuration: CONTENT_SOURCE_NEWS="paylod" (accepted: payload); ' +
        'CONTENT_SOURCE_EVENTS="umbraco" (accepted: payload); ' +
        'CONTENT_SOURCE_SITE_CHROME="x" (accepted: payload)',
    );
  });

  it('ignores settings for modules that do not exist', () => {
    expect(readContentSourceConfig({ CONTENT_SOURCE_SOMETHING: 'x', CONTENT_SOURCE_: 'y' })).toEqual(ALL_PAYLOAD);
  });
});

describe('resolveModuleSources (per-module independence)', () => {
  const sources = (tag: string): ModuleSources =>
    ({
      news: { tag },
      events: { tag },
      projects: { tag },
      learning: { tag },
      frontpage: { tag },
      siteChrome: { tag },
    }) as unknown as ModuleSources;

  it('takes each module from the source its setting names, and nothing else', () => {
    const table = { payload: sources('A'), fixture: sources('B') };
    const resolved = resolveModuleSources(
      { ...ALL_PAYLOAD, projects: 'fixture' } as never,
      table as never,
    );
    expect(resolved.projects).toBe(table.fixture.projects);
    for (const module of ['news', 'events', 'learning', 'frontpage', 'siteChrome'] as const) {
      expect(resolved[module]).toBe(table.payload[module]);
    }
  });
});
