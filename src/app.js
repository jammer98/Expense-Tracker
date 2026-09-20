import express from "express"
import httpLogger from "../src/middlewares/logger.middleware.js"
import { errorHandler } from "./middlewares/error.middleware.js";
import AuthRoutes from "../src/routes/auth.routes.js"


const app = express();

app.use(httpLogger);
app.use(express.json());

app.use("/api/auth",AuthRoutes);

app.use(errorHandler);

export default app;