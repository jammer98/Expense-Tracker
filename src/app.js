import express from "express"
import httpLogger from "../src/middlewares/logger.middleware.js"
import { errorHandler } from "./middlewares/error.middleware.js";
import AuthRoutes from "../src/routes/auth.routes.js"
import CategoryRoutes from "../src/routes/category.routes.js"
import ExpenseRoute from "../src/routes/expense.routes.js"


const app = express();

app.use(httpLogger);
app.use(express.json());

app.use("/api/auth",AuthRoutes);
app.use("/api/categories",CategoryRoutes);
app.use("/api/expenses",ExpenseRoute);

app.use(errorHandler);

export default app;