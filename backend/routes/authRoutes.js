import { Router } from "express";
import { login, signup, signupGuest } from "../controllers/authController.js";
import { googleLogin, heartbeat, logout, upgradeGuest } from "../controllers/googleAuthController.js";
import { requireGuestSession, requireSession } from "../middleware/sessionAuth.js";

const router = Router();
router.post("/login", login);
router.post("/signup", signup);
router.post("/signup-guest", requireGuestSession, signupGuest);
router.post("/google", googleLogin);
router.post("/google/upgrade-guest", requireGuestSession, upgradeGuest);
router.post("/logout", logout);
router.post("/heartbeat", requireSession, heartbeat);
export default router;
