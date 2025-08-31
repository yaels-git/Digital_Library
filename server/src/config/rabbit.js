import amqplib from "amqplib";
import "dotenv/config";

let conn = null;
let ch = null;

const RABBIT_URL = process.env.RABBIT_URL || "amqp://localhost";
export const Q_WAIT  = "q.notify.wait";
export const Q_READY = "q.notify.ready";
export const DLX     = "ex.notify.dlx";
export const RK_READY = "notify.ready";

export async function initRabbit() {
  try {
    conn = await amqplib.connect(RABBIT_URL);
    ch = await conn.createChannel();

    // DLX לקבלת הודעות שפגו
    await ch.assertExchange(DLX, "direct", { durable: true });

    // תור ה"ready" (המוכן לעיבוד) + bind ל-DLX
    await ch.assertQueue(Q_READY, { durable: true });
    await ch.bindQueue(Q_READY, DLX, RK_READY);

    // תור ה-wait עם dead-letter-exchange
    await ch.assertQueue(Q_WAIT, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": DLX,
        "x-dead-letter-routing-key": RK_READY,
      },
    });

    console.log("✅ RabbitMQ connected");
  } catch (err) {
    console.warn("⚠️ RabbitMQ disabled:", err.message);
  }
}

export function getChannel() { return ch; }
