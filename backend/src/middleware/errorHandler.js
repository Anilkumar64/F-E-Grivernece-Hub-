// ✅ Comprehensive error handler with proper categorization
const errorHandler = (err, req, res, next) => {
    console.error("🔥 Error:", err);

    let statusCode = 500;
    let message = "Internal Server Error";
    let details = undefined;

    // Handle known error types
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = "Validation failed";
        details = Object.entries(err.errors)
            .map(([field, error]) => `${field}: ${error.message}`)
            .join(", ");
    } else if (err.name === "MongoError" && err.code === 11000) {
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

    // Only send stack trace in development
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