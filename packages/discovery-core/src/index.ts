export {
  scan,
  scanRepo,
  scanRepoDetailed,
  createLocalReader,
  type DetailedScanResult,
  type RawArtifact,
  type RepoReader,
  type ScanOptions,
} from './scan';
export {
  DEFAULT_ARTIFACT_ROOTS,
  DISCOVERY_CONFIG_PATH,
  DiscoveryConfigError,
  MAX_ARTIFACT_DIRS,
  MAX_ARTIFACT_ROOTS,
  normalizeArtifactRoot,
  normalizeRepository,
  resolveDiscoveryConfig,
  type ArtifactDirsMap,
  type ResolvedDiscoveryConfig,
} from './config';
export {
  assertNoNestedArtifacts,
  buildLayout,
  layoutForRoots,
  listedArtifactDirs,
  locateArtifact,
  matchArtifactDirs,
  type ArtifactContainer,
  type ArtifactLocation,
  type DiscoveryLayout,
} from './layout';
export {
  DISCOVERY_FAILURE_MARKERS,
  MARKERS as DISCOVERY_MARKERS,
  missingDirMessage,
} from './messages';
export { DIR_FOR_TYPE, TYPE_DIRS, TYPE_FOR_DIR, type ArtifactType } from './types';
export {
  artifactDirectoryDigest,
  comparePaths,
  digestKnownFiles,
  gitBlobOid,
  type ArtifactDigestEntry,
} from './digest';
export { buildRecord, deriveInstallCommand, type ArtifactRecord } from './record';
export {
  reconcile,
  UnsafeEmptyScanError,
  type IndexReport,
  type PayloadLike,
  type ReconcileOptions,
} from './reconcile';
