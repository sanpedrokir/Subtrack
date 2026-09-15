"use client";

import { useState } from "react";
import type { BillingCycle, Subscription } from "@/lib/subscriptions";

export interface SubscriptionFormValues {
  name: string;
  monthlyCost: string;
  billingCycle: BillingCycle;
  nextRenewalDate: string;
  notes: string;
  subscriberName: string;
  subscriberEmail: string;
  subscriberDivision: string;
}

const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function emptyFormValues(): SubscriptionFormValues {
  return {
    name: "",
    monthlyCost: "",
    billingCycle: "monthly",
    nextRenewalDate: todayIso(),
    notes: "",
    subscriberName: "",
    subscriberEmail: "",
    subscriberDivision: "",
  };
}

export function subscriptionToFormValues(sub: Subscription): SubscriptionFormValues {
  return {
    name: sub.name,
    monthlyCost: String(sub.monthlyCost),
    billingCycle: sub.billingCycle,
    nextRenewalDate: sub.nextRenewalDate,
    notes: sub.notes ?? "",
    subscriberName: sub.subscriberName ?? "",
    subscriberEmail: sub.subscriberEmail ?? "",
    subscriberDivision: sub.subscriberDivision ?? "",
  };
}

interface Props {
  title: string;
  initialValues: SubscriptionFormValues;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: SubscriptionFormValues) => Promise<string | void>;
}

export default function SubscriptionForm({
  title,
  initialValues,
  submitLabel,
  onCancel,
  onSubmit,
}: Props) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(values);
    setSubmitting(false);
    if (result) setError(result);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-zinc-900 sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Subscription name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              placeholder="e.g. Figma, Adobe Creative Cloud, Notion"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Monthly cost
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                value={values.monthlyCost}
                onChange={(e) =>
                  setValues({ ...values, monthlyCost: e.target.value })
                }
                placeholder="0.00"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Subscription period
              </label>
              <select
                value={values.billingCycle}
                onChange={(e) =>
                  setValues({
                    ...values,
                    billingCycle: e.target.value as BillingCycle,
                  })
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {BILLING_CYCLES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Next renewal date
            </label>
            <input
              type="date"
              required
              value={values.nextRenewalDate}
              onChange={(e) =>
                setValues({ ...values, nextRenewalDate: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <p className="mt-1 text-xs text-zinc-500">
              You&apos;ll get an email reminder when this is within 1 month away.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Subscriber name
              </label>
              <input
                type="text"
                required
                value={values.subscriberName}
                onChange={(e) =>
                  setValues({ ...values, subscriberName: e.target.value })
                }
                placeholder="e.g. Shannen"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Division
              </label>
              <input
                type="text"
                required
                value={values.subscriberDivision}
                onChange={(e) =>
                  setValues({ ...values, subscriberDivision: e.target.value })
                }
                placeholder="e.g. Engineering"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Subscriber email
            </label>
            <input
              type="email"
              required
              value={values.subscriberEmail}
              onChange={(e) =>
                setValues({ ...values, subscriberEmail: e.target.value })
              }
              placeholder="e.g. shannen@company.com"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Notes (optional)
            </label>
            <textarea
              value={values.notes}
              onChange={(e) => setValues({ ...values, notes: e.target.value })}
              rows={2}
              placeholder="e.g. shared team plan, paid by finance card"
              className="mt-1 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {submitting ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
