import { Router } from "express";
import { CatchAsync } from "../utils/CatchAsync.js"
import { register, login} from "../controllers/auth.controller.js"


const router = Router();

router.post("/register",CatchAsync(register));
router.post("/login",CatchAsync(login));

export default router;