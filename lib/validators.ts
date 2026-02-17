export const isUUID = (str: any): boolean => {
    if (typeof str !== 'string') return false;
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(str);
};

/**
 * Sanitizes a UUID field. Returns the UUID if valid, or null otherwise.
 * Useful for fields like superior_id or usuario_id that might receive mock data.
 */
export const sanitizeUUID = (id: any): string | null => {
    return isUUID(id) ? id : null;
};
