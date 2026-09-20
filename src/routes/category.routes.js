import { Router } from "express";
import { CatchAsync } from "../utils/CatchAsync.js"
import { protect } from "../middlewares/auth.middleware.js";
import { listCategories } from "../controllers/category.controller.js";

const router = Router();

router.use(protect);

router.get("/",CatchAsync(listCategories));

export default router;