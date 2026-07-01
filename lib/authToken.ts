// Auth token store. The token is persisted in localStorage so the session
// survives a page refresh (module memory is wiped on reload). An in-memory
// cache avoids repeated localStorage reads and keeps this SSR-safe.

const STORAGE_KEY = "medschedule_token";

let authToken: string | null = null;
let hydrated = false;

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window !== "undefined") {
    authToken = window.localStorage.getItem(STORAGE_KEY);
  }
}

export function setAuthToken(token: string | null): void {
  authToken = token;
  hydrated = true;
  if (typeof window !== "undefined") {
    if (token) {
      window.localStorage.setItem(STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export function getAuthToken(): string | null {
  if (!hydrated) hydrate();
  return authToken;
}
