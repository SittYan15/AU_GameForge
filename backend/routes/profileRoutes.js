import { Router } from "express";
import { getProfile } from "../controllers/profileController.js";
import { requireSession } from "../middleware/sessionAuth.js";

const router = Router();
router.get("/", requireSession, getProfile);
export default router;
