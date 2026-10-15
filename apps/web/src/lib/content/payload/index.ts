import type { ModuleSources } from '../ports';
import { payloadEventsSource } from './events';
import { payloadLearningSource } from './learning';
import { payloadNewsSource } from './news';
import { payloadProjectsSource } from './projects';
import { payloadFrontpageSource, payloadSiteChromeSource } from './site-content';

/** 023 — the Payload content source, all six editorial modules. */
export const payloadSources: ModuleSources = {
  news: payloadNewsSource,
  events: payloadEventsSource,
  projects: payloadProjectsSource,
  learning: payloadLearningSource,
  frontpage: payloadFrontpageSource,
  siteChrome: payloadSiteChromeSource,
};
