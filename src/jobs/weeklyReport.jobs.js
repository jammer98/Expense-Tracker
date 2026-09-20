import cron from "node-cron";
import { Resend } from "resend";
import { getWeeklySummaryForAllUsers } from "../services/report.service.js";
import logger from "../utils/logger.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWeeklyReports() {
  logger.info("Running weekly report job");
  const summaries = await getWeeklySummaryForAllUsers();

  for (const user of summaries) {
    if (Number(user.count) === 0) continue; // skip users with nothing to report

    try {
      await resend.emails.send({
        from: "reports@yourdomain.com", // or resend's sandbox sender while testing
        to: user.email,
        subject: "Your weekly expense summary",
        html: `<p>Hi ${user.name},</p><p>You spent <strong>${user.total}</strong> across ${user.count} expenses this week.</p>`,
      });
      logger.info({ userId: user.user_id }, "Weekly report emailed");
    } catch (err) {
      logger.error({ err, userId: user.user_id }, "Failed to send weekly report");
    }
  }
}

// export function startWeeklyReportJob() {
//   cron.schedule("0 8 * * 1", sendWeeklyReports); // every Monday, 8 AM
//   logger.info("Weekly report job scheduled");
// }