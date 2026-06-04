const DEFAULT_BACKEND_API_URL = "http://localhost:34567";

export function normalizeBackendApiUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `http://${url}`;
}

export function getServerBackendApiUrl(): string {
  return normalizeBackendApiUrl(
    process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      DEFAULT_BACKEND_API_URL,
  ).replace(/\/$/, "");
}
