import { addUserPoints, publicUser } from "../models/userModel.js";

export async function updateUserPoints(req, res, next) {
    try {
        const userId = Number(req.params.userId);
        const pointsToAdd = req.body?.pointsToAdd;
        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({ error: "Invalid user ID." });
        }
        if (req.auth.userId !== userId) {
            return res.status(403).json({ error: "You cannot update another user." });
        }
        if (!Number.isSafeInteger(pointsToAdd) || pointsToAdd <= 0 || pointsToAdd > 100000) {
            return res.status(400).json({ error: "pointsToAdd must be a positive integer up to 100000." });
        }

        const user = await addUserPoints(userId, pointsToAdd);
        if (!user) return res.status(404).json({ error: "User not found." });
        return res.status(200).json(publicUser(user));
    } catch (error) {
        return next(error);
    }
}
