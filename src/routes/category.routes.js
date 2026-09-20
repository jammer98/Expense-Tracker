import { Router } from "express";
import { catchAsync } from "../utils/CatchAsync.js"
import { protect } from "../middlewares/auth.middleware.js";
import { listCategories } from "../controllers/category.controller";

const router = Router();

router.use(protect);

router.get("/",catchAsync(listCategories));

export default router;