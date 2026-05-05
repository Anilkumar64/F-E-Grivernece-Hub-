import { createClient } from "redis";

let client;
let ready = false;

export const initCache = async () => {
    if (!process.env.REDIS_URL || client) return;

    client = createClient({ url: process.env.REDIS_URL });

    client.on("error", (err) => { console.warn("Redis error:", err.message); ready = false; });
    client.on("ready", () => { ready = true; });
    client.on("end", () => { ready = false; });
    client.on("reconnecting", () => { ready = false; });

    try {
        await client.connect();
    } catch (err) {
        console.warn("Redis unavailable (non-fatal):", err.message);
        client = null;
        ready = false;
    }
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

/**
 * Bug #3 fix — delete all keys matching a glob pattern.
 *
 * The old implementation used KEYS which is O(N) and blocks the Redis event loop
 * for the entire scan, causing latency spikes under load.
 *
 * This version uses cursor-based SCAN (O(1) per call) so the server stays
 * responsive.  Batch size of 100 is a sensible default; tune via env if needed.
 */
export const delCache = async (pattern) => {
    if (!ready) return;

    const batchSize = Number(process.env.REDIS_SCAN_BATCH) || 100;
    const toDelete = [];
    let cursor = 0;

    do {
        const reply = await client.scan(cursor, { MATCH: pattern, COUNT: batchSize });
        cursor = reply.cursor;
        toDelete.push(...reply.keys);
    } while (cursor !== 0);

    // DEL accepts multiple keys in one round-trip; no need to loop
    if (toDelete.length) await client.del(toDelete);
};