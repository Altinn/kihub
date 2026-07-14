import config from '@payload-config';
import { getPayload } from 'payload';
import { notFound } from 'next/navigation';
import { hasPermission, type Role } from '@kihub/governance-core';
import {
  Button,
  Heading,
  Paragraph,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@digdir/designsystemet-react';
import { getCurrentActor } from '@/lib/governance';

const ROLES: Role[] = ['reader', 'contributor', 'reviewer', 'approver', 'admin'];

async function updateUserRole(formData: FormData) {
  'use server';
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.role as Role, 'manage-roles')) {
    notFound();
  }

  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '') as Role;
  if (!userId || !ROLES.includes(role)) return;

  const payload = await getPayload({ config });
  // overrideAccess: false + an explicit user — Payload's own `access`/hook checks run for real
  // (not a second, parallel authorization path), per research.md §8.
  await payload.update({
    collection: 'users',
    id: userId,
    data: { role },
    overrideAccess: false,
    user: actor,
  });
}

/**
 * Admin-only role management (FR-004). Server-side gated via `hasPermission` — a non-Admin
 * reaching this URL directly gets `notFound()`, not just a hidden nav link (FR-003).
 */
export default async function RolesAdminPage() {
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.role as Role, 'manage-roles')) {
    notFound();
  }

  const payload = await getPayload({ config });
  const { docs: users } = await payload.find({
    collection: 'users',
    sort: 'email',
    limit: 200,
    overrideAccess: true,
  });

  return (
    <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Heading level={1} data-size="md" style={{ marginBottom: '0.5rem' }}>
        Role administration
      </Heading>
      <Paragraph data-size="sm" style={{ marginBottom: '1.5rem' }}>
        Every role change takes effect on that user&apos;s next action — no re-login required
        (governance actions always read the current role from KI Hub, not a cached session claim).
      </Paragraph>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.name}</TableCell>
              <TableCell>
                <form action={updateUserRole} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="hidden" name="userId" value={String(u.id)} />
                  <Select name="role" defaultValue={u.role} data-size="sm">
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" data-size="sm" variant="secondary">
                    Save
                  </Button>
                </form>
              </TableCell>
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}
