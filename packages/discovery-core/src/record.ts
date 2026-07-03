import type { ArtifactManifest } from '@kihub/artifact-schema';

/** The technical-metadata shape written to the Payload `artifacts` collection (data-model.md). */
export interface ArtifactRecord {
  artifactId: string;
  type: string;
  name: string;
  description: string;
  version: string;
  owner: { team: string; contact: string };
  source: { provider: string; repository: string; path: string };
  installCommand: string;
  readme: string;
  tags: string[];
  visibility: string;
  lifecycleStatus: string;
}

/** Derive the install command from the manifest's APM reference; empty when none (Principle V). */
export function deriveInstallCommand(manifest: ArtifactManifest): string {
  const pkg = manifest.install?.apm?.package;
  return pkg ? `apm install ${pkg}` : '';
}

/** Map a valid manifest (+ optional README) to the catalog record. Metadata only — no body. */
export function buildRecord(manifest: ArtifactManifest, readme = ''): ArtifactRecord {
  return {
    artifactId: manifest.id,
    type: manifest.type,
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    owner: { team: manifest.owner.team, contact: manifest.owner.contact },
    source: {
      provider: manifest.source.provider,
      repository: manifest.source.repository,
      path: manifest.source.path,
    },
    installCommand: deriveInstallCommand(manifest),
    readme,
    tags: manifest.tags ?? [],
    visibility: manifest.visibility,
    lifecycleStatus: manifest.lifecycle.status,
  };
}
