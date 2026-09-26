import { getSummaryReport, getMonthOverMonth, getBudgetStatus } from "../services/report.service.js";
import { AppError } from "../utils/AppError.js";

export async function summary(req, res) {
  const { startDate, endDate } = req.query;
  const report = await getSummaryReport({ userId: req.user.id, startDate, endDate });
  res.status(200).json({ report });
}

export async function monthOverMonth(req, res) {
  const data = await getMonthOverMonth({ userId: req.user.id });
  res.status(200).json({ monthOverMonth: data });
}

export async function budgetStatus(req, res) {
  const { month } = req.query;
  if (!month) throw new AppError("month is required (format: YYYY-MM-01)", 400);
  const data = await getBudgetStatus({ userId: req.user.id, month });
  res.status(200).json({ budgetStatus: data });
}