/**
 * Fixed wording of the discovery failures introduced with `artifactDirs` (028).
 *
 * Every whole-scan failure message is built here, from a stable `MARKERS` fragment plus the
 * offending value. The Norwegian contribution guide (`/bidra`) quotes the same fragments and a unit
 * test fails when a fragment has no troubleshooting entry, so rewording an error without updating
 * the guide breaks CI. Messages name the offending key or path only — never file contents.
 */
import { ARTIFACT_TYPES } from '@kihub/artifact-schema';

export const MARKERS = {
  emptyDiscovery: 'set artifactRoots, artifactDirs or both',
  unknownType: 'artifactDirs: unknown type',
  notAList: 'must be a non-empty list',
  unsafeDir: 'unsafe directory',
  dotNotAllowed: "'.' is not allowed",
  duplicateDir: 'duplicate directory',
  tooMany: 'directories in total',
  twoTypes: 'is listed for both',
  rootClash: 'but the root layout reads it as',
  missingDir: 'Configured artifact directory does not exist',
  nested: 'Artifact folders overlap',
} as const;

/** Every fixed fragment a whole-scan failure can carry; the guide must explain each one. */
export const DISCOVERY_FAILURE_MARKERS: readonly string[] = Object.values(MARKERS);

const AT = 'kihub.yaml.discovery';

export const emptyDiscoveryMessage = () => `${AT}: ${MARKERS.emptyDiscovery}`;

export function unknownTypeMessage(key: string, hint?: string): string {
  const valid = ARTIFACT_TYPES.join(', ');
  return `${AT}.${MARKERS.unknownType} ${JSON.stringify(key)} (valid: ${valid})${hint ? ` - did you mean '${hint}'?` : ''}`;
}

export const notAListMessage = (type: string) => `${AT}.artifactDirs.${type}: ${MARKERS.notAList} of directories`;

export const unsafeDirMessage = (type: string, value: unknown) =>
  `${AT}.artifactDirs.${type}: ${MARKERS.unsafeDir} ${JSON.stringify(value)}`;

export const dotNotAllowedMessage = (type: string) =>
  `${AT}.artifactDirs.${type}: ${MARKERS.dotNotAllowed}; use artifactRoots for the repository root`;

export const duplicateDirMessage = (type: string, dir: string) =>
  `${AT}.artifactDirs.${type}: ${MARKERS.duplicateDir} ${JSON.stringify(dir)}`;

export const tooManyMessage = (max: number) => `${AT}.artifactDirs: at most ${max} ${MARKERS.tooMany}`;

export const emptyDirsMessage = () => `${AT}.artifactDirs: must name at least one type with a directory`;

export const notAMappingMessage = () =>
  `${AT}.artifactDirs: must map an artifact type to a list of directories`;

export const twoTypesMessage = (dir: string, a: string, b: string) =>
  `${AT}.artifactDirs: '${dir}' ${MARKERS.twoTypes} '${a}' and '${b}'`;

export const rootClashMessage = (dir: string, listedType: string, rootType: string) =>
  `${AT}.artifactDirs: '${dir}' is listed for '${listedType}' ${MARKERS.rootClash} '${rootType}'`;

export const missingDirMessage = (dir: string, where?: string) =>
  `${MARKERS.missingDir}${where ? ` in ${where}` : ' or is not a directory'}: ${dir}`;

export const nestedMessage = (outer: string, inner: string) =>
  `${MARKERS.nested}: '${outer}' contains '${inner}'`;
