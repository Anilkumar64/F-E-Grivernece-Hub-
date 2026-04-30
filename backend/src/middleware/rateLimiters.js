import rateLimit from "express-rate-limit";

const keyGenerator = (req) => req.userId || req.ip;

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many authentication attempts. Try again later." },
});

export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many uploads. Try again later." },
});
