import { findGuestById } from "../models/guestModel.js";
import { getUserProfile } from "../models/googleAccountModel.js";

export async function getProfile(req, res, next) {
    try {
        if (req.session.accountType === "user") {
            const profile = await getUserProfile(req.session.userId);
            if (!profile) return res.status(404).json({ error: "User profile not found." });
            return res.status(200).json(profile);
        }

        const guest = await findGuestById(req.session.guestId);
        if (!guest || guest.convertedToUserId) {
            return res.status(404).json({ error: "Guest profile not found." });
        }
        return res.status(200).json({
            accountType: "guest",
            userId: null,
            guestId: guest.id,
            guestCode: guest.guestCode,
            playerName: guest.playerName,
            email: null,
            profilePictureUrl: null,
            points: guest.points,
            avatarKey: guest.avatarKey,
            bio: guest.bio
        });
    } catch (error) {
        return next(error);
    }
}
