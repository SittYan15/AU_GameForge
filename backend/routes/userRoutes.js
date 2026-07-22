import { Router } from "express";
import { updateUserPoints } from "../controllers/userController.js";
import { requireUser } from "../middleware/authToken.js";

const router = Router();
router.patch("/:userId/points", requireUser, updateUserPoints);
export default router;
