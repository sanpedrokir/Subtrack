import { NextRequest, NextResponse } from "next/server";
import { getExpiringSubscriptions, markReminderSent } from "@/lib/subscriptions";
import { sendExpiryReminder } from "@/lib/email";

async function runCheck() {
  const expiring = await getExpiringSubscriptions();
  const results = [];

  for (const sub of expiring) {
    const result = await sendExpiryReminder(sub);
    if (!result.skipped) {
      await markReminderSent(sub.id, sub.nextRenewalDate);
    }
    results.push({ name: sub.name, ...result });
  }

  return NextResponse.json({ checked: expiring.length, results });
}

// Manual trigger for the expiring-subscription email check, used by the
// "Check now" button in the dashboard.
export async function POST() {
  return runCheck();
}

// Scheduled trigger, called by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer <CRON_SECRET>` on cron-invoked requests when
// CRON_SECRET is set as an env var — reject anything else so this endpoint
// can't be used to spam reminder emails from the public internet.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return runCheck();
}
