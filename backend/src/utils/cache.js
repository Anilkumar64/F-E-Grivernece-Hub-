let ready = false;

export const initCache = async () => {
    ready = true;
};

export const isCacheReady = () => ready;

export const closeCache = async () => {
    ready = false;
};

export const getCache = async (key) => {
    return null;
};

export const setCache = async (key, value, ttlSeconds = 300) => {
    return undefined;
};

export const delCache = async (pattern) => {
    return undefined;
};
