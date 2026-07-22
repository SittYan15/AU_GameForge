import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleCredential(credential) {
    if (!process.env.GOOGLE_CLIENT_ID) {
        const error = new Error("Google authentication is not configured.");
        error.status = 503;
        throw error;
    }
    if (typeof credential !== "string" || credential.length > 10000) {
        const error = new Error("A valid Google credential is required.");
        error.status = 400;
        throw error;
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email || payload.email_verified !== true) {
            const error = new Error("Google account email is not verified.");
            error.status = 401;
            throw error;
        }
        return {
            googleSub: payload.sub,
            email: payload.email.toLowerCase(),
            playerName: String(payload.name || payload.email.split("@")[0]).slice(0, 50),
            profilePictureUrl: payload.picture || null
        };
    } catch (error) {
        if (error.status) throw error;
        const invalid = new Error("Google credential verification failed.");
        invalid.status = 401;
        throw invalid;
    }
}
