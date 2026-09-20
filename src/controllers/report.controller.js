import { getSummaryReport } from "../services/report.service.js";

export async function summary(req, res) {
  const { startDate, endDate } = req.query;
  const report = await getSummaryReport({ userId: req.user.id, startDate, endDate });
  res.status(200).json({ report });
}