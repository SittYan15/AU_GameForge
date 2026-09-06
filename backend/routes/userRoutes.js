import { Router } from "express";
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

router.patch("/:userId/points", (_req, res) => {
    res.status(403).json({ error: "Points are awarded by server-controlled game systems." });
});

export default router;
