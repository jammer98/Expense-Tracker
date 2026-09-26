import { Router } from "express";
import { CatchAsync } from "../utils/CatchAsync.js";
import { protect } from "../middlewares/auth.middleware.js";
import { setBudget, getBudgets } from "../controllers/budget.controller.js";

const router = Router();
router.use(protect);
router.get("/", CatchAsync(getBudgets));
router.post("/", CatchAsync(setBudget));

export default router;