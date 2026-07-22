export default function errorHandler(error, _req, res, _next) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status >= 500) console.error("Request failed:", error.message);
    const body = { error: status >= 500 ? "Internal Server Error" : error.message };
    if (status < 500 && error.details) Object.assign(body, error.details);
    res.status(status).json(body);
}
