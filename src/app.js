import express from "express"
import httpLogger from "../src/middlewares/logger.middleware.js"
import { errorHandler } from "./middlewares/error.middleware.js";
import AuthRoutes from "../src/routes/auth.routes.js"
import CategoryRoutes from "../src/routes/category.routes.js"
import ExpenseRoute from "../src/routes/expense.routes.js"
import BudgetRoutes from "../src/routes/budget.routes.js"
import ReportRoutes from "../src/routes/report.routes.js"
import cors from "cors"
import pool from "./config/Db.js";


const app = express();

app.use(httpLogger);
app.use(express.json());

app.use(cors({ origin: "http://localhost:5173" }));

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "error" });
  }
});

app.use("/api/auth",AuthRoutes);
app.use("/api/categories",CategoryRoutes);
app.use("/api/expenses",ExpenseRoute);
app.use("/api/budgets", BudgetRoutes);
app.use("/api/reports", ReportRoutes);

app.use(errorHandler);

export default app;