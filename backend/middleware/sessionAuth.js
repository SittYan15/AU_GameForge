export function requireSession(req, res, next) {
    if (!req.session?.accountType) {
        return res.status(401).json({ error: "An active player session is required." });
    }
    return next();
}

export function requireGuestSession(req, res, next) {
    if (req.session?.accountType !== "guest" || !Number.isSafeInteger(req.session.guestId)) {
        return res.status(401).json({ error: "An active guest session is required." });
    }
    return next();
}

export function requireTrustedOrigin(allowedOrigins) {
    return (req, res, next) => {
        const origin = req.get("origin");
        if (origin && !allowedOrigins.includes(origin)) {
            return res.status(403).json({ error: "Untrusted request origin." });
        }
        return next();
    };
}

export function establishSession(req, identity) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) return reject(error);
            Object.assign(req.session, identity);
            req.session.save((saveError) => saveError ? reject(saveError) : resolve());
        });
    });
}
