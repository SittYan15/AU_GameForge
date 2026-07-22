import { verifyGoogleCredential } from "../config/googleAuth.js";
import { createAccessToken } from "../middleware/authToken.js";
import { establishSession } from "../middleware/sessionAuth.js";
import { createOrFindGoogleUser, upgradeGuestToGoogle } from "../models/googleAccountModel.js";

function responseWithToken(profile) {
    return { ...profile, token: createAccessToken(profile.userId) };
}

export async function googleLogin(req, res, next) {
    try {
        const googleProfile = await verifyGoogleCredential(req.body?.credential);
        const profile = await createOrFindGoogleUser(googleProfile);
        await establishSession(req, { accountType: "user", userId: profile.userId });
        return res.status(200).json(responseWithToken(profile));
    } catch (error) {
        return next(error);
    }
}

export async function upgradeGuest(req, res, next) {
    try {
        const googleProfile = await verifyGoogleCredential(req.body?.credential);
        const result = await upgradeGuestToGoogle(
            googleProfile,
            req.session.guestId,
            req.body?.mergeConfirmed === true
        );
        await establishSession(req, { accountType: "user", userId: result.profile.userId });
        return res.status(200).json({ ...responseWithToken(result.profile), merged: result.merged });
    } catch (error) {
        return next(error);
    }
}

export function logout(req, res, next) {
    req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie("au_gameforge_session");
        return res.status(200).json({ message: "Logged out." });
    });
}
