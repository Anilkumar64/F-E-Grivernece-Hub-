import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";

const keyGenerator = (req) => req.userId || ipKeyGenerator(req.ip);

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isTest ? 10_000 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many authentication attempts. Try again later." },
});

export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: isTest ? 10_000 : 100,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: isTest ? 10_000 : 5,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many uploads. Try again later." },
});