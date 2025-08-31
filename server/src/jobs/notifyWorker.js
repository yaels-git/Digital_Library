import { getChannel, Q_READY } from "../config/rabbit.js";
import { addLog } from "../modules/logsModule.js";
import { Loan } from "../modules/loansModule.js";
import { Book } from "../modules/booksModule.js";

export async function startNotifyWorker() {
  const ch = getChannel();
  if (!ch) {
    console.warn("⚠️ notifyWorker not started (no Rabbit)");
    return;
  }

  await ch.consume(Q_READY, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      // אפשר לצרף מידע מה-DB לצורך ההודעה
      const loan = await Loan.findByPk(payload.loanId, { include: [Book] });

      console.log("📬 NOTIFY:", {
        toUser: payload.userId,
        book: loan?.Book?.title ?? payload.bookId,
        dueAt: payload.dueAt,
        type: payload.type,
      });

      await addLog({
        level: "info",
        message: "Notification sent",
        context: { ...payload, title: loan?.Book?.title },
      });

      ch.ack(msg);
    } catch (err) {
      console.error("notifyWorker error:", err.message);
      // למנוע לופ אינסופי — נעשה ack בכל מקרה
      ch.ack(msg);
    }
  }, { noAck: false });

  console.log("✅ notifyWorker started");
}
