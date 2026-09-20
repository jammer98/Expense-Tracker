import { Router } from "express";
import { catchAsync } from "../utils/CatchAsync.js"
import { register, login} from "../controllers/auth.controller.js"


const router = Router();

router.post("/register",catchAsync(register));
router.post("/login",catchAsync(login));

export default router;