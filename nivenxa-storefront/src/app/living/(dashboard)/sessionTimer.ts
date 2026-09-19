// How long the Living dashboard tolerates inactivity before signing out —
// see SessionTimeout.tsx, which re-arms this from scratch on every real
// activity event, so this is a true idle timeout, not a flat session cap.
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000
