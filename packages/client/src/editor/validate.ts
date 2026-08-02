/**
 * THE ONE ZONE GATE, client side: the validator moved into content
 * (Map Studio v2 Phase 6) so the server's save endpoint replays the
 * SAME laws. This shim keeps every studio import stable.
 */

export { validateZone, type ValidationResult } from '@arx/content';
