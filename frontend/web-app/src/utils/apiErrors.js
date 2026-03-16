export const sanitizeApiMessage = (message, fallback) => {
    if (typeof message !== 'string' || !message.trim()) {
        return fallback;
    }

    const rawErrorMarkers = [
        'SQLSTATE[',
        'Connection:',
        'insert into',
        'update `',
        'Unknown column',
        'select * from',
    ];

    const looksUnsafe = rawErrorMarkers.some((marker) => message.includes(marker));
    return looksUnsafe ? fallback : message;
};

export const extractApiErrorMessage = (error, fallback) => {
    const validationErrors = error?.response?.data?.errors;
    if (validationErrors) {
        const message = Object.values(validationErrors).flat().join(' ');
        return sanitizeApiMessage(message, fallback);
    }

    return sanitizeApiMessage(error?.response?.data?.message, fallback);
};
