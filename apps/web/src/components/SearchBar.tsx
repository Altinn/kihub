'use client';

import { Search } from '@digdir/designsystemet-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

/**
 * Catalog keyword search box (Phase 5). Sets/clears the `q` URL param while preserving the existing
 * `type`/`tag` filter params, so search and the Phase 2 filters compose on one catalog surface. It
 * only navigates — the server component re-renders results. Designsystemet only.
 */
export function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  function navigate(q: string) {
    const sp = new URLSearchParams(params.toString());
    const trimmed = q.trim();
    if (trimmed) sp.set('q', trimmed);
    else sp.delete('q');
    const qs = sp.toString();
    router.push(qs ? `/?${qs}` : '/');
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(value);
      }}
      style={{ marginBottom: '1rem' }}
    >
      <Search>
        <Search.Input
          aria-label="Search the catalog"
          placeholder="Search by keyword (name, description, README)…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Search.Clear
          onClick={() => {
            setValue('');
            navigate('');
          }}
        />
        <Search.Button type="submit">Search</Search.Button>
      </Search>
    </form>
  );
}
