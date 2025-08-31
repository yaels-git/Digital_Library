// worker.js
import { connectRabbit, channel } from "./config/rabbit.js";
import { Loan } from "./modules/loansModule.js";
import { Book } from "./modules/booksModule.js";

const QUEUE_NAME = "due_notifications";

const startWorker = async () => {
  await connectRabbit();

  await channel.assertQueue(QUEUE_NAME, { durable: true });

  console.log("👷 Worker listening for due notifications...");

  channel.consume(
    QUEUE_NAME,
    async (msg) => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());

        // בדיקה אם תוקף הספר קרוב לפוג
        const loan = await Loan.findByPk(data.loanId, { include: Book });
        if (loan) {
          const now = new Date();
          const due = new Date(loan.dueDate);
          const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

          if (diffDays <= 2 && !loan.returned) {
            // כאן אפשר לשלב שליחת מייל/סמס אמיתי
            console.log(
              `🔔 Reminder for user ${loan.userId}: return '${loan.Book.title}' in ${diffDays} days!`
            );
          }
        }

        channel.ack(msg);
      }
    },
    { noAck: false }
  );
};

startWorker();
