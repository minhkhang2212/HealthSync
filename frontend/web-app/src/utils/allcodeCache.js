const CACHE_PREFIX = 'allcodes-cache:';
const DEFAULT_TTL_MS = 10 * 60 * 1000;

const now = () => Date.now();

export const readAllcodeCache = (type) => {
    if (!type || typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(`${CACHE_PREFIX}${type}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.expiresAt || !Array.isArray(parsed?.data)) return null;
        if (parsed.expiresAt < now()) {
            window.sessionStorage.removeItem(`${CACHE_PREFIX}${type}`);
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
};

export const writeAllcodeCache = (type, data, ttlMs = DEFAULT_TTL_MS) => {
    if (!type || typeof window === 'undefined' || !Array.isArray(data)) return;
    try {
        window.sessionStorage.setItem(
            `${CACHE_PREFIX}${type}`,
            JSON.stringify({
                data,
                expiresAt: now() + ttlMs,
            })
        );
    } catch {
        // Ignore session storage write errors.
    }
};

