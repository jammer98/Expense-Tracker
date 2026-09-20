import { Router } from "express";
import { CatchAsync } from "../utils/CatchAsync.js";
import { protect } from "../middleware/auth.middleware.js";
import { summary } from "../controllers/report.controller.js";

const router = Router();
router.use(protect);
router.get("/summary", CatchAsync(summary));

export default router;