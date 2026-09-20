import { Router } from "express";
import { CatchAsync } from "../utils/CatchAsync.js";
import { protect } from "../middlewares/auth.middleware.js";
import { create, list, getOne, update, remove } from "../controllers/expense.controller.js";

const router = Router();
router.use(protect); // every route require a valid token

router.post("/",CatchAsync(create));
router.get("/",CatchAsync(list));
router.get("/:id",CatchAsync(getOne));
router.patch("/:id",CatchAsync(update));
router.delete("/:id",CatchAsync(remove));

export default router;