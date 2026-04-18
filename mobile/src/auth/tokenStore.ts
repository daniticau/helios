// Module-local auth token cache. AuthProvider pushes updates; api.ts reads.
// Keeps api.ts synchronous and free of React dependencies.

let _token: string | null = null;

export function setCurrentAccessToken(token: string | null): void {
  _token = token;
}

export function getCurrentAccessToken(): string | null {
  return _token;
}
