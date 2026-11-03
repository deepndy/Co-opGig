import type { AuthUser } from '../types/domain';

const TOKEN_KEY = 'coopgig.authToken';
const DEMO_SESSION_KEY = 'coopgig.demoSession';

function read(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode or policy). The app still works
    // for the current tab; it simply will not remember the session.
  }
}

function remove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

/**
 * JWT bearer token storage. The core backend may use httpOnly cookie sessions
 * instead; in that case the API never returns a token and this store is unused.
 * No secret or API key is ever stored here.
 */
export const authTokenStore = {
  get(): string | null {
    return read(TOKEN_KEY);
  },
  set(token: string): void {
    write(TOKEN_KEY, token);
  },
  clear(): void {
    remove(TOKEN_KEY);
  },
};

/** Persisted demo persona for the mock adapter only, never a real session. */
export const demoSessionStore = {
  get(): AuthUser | null {
    const raw = read(DEMO_SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (!parsed || typeof parsed !== 'object' || !parsed.id || !parsed.role) return null;
      return parsed;
    } catch {
      return null;
    }
  },
  set(user: AuthUser): void {
    write(DEMO_SESSION_KEY, JSON.stringify(user));
  },
  clear(): void {
    remove(DEMO_SESSION_KEY);
  },
};
