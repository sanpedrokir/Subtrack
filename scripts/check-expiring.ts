import { config } from "dotenv";
import path from "node:path";

// Loaded here (rather than relying on Next.js) because this script runs
// standalone via Windows Task Scheduler, outside the Next.js process.
config({ path: path.join(__dirname, "..", ".env.local") });

import { getExpiringSubscriptions, markReminderSent } from "../lib/subscriptions";
import { sendExpiryReminder } from "../lib/email";

async function main() {
  const timestamp = new Date().toISOString();
  const expiring = await getExpiringSubscriptions();

  if (expiring.length === 0) {
    console.log(`[${timestamp}] No subscriptions renewing within 30 days.`);
    return;
  }

  console.log(`[${timestamp}] ${expiring.length} subscription(s) renewing within 30 days:`);

  for (const sub of expiring) {
    console.log(`  - ${sub.name} renews ${sub.nextRenewalDate}, sending reminder...`);
    const result = await sendExpiryReminder(sub);
    if (result.skipped) {
      console.log(`    skipped: ${result.error}`);
    } else if (result.error) {
      console.log(`    failed: ${result.error}`);
    } else {
      await markReminderSent(sub.id, sub.nextRenewalDate);
      console.log(`    sent.`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("check-expiring failed:", err);
    process.exit(1);
  });
