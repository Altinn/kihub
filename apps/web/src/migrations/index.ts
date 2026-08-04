import * as migration_20260804_085101_baseline from './20260804_085101_baseline';

export const migrations = [
  {
    up: migration_20260804_085101_baseline.up,
    down: migration_20260804_085101_baseline.down,
    name: '20260804_085101_baseline'
  },
];
