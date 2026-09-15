import { Resend } from "resend";
import type { Subscription } from "./subscriptions";

const DEFAULT_RECIPIENTS = [
  "kirsten_yong@tech.gov.sg",
  "wee_wern_chau@tech.gov.sg",
];

function getRecipients(): string[] {
  const fromEnv = process.env.EMAIL_TO;
  if (!fromEnv) return DEFAULT_RECIPIENTS;
  return fromEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getFrom(): string {
  return process.env.EMAIL_FROM ?? "SubTrack <onboarding@resend.dev>";
}

function formatCost(cost: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: process.env.CURRENCY ?? "SGD",
  }).format(cost);
}

function renderHtml(sub: Subscription): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="margin-bottom: 4px;">Subscription renewing soon</h2>
      <p style="color:#555; margin-top:0;">This subscription is due to renew within the next month.</p>
      <table style="border-collapse: collapse; margin-top: 12px;">
        <tr><td style="padding:4px 12px 4px 0; color:#666;">Name</td><td style="padding:4px 0; font-weight:bold;">${sub.name}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#666;">Monthly cost</td><td style="padding:4px 0;">${formatCost(sub.monthlyCost)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#666;">Billing cycle</td><td style="padding:4px 0; text-transform:capitalize;">${sub.billingCycle}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#666;">Renewal date</td><td style="padding:4px 0;">${sub.nextRenewalDate}</td></tr>
        ${sub.notes ? `<tr><td style="padding:4px 12px 4px 0; color:#666;">Notes</td><td style="padding:4px 0;">${sub.notes}</td></tr>` : ""}
      </table>
      <p style="color:#888; font-size: 12px; margin-top: 20px;">Sent automatically by SubTrack. Cancel or update this subscription in the app if action is needed.</p>
    </div>
  `;
}

export interface SendResult {
  skipped: boolean;
  error?: string;
}

export async function sendExpiryReminder(
  sub: Subscription
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = getRecipients();

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping send for "${sub.name}". Would have emailed: ${recipients.join(", ")}`
    );
    return { skipped: true, error: "RESEND_API_KEY not set" };
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: getFrom(),
    to: recipients,
    subject: `Subscription renewing soon: ${sub.name} (${sub.nextRenewalDate})`,
    html: renderHtml(sub),
  });

  if (error) {
    console.error(`[email] Failed to send reminder for "${sub.name}":`, error);
    return { skipped: false, error: error.message };
  }

  return { skipped: false };
}
