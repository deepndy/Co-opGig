export const OPEN_ASSISTANT_EVENT = 'coopgig:assistant:open';

/** Requests the one app-level assistant widget to open. No duplicate is created. */
export function requestAssistant(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT));
  }
}
