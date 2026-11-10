import type { ServerComponentProps } from 'payload';
import { pageAddress, type PageInChain } from '@/lib/page-tree';
import { getPageBySlug } from '@/lib/pages';

/**
 * 028 US2 (spec FR-018) — «Adresse på nettstedet» in the Sider sidebar: the full address employees
 * use, so editors know what to link to. Read-only and server-rendered when the form loads (it follows
 * the last SAVED state, not unsaved edits), computed with the same `lib/page-tree.ts` rules as the
 * route. Admin UI, so Payload's own styling, not Designsystemet (Principle VIII).
 */
export async function PageAddressField({ data }: Pick<ServerComponentProps, 'data'>) {
  const slug = typeof data?.slug === 'string' ? data.slug : null;
  if (!slug) return null;

  const [published, latest] = await Promise.all([
    getPageBySlug(slug),
    getPageBySlug(slug, { preview: true }),
  ]);
  const live = published ? pageAddress(published as PageInChain, { publishedOnly: true }) : null;
  const next = latest ? pageAddress(latest as PageInChain) : null;

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
      <span className="field-label">Adresse på nettstedet</span>
      {live ? (
        <p style={{ margin: 0, overflowWrap: 'anywhere' }}>
          <a href={live} target="_blank" rel="noreferrer">
            {live}
          </a>
        </p>
      ) : (
        <p style={{ margin: 0 }}>Ikke publisert ennå.</p>
      )}
      {next && next !== live ? (
        <p style={{ margin: 0, overflowWrap: 'anywhere' }}>
          Når siden og sidene over er publisert: {next}
        </p>
      ) : null}
      <p className="field-description" style={{ margin: 0 }}>
        Oppdateres når siden er lagret. Lenk til denne adressen; gamle adresser sendes videre hit.
      </p>
    </div>
  );
}
