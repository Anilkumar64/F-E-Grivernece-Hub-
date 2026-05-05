// ✅ FIX MI-15: original handler called `console.error("🔥 Error:", err)` unconditionally,
// which logged the full error object (including stack trace) in production.
// Stack traces in production logs can expose internal file paths, library versions,
// and logic details useful to attackers. Now only the message is logged in production;
// the full stack is only logged in development.

const errorHandler = (err, req, res, next) => {
    if (process.env.NODE_ENV === "development") {
        console.error("🔥 Error:", err);
    } else {
        // Production: log only the message and status, never the stack
        console.error(`[${new Date().toISOString()}] ${err.name || "Error"}: ${err.message}`);
    }

    let statusCode = res.statusCode !== 200 ? res.statusCode : err.statusCode ?? 500;
    let message = "Internal Server Error";
    let details = undefined;

    if (err.name === "ValidationError") {
        statusCode = 400;
        message = "Validation failed";
        details = Object.entries(err.errors)
            .map(([field, error]) => `${field}: ${error.message}`)
            .join(", ");
    } else if ((err.name === "MongoError" || err.name === "MongoServerError") && err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyPattern)[0];
        message = `${field} already exists`;
    } else if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid ID format";
    } else if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid or malformed token";
    } else if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token has expired";
    } else if (err.statusCode) {
        statusCode = err.statusCode;
        message = err.message;
    }

    // Only expose stack trace in development
    if (process.env.NODE_ENV === "development") {
        details = err.stack;
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(details && { details }),
    });
};

const notFound = (req, res, next) => {
    const error = new Error(`Not found: ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export { errorHandler, notFound };