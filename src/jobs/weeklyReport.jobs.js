import { Resend } from "resend";
import PDFDocument from "pdfkit";
import { getWeeklySummaryForAllUsers } from "../services/report.service.js";
import logger from "../utils/logger.js";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateReportPDF({ name, total, count, weekStart, weekEnd }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Weekly Expense Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Hi ${name},`);
    doc.moveDown();
    doc.text(`Period: ${weekStart} to ${weekEnd}`);
    doc.text(`Total spent: $${Number(total).toFixed(2)}`);
    doc.text(`Number of expenses: ${count}`);
    doc.end();
  });
}

export async function sendWeeklyReports() {
  logger.info("Running weekly report job");
  const summaries = await getWeeklySummaryForAllUsers();

  const weekEnd = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  for (const user of summaries) {
    if (Number(user.count) === 0) continue;

    let pdfBuffer;
    try {
      pdfBuffer = await generateReportPDF({
        name: user.name, total: user.total, count: user.count, weekStart, weekEnd,
      });
    } catch (err) {
      logger.error({ err, userId: user.user_id }, "Failed to generate weekly report PDF");
      continue;
    }

    const { data, error } = await resend.emails.send({
      from: "reports@yourdomain.com",
      to: user.email,
      subject: "Your weekly expense summary",
      html: `<p>Hi ${user.name},</p><p>Your weekly expense summary is attached.</p>`,
      attachments: [{ filename: "weekly-report.pdf", content: pdfBuffer }],
    });

    if (error) {
      logger.error({ error, userId: user.user_id }, "Failed to send weekly report email");
    } else {
      logger.info({ userId: user.user_id, emailId: data.id }, "Weekly report sent");
    }
  }
}

// cron.schedule("0 8 * * 1", sendWeeklyReports); // every Monday, 8 AM