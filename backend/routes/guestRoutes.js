import { Router } from "express";
import {
    createGuestAccount,
    getGuestAccount,
    restoreGuestAccount,
    updateCurrentGuestProfile
} from "../controllers/guestController.js";
import { requireGuestSession } from "../middleware/sessionAuth.js";

const router = Router();

router.post("/", createGuestAccount);
router.post("/restore", restoreGuestAccount);
router.patch("/profile", requireGuestSession, updateCurrentGuestProfile);
router.get("/:guestCode", getGuestAccount);
router.patch("/:guestCode/points", requireGuestSession, (_req, res) => {
    res.status(403).json({ error: "Points are awarded by server-controlled game systems." });
});

export default router;
