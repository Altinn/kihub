'use client';

import '@digdir/designsystemet-web';

/**
 * 026 R3 — loads Designsystemet's framework-free behaviour layer once per page, as progressive
 * enhancement for the plain-HTML ds-* components: the Invoker Commands polyfill (`command` /
 * `commandfor` on dialog triggers), card click delegation (`data-clickdelegatefor`) and field
 * wiring. Everything it enhances still works without it. Renders nothing.
 */
export function DesignsystemetWeb() {
  return null;
}
