export const ZCOUT_ANON_LEGACY_STORAGE_KEY = 'zcout_anon_legacy_ids';

/** Maximum distinct legacy ids retained for claim-anon. */
export const MAX_LEGACY_ANON_IDS = 5;

/** Maximum length of a single anonymous id string. */
export const ANON_ID_MAX_LENGTH = 128;

export const ZCOUT_ANON_COOKIE = 'zcout_anon';

export const ZCOUT_ANON_ID_COOKIE = 'zcout_anon_id';

export const ZCOUT_ANON_ID_STORAGE_KEY = 'zcout_anon_id';

/** Matches vote / duels proxy cookies (2 years). */
export const ANON_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;

/** Legacy AuthStatus cookie lifetime (1 year). */
export const ANON_ID_COOKIE_MAX_AGE_SECONDS = 31536000;
