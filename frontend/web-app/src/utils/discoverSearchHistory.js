export const DISCOVER_RECENT_QUERIES_KEY = 'healthsync.patient.discover.recent-queries';

const MAX_RECENT_QUERIES = 5;

const normalizeQuery = (value) => String(value || '').trim().toLowerCase();

const sanitizeQueries = (value) => {
    if (!Array.isArray(value)) return [];

    const seen = new Set();
    const nextQueries = [];

    value.forEach((item) => {
        const query = String(item || '').trim();
        const normalized = normalizeQuery(query);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        nextQueries.push(query);
    });

    return nextQueries.slice(0, MAX_RECENT_QUERIES);
};

export const readDiscoverRecentQueries = () => {
    if (typeof window === 'undefined') return [];

    try {
        const raw = window.localStorage.getItem(DISCOVER_RECENT_QUERIES_KEY);
        if (!raw) return [];

        return sanitizeQueries(JSON.parse(raw));
    } catch {
        return [];
    }
};

const writeDiscoverRecentQueries = (queries) => {
    if (typeof window === 'undefined') return queries;

    const nextQueries = sanitizeQueries(queries);

    try {
        window.localStorage.setItem(DISCOVER_RECENT_QUERIES_KEY, JSON.stringify(nextQueries));
    } catch {
        // Ignore localStorage write failures.
    }

    return nextQueries;
};

export const pushDiscoverRecentQuery = (value) => {
    const query = String(value || '').trim();
    if (!query) return readDiscoverRecentQueries();

    const normalized = normalizeQuery(query);
    const existing = readDiscoverRecentQueries();
    const deduped = existing.filter((item) => normalizeQuery(item) !== normalized);
    return writeDiscoverRecentQueries([query, ...deduped]);
};

export const removeDiscoverRecentQuery = (value) => {
    const normalized = normalizeQuery(value);
    const nextQueries = readDiscoverRecentQueries().filter((item) => normalizeQuery(item) !== normalized);
    return writeDiscoverRecentQueries(nextQueries);
};

export const clearDiscoverRecentQueries = () => {
    if (typeof window === 'undefined') return [];

    try {
        window.localStorage.removeItem(DISCOVER_RECENT_QUERIES_KEY);
    } catch {
        // Ignore localStorage delete failures.
    }

    return [];
};
