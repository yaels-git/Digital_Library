
import { getChannel, Q_WAIT } from "../config/rabbit.js";
import { addLog } from "./logsModule.js";

export async function scheduleNotification(loan, msBefore = undefined) {
  try {
    const ch = getChannel();
    if (!ch) return; // Rabbit לא זמין — מדלגים בשקט

    const pre = msBefore ?? Number(process.env.NOTIFY_BEFORE_MS || 24*60*60*1000); // 24h
    const dueTs = new Date(loan.dueAt).getTime();
    const delay = Math.max(0, dueTs - Date.now() - pre);

    const payload = {
      type: "due-soon",
      loanId: loan.id,
      userId: loan.userId,
      bookId: loan.bookId,
      dueAt: loan.dueAt,
      notifyAt: new Date(Date.now() + delay).toISOString(),
    };

    ch.sendToQueue(Q_WAIT, Buffer.from(JSON.stringify(payload)), {
      expiration: String(delay), // דחייה עד זמן ההתראה
      contentType: "application/json",
      persistent: true,
    });

    await addLog({ level: "info", message: "Notification scheduled", context: payload });
  } catch (err) {
    await addLog({ level: "warn", message: "Schedule notify failed", context: { err: err.message } });
  }
}
