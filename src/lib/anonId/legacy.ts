import {
  ANON_ID_MAX_LENGTH,
  MAX_LEGACY_ANON_IDS,
  ZCOUT_ANON_LEGACY_STORAGE_KEY,
} from './constants';

export function isValidAnonId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > ANON_ID_MAX_LENGTH) {
    return false;
  }

  return /^[\w.-]+$/.test(trimmed);
}

export function normalizeLegacyAnonIds(
  ids: Iterable<string>,
  canonical: string,
): string[] {
  const distinct = new Set<string>();

  for (const raw of ids) {
    const id = raw.trim();
    if (!id || id === canonical || !isValidAnonId(id)) {
      continue;
    }

    distinct.add(id);
  }

  return [...distinct].slice(0, MAX_LEGACY_ANON_IDS);
}

export function readStoredLegacyAnonIds(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ZCOUT_ANON_LEGACY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (value): value is string =>
        typeof value === 'string' && isValidAnonId(value),
    );
  } catch {
    return [];
  }
}

export function writeStoredLegacyAnonIds(ids: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (ids.length === 0) {
    window.localStorage.removeItem(ZCOUT_ANON_LEGACY_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    ZCOUT_ANON_LEGACY_STORAGE_KEY,
    JSON.stringify(ids),
  );
}

export function rememberLegacyAnonIds(
  canonical: string,
  candidateIds: Iterable<string>,
): string[] {
  const merged = normalizeLegacyAnonIds(
    [...readStoredLegacyAnonIds(), ...candidateIds],
    canonical,
  );

  writeStoredLegacyAnonIds(merged);
  return merged;
}

export function clearStoredLegacyAnonIds(): void {
  writeStoredLegacyAnonIds([]);
}

export function parseLegacyAnonHeader(header: string | null | undefined): string[] {
  if (!header?.trim()) {
    return [];
  }

  return header
    .split(',')
    .map((part) => part.trim())
    .filter((id) => isValidAnonId(id));
}
