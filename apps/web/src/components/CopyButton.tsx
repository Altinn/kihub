'use client';

import { Button } from '@digdir/designsystemet-react';
import { useState } from 'react';

/**
 * Copy the given text to the clipboard, with brief feedback.
 *
 * 014: the confirmation label is now a prop. It was hardcoded English ('Copied'), which was fine
 * while the only caller was the English artifact page, but the learning code block needs Norwegian
 * (FR-036). Both labels default to the previous English values so existing call sites are unchanged.
 */
export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
}) {
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
      {copied ? copiedLabel : label}
    </Button>
  );
}
