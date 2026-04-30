import { createClient } from "redis";

let client;
let ready = false;

export const initCache = async () => {
    if (!process.env.REDIS_URL || client) return;
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (error) => console.warn("Redis cache unavailable:", error.message));
    await client.connect();
    ready = true;
};

export const getCache = async (key) => {
    if (!ready) return null;
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
};

export const setCache = async (key, value, ttlSeconds = 300) => {
    if (!ready) return;
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
};

export const delCache = async (pattern) => {
    if (!ready) return;
    const keys = await client.keys(pattern);
    if (keys.length) await client.del(keys);
};
