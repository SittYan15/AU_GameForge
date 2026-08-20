import { Router } from "express";
import { updateUserPoints } from "../controllers/userController.js";
import { requireUser } from "../middleware/authToken.js";
import { getTopPlayers } from "../models/leaderboardModel.js";

const router = Router();

router.get("/leaderboard", async (_req, res, next) => {
    try {
        const players = await getTopPlayers(5);
        return res.status(200).json(players);
    } catch (error) {
        return next(error);
    }
});

router.patch("/:userId/points", requireUser, updateUserPoints);

export default router;