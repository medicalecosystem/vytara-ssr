export type RememberedAccount = {
  userId: string;
  name: string;
  phone: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export const REMEMBERED_ACCOUNT_KEY = "vytara_remembered_account";

const normalizeName = (value: string | null | undefined) => value?.trim() || "";

const isPlaceholderName = (value: string | null | undefined) =>
  normalizeName(value).toLowerCase() === "profile";

export const pickRememberedAccountName = (
  primary: string | null | undefined,
  secondary: string | null | undefined,
  fallback: string
) => {
  const primaryName = normalizeName(primary);
  if (primaryName && !isPlaceholderName(primaryName)) {
    return primaryName;
  }

  const secondaryName = normalizeName(secondary);
  if (secondaryName && !isPlaceholderName(secondaryName)) {
    return secondaryName;
  }

  return normalizeName(fallback) || "User";
};

export const readRememberedAccount = () => {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(REMEMBERED_ACCOUNT_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as RememberedAccount;
    if (!parsed?.userId || !parsed?.phone) {
      window.localStorage.removeItem(REMEMBERED_ACCOUNT_KEY);
      return null;
    }

    return {
      ...parsed,
      name: normalizeName(parsed.name) || "User",
    };
  } catch {
    window.localStorage.removeItem(REMEMBERED_ACCOUNT_KEY);
    return null;
  }
};

export const writeRememberedAccount = (account: RememberedAccount) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBERED_ACCOUNT_KEY, JSON.stringify(account));
};

export const clearRememberedAccount = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REMEMBERED_ACCOUNT_KEY);
};

export const syncRememberedAccountName = (userId: string, nextName: string) => {
  if (!userId || typeof window === "undefined") return;

  const stored = readRememberedAccount();
  const normalizedNextName = normalizeName(nextName);
  if (!stored || stored.userId !== userId || !normalizedNextName) {
    return;
  }

  if (stored.name === normalizedNextName) {
    return;
  }

  writeRememberedAccount({
    ...stored,
    name: normalizedNextName,
  });
};
