import * as migration_20260804_085101_baseline from './20260804_085101_baseline';
import * as migration_20260805_072326_events_type_format_capacity from './20260805_072326_events_type_format_capacity';

export const migrations = [
  {
    up: migration_20260804_085101_baseline.up,
    down: migration_20260804_085101_baseline.down,
    name: '20260804_085101_baseline',
  },
  {
    up: migration_20260805_072326_events_type_format_capacity.up,
    down: migration_20260805_072326_events_type_format_capacity.down,
    name: '20260805_072326_events_type_format_capacity'
  },
];
