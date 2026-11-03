export {
  scan,
  scanRepo,
  scanRepoDetailed,
  createLocalReader,
  TYPE_DIRS,
  type DetailedScanResult,
  type RawArtifact,
  type RepoReader,
  type ScanOptions,
} from './scan';
export {
  DEFAULT_ARTIFACT_ROOTS,
  DISCOVERY_CONFIG_PATH,
  DiscoveryConfigError,
  MAX_ARTIFACT_ROOTS,
  normalizeArtifactRoot,
  normalizeRepository,
  resolveDiscoveryConfig,
  type ResolvedDiscoveryConfig,
} from './config';
export {
  artifactDirectoryDigest,
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
