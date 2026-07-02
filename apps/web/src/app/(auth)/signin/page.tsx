import { Alert, Button, Card, Heading, Paragraph } from '@digdir/designsystemet-react';
import { signIn } from '@/auth';

const AUTH_MODE = process.env.AUTH_MODE ?? 'mock';

const PERSONAS: { id: string; label: string; hint: string }[] = [
  { id: 'member', label: 'Ada Employee (home-tenant member)', hint: 'Allowed — reaches the shell' },
  { id: 'guest', label: 'Guest Consultant (guest account)', hint: 'Denied — not an employee' },
  {
    id: 'foreign-tenant',
    label: 'Other Tenant User (different tenant)',
    hint: 'Denied — foreign tenant',
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

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main style={{ maxWidth: '520px', margin: '0 auto', padding: '3rem 1rem' }}>
      <Heading level={1} data-size="lg" style={{ marginBottom: '0.5rem' }}>
        Sign in to KI Hub
      </Heading>
      <Paragraph data-size="sm" style={{ marginBottom: '1.5rem' }}>
        Only employees may access KI Hub.
      </Paragraph>

      {error ? (
        <Alert data-color="danger" style={{ marginBottom: '1.5rem' }}>
          Access denied. That identity is not an employee of the organization.
        </Alert>
      ) : null}

      {AUTH_MODE === 'entra' ? (
        <form action={signInEntra}>
          <Button type="submit" data-size="md">
            Sign in with Microsoft
          </Button>
        </form>
      ) : (
        <Card>
          <Heading level={2} data-size="xs" style={{ marginBottom: '0.75rem' }}>
            Development sign-in (mock)
          </Heading>
          <Paragraph data-size="sm" style={{ marginBottom: '1rem' }}>
            AUTH_MODE=mock — choose a persona. These emit the same claims a real Entra sign-in
            would, so the employee gate behaves identically.
          </Paragraph>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {PERSONAS.map((p) => (
              <form key={p.id} action={signInMock}>
                <input type="hidden" name="persona" value={p.id} />
                <Button type="submit" variant="secondary" data-size="sm" style={{ width: '100%' }}>
                  {p.label}
                </Button>
                <Paragraph data-size="xs" style={{ marginTop: '0.25rem' }}>
                  {p.hint}
                </Paragraph>
              </form>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}
