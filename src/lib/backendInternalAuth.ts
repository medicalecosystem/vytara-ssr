const INTERNAL_API_KEY_HEADER = "x-vytara-internal-key";
const DEFAULT_DEV_INTERNAL_API_KEY = "vytara-local-dev-internal-key";

export function getBackendInternalApiKey(): string | null {
  const configuredKey = process.env.BACKEND_INTERNAL_API_KEY?.trim();
  if (configuredKey) {
    return configuredKey;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_INTERNAL_API_KEY;
  }

  return null;
}

export function getBackendInternalHeaders(): Record<string, string> {
  const apiKey = getBackendInternalApiKey();
  if (!apiKey) {
    return {};
  }

  return {
    [INTERNAL_API_KEY_HEADER]: apiKey,
  };
}

export function hasBackendInternalAuth(): boolean {
  return getBackendInternalApiKey() !== null;
}
