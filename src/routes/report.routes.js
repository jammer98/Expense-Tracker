import { Router } from "express";
import { CatchAsync } from "../utils/CatchAsync.js";
import { protect } from "../middlewares/auth.middleware.js";
import { summary, monthOverMonth, budgetStatus, trend } from "../controllers/report.controller.js";

const router = Router();
router.use(protect);
router.get("/summary", CatchAsync(summary));
router.get("/month-over-month",CatchAsync(monthOverMonth));
router.get("/budget-status",CatchAsync(budgetStatus));
router.get("/trend", CatchAsync(trend));

export default router;