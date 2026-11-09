import { signIn } from '@/auth';

const AUTH_MODE = process.env.AUTH_MODE ?? 'mock';

const PERSONAS: { id: string; label: string; hint: string }[] = [
  { id: 'member', label: 'Ada Employee (leser)', hint: 'Tillatt — kommer inn i portalen' },
  { id: 'contributor', label: 'Cara Contributor', hint: 'Tillatt — redigere metadata, sende til vurdering' },
  { id: 'reviewer', label: 'Rita Reviewer', hint: 'Tillatt — registrere vurderinger' },
  { id: 'approver', label: 'Aksel Approver', hint: 'Tillatt — godkjenne/avvise, sette livsløp' },
  { id: 'admin', label: 'Aria Admin', hint: 'Tillatt — alt, inkludert rolleadministrasjon' },
  { id: 'guest', label: 'Guest Consultant (gjestekonto)', hint: 'Avvist — ikke ansatt' },
  {
    id: 'foreign-tenant',
    label: 'Other Tenant User (annen tenant)',
    hint: 'Avvist — annen organisasjon',
  },
];

async function signInMock(formData: FormData) {
  'use server';
  const persona = String(formData.get('persona') ?? '');
  await signIn('mock', { persona, redirectTo: '/' });
}

async function signInEntra() {
  'use server';
  await signIn('microsoft-entra-id', { redirectTo: '/' });
}

export const metadata = { title: 'Logg inn' };

/**
 * Sign-in (outside the protected group, so it renders its own `main` — the skip-link target).
 *
 * 026: Norwegian copy, plain Designsystemet markup (no React wrappers, no inline styles), and each
 * mock persona's hint is tied to its button with `aria-describedby`, so it is read with the button.
 * The persona NAMES stay as-is: they are the fixed mock identities the tests and docs refer to.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main id="main-content" tabIndex={-1} className="app-signin">
      <h1 className="ds-heading" data-size="lg">
        Logg inn på KI Hub
      </h1>
      <p className="ds-paragraph" data-size="sm">
        Bare ansatte har tilgang til KI Hub.
      </p>

      {error ? (
        <div className="ds-alert" data-color="danger" role="alert">
          <p className="ds-paragraph">
            Ingen tilgang. Denne identiteten er ikke ansatt i organisasjonen.
          </p>
        </div>
      ) : null}

      {AUTH_MODE === 'entra' ? (
        <form action={signInEntra}>
          <button type="submit" className="ds-button">
            Logg inn med Microsoft
          </button>
        </form>
      ) : (
        <section className="ds-card app-stack" data-color="neutral" aria-labelledby="mock-heading">
          <h2 id="mock-heading" className="ds-heading" data-size="xs">
            Utviklerinnlogging (mock)
          </h2>
          <div className="ds-alert" data-color="info">
            <p className="ds-paragraph" data-size="sm">
              <code>AUTH_MODE=mock</code> — velg en persona. De gir de samme claims som en ekte
              Entra-innlogging, så ansattsjekken oppfører seg likt.
            </p>
          </div>
          <ul className="app-persona-list">
            {PERSONAS.map((p) => (
              <li key={p.id}>
                <form action={signInMock}>
                  <input type="hidden" name="persona" value={p.id} />
                  <button
                    type="submit"
                    className="ds-button"
                    data-variant="secondary"
                    data-size="sm"
                    data-fullwidth="true"
                    aria-describedby={`persona-${p.id}-hint`}
                  >
                    {p.label}
                  </button>
                  <p id={`persona-${p.id}-hint`} className="ds-paragraph app-meta" data-size="xs">
                    {p.hint}
                  </p>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
