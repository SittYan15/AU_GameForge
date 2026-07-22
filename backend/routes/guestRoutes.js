import { Router } from "express";
import {
    createGuestAccount,
    getGuestAccount,
    restoreGuestAccount,
    updateCurrentGuestProfile,
    updateGuestPoints
} from "../controllers/guestController.js";
import { requireGuestSession } from "../middleware/sessionAuth.js";

const router = Router();

router.post("/", createGuestAccount);
router.post("/restore", restoreGuestAccount);
router.patch("/profile", requireGuestSession, updateCurrentGuestProfile);
router.get("/:guestCode", getGuestAccount);
router.patch("/:guestCode/points", updateGuestPoints);

export default router;
