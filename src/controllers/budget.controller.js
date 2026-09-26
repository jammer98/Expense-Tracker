import { upsertBudget, listBudgets } from "../services/budget.service.js";
import { AppError } from "../utils/AppError.js";

export async function setBudget(req, res) {
  const { categoryId, monthlyLimit } = req.body;
  if (!categoryId || !monthlyLimit) throw new AppError("categoryId and monthlyLimit are required", 400);
  const budget = await upsertBudget(req.user.id, categoryId, monthlyLimit);
  res.status(201).json({ budget });
}

export async function getBudgets(req, res) {
  const budgets = await listBudgets(req.user.id);
  res.status(200).json({ budgets });
}