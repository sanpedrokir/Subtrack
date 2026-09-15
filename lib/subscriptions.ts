import { randomUUID } from "node:crypto";
import pool, { ensureSchema } from "./db";

export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly";
export type SubscriptionStatus = "active" | "cancelled";

export interface Subscription {
  id: string;
  name: string;
  monthlyCost: number;
  billingCycle: BillingCycle;
  nextRenewalDate: string; // ISO date, YYYY-MM-DD
  status: SubscriptionStatus;
  notes: string | null;
  reminderSentForDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionRow {
  id: string;
  name: string;
  monthly_cost: number;
  billing_cycle: string;
  next_renewal_date: string;
  status: string;
  notes: string | null;
  reminder_sent_for_date: string | null;
  created_at: string;
  updated_at: string;
}

function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    monthlyCost: row.monthly_cost,
    billingCycle: row.billing_cycle as BillingCycle,
    nextRenewalDate: row.next_renewal_date,
    status: row.status as SubscriptionStatus,
    notes: row.notes,
    reminderSentForDate: row.reminder_sent_for_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateSubscriptionInput {
  name: string;
  monthlyCost: number;
  billingCycle: BillingCycle;
  nextRenewalDate: string;
  notes?: string | null;
}

export interface UpdateSubscriptionInput {
  name?: string;
  monthlyCost?: number;
  billingCycle?: BillingCycle;
  nextRenewalDate?: string;
  notes?: string | null;
  status?: SubscriptionStatus;
}

export async function listSubscriptions(): Promise<Subscription[]> {
  await ensureSchema();
  const { rows } = await pool.query<SubscriptionRow>(
    `SELECT * FROM subscriptions ORDER BY status ASC, next_renewal_date ASC`
  );
  return rows.map(rowToSubscription);
}

export async function getSubscription(
  id: string
): Promise<Subscription | undefined> {
  await ensureSchema();
  const { rows } = await pool.query<SubscriptionRow>(
    `SELECT * FROM subscriptions WHERE id = $1`,
    [id]
  );
  return rows[0] ? rowToSubscription(rows[0]) : undefined;
}

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<Subscription> {
  await ensureSchema();
  const now = new Date().toISOString();
  const id = randomUUID();

  await pool.query(
    `INSERT INTO subscriptions
      (id, name, monthly_cost, billing_cycle, next_renewal_date, status, notes, reminder_sent_for_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, NULL, $7, $7)`,
    [
      id,
      input.name,
      input.monthlyCost,
      input.billingCycle,
      input.nextRenewalDate,
      input.notes ?? null,
      now,
    ]
  );

  return (await getSubscription(id))!;
}

export async function updateSubscription(
  id: string,
  input: UpdateSubscriptionInput
): Promise<Subscription | undefined> {
  const existing = await getSubscription(id);
  if (!existing) return undefined;

  const next = {
    name: input.name ?? existing.name,
    monthlyCost: input.monthlyCost ?? existing.monthlyCost,
    billingCycle: input.billingCycle ?? existing.billingCycle,
    nextRenewalDate: input.nextRenewalDate ?? existing.nextRenewalDate,
    notes: input.notes === undefined ? existing.notes : input.notes,
    status: input.status ?? existing.status,
  };

  // If the renewal date changed, clear the reminder marker so a fresh
  // reminder can go out for the new cycle.
  const reminderSentForDate =
    next.nextRenewalDate !== existing.nextRenewalDate
      ? null
      : existing.reminderSentForDate;

  const now = new Date().toISOString();

  await pool.query(
    `UPDATE subscriptions
     SET name = $1, monthly_cost = $2, billing_cycle = $3, next_renewal_date = $4, notes = $5, status = $6, reminder_sent_for_date = $7, updated_at = $8
     WHERE id = $9`,
    [
      next.name,
      next.monthlyCost,
      next.billingCycle,
      next.nextRenewalDate,
      next.notes,
      next.status,
      reminderSentForDate,
      now,
      id,
    ]
  );

  return getSubscription(id);
}

export async function cancelSubscription(
  id: string
): Promise<Subscription | undefined> {
  return updateSubscription(id, { status: "cancelled" });
}

export async function deleteSubscription(id: string): Promise<void> {
  await ensureSchema();
  await pool.query(`DELETE FROM subscriptions WHERE id = $1`, [id]);
}

/**
 * Active subscriptions renewing within `withinDays` that have not already
 * had a reminder sent for their current nextRenewalDate.
 */
export async function getExpiringSubscriptions(
  withinDays = 30
): Promise<Subscription[]> {
  const all = await listSubscriptions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + withinDays);

  return all.filter((sub) => {
    if (sub.status !== "active") return false;
    if (sub.reminderSentForDate === sub.nextRenewalDate) return false;
    const renewal = new Date(sub.nextRenewalDate + "T00:00:00");
    return renewal >= today && renewal <= cutoff;
  });
}

export async function markReminderSent(
  id: string,
  forDate: string
): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE subscriptions SET reminder_sent_for_date = $1, updated_at = $2 WHERE id = $3`,
    [forDate, new Date().toISOString(), id]
  );
}
