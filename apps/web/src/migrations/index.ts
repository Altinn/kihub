import * as migration_20260804_085101_baseline from './20260804_085101_baseline';
import * as migration_20260805_072326_events_type_format_capacity from './20260805_072326_events_type_format_capacity';
import * as migration_20260810_090312_learning_pages from './20260810_090312_learning_pages';
import * as migration_20260810_093128_media_uploads from './20260810_093128_media_uploads';
import * as migration_20260812_131624_agents_multisource from './20260812_131624_agents_multisource';

export const migrations = [
  {
    up: migration_20260804_085101_baseline.up,
    down: migration_20260804_085101_baseline.down,
    name: '20260804_085101_baseline',
  },
  {
    up: migration_20260805_072326_events_type_format_capacity.up,
    down: migration_20260805_072326_events_type_format_capacity.down,
    name: '20260805_072326_events_type_format_capacity',
  },
  {
    up: migration_20260810_090312_learning_pages.up,
    down: migration_20260810_090312_learning_pages.down,
    name: '20260810_090312_learning_pages',
  },
  {
    up: migration_20260810_093128_media_uploads.up,
    down: migration_20260810_093128_media_uploads.down,
    name: '20260810_093128_media_uploads',
  },
  {
    up: migration_20260812_131624_agents_multisource.up,
    down: migration_20260812_131624_agents_multisource.down,
    name: '20260812_131624_agents_multisource'
  },
];
