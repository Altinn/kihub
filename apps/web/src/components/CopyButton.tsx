'use client';

import { Button } from '@digdir/designsystemet-react';
import { useState } from 'react';

/** Copy the given text (the install command) to the clipboard, with brief feedback. */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <Button type="button" variant="secondary" data-size="sm" onClick={copy}>
      {copied ? 'Copied' : label}
    </Button>
  );
}
