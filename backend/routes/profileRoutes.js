import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import { requireSession } from "../middleware/sessionAuth.js";
import { requireUser } from "../middleware/authToken.js";

const router = Router();
router.get("/", requireSession, getProfile);
router.put("/", requireSession, requireUser, updateProfile);
export default router;
