/**
 * 023 — the ONE fake Payload instance shared by a test file and its `vi.mock('payload')` factory.
 * The factory imports this module dynamically and the test imports it statically; both resolve to
 * the same module instance, so the test can swap fixtures and read the call log.
 */
import { FULL } from './content-fixtures';
import { createFakePayload } from './fake-payload';

export const fake = createFakePayload(FULL);
