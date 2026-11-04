'use client';

import { useState } from 'react';

/**
 * Copy the given text to the clipboard, with brief feedback.
 *
 * 014: the confirmation label is a prop. Both labels default to the previous English values so
 * existing call sites are unchanged.
 *
 * 026: a plain `ds-button` (Designsystemet CSS) instead of the React `Button` wrapper. The
 * confirmation is also announced: the button's own label change is not reliably read out, so a
 * visually hidden `role="status"` live region repeats it for screen readers.
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
    <>
      <button type="button" className="ds-button" data-variant="secondary" data-size="sm" onClick={copy}>
        {copied ? copiedLabel : label}
      </button>
      <span role="status" className="ds-sr-only">
        {copied ? copiedLabel : ''}
      </span>
    </>
  );
}
