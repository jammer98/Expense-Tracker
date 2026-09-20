import { Router } from "express";
import { CatchAsync } from "../utils/CatchAsync";
import { protect } from "../middlewares/auth.middleware";
import { create, list, getOne, update, remove } from "../controllers/expense.controller";

const router = Router();
router.use(protect); // every route require a valid token

router.post("/",CatchAsync(create));
router.get("/",CatchAsync(list));
router.get("/:id",CatchAsync(getOne));
router.patch("/:id",CatchAsync(update));
router.delete("/:id",CatchAsync(remove));

export default router;