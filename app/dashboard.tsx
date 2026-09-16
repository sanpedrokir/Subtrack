"use client";

import { useMemo, useState } from "react";
import type { Subscription } from "@/lib/subscriptions";
import SubscriptionForm, {
  emptyFormValues,
  subscriptionToFormValues,
  type SubscriptionFormValues,
} from "@/app/subscription-form";

interface Props {
  initialSubscriptions: Subscription[];
  currency: string;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function urgencyClasses(days: number): string {
  if (days < 0) return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
  if (days <= 7) return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  if (days <= 30)
    return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function renewalLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Renews today";
  if (days === 1) return "Renews tomorrow";
  return `Renews in ${days}d`;
}

export default function Dashboard({ initialSubscriptions, currency }: Props) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{
    answer: string;
    table: { columns: string[]; rows: string[][] } | null;
  } | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const formatCost = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-SG", {
      style: "currency",
      currency,
    });
    return (n: number) => formatter.format(n);
  }, [currency]);

  const active = subscriptions.filter((s) => s.status === "active");
  const cancelled = subscriptions.filter((s) => s.status === "cancelled");
  const totalMonthlyCost = active.reduce((sum, s) => sum + s.monthlyCost, 0);
  const expiringSoon = active.filter((s) => {
    const d = daysUntil(s.nextRenewalDate);
    return d >= 0 && d <= 30;
  });

  async function refresh() {
    const res = await fetch("/api/subscriptions");
    if (res.ok) setSubscriptions(await res.json());
  }

  async function handleCreate(values: SubscriptionFormValues) {
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        monthlyCost: Number(values.monthlyCost),
        billingCycle: values.billingCycle,
        nextRenewalDate: values.nextRenewalDate,
        notes: values.notes || null,
        subscriberName: values.subscriberName || null,
        subscriberEmail: values.subscriberEmail || null,
        subscriberDivision: values.subscriberDivision || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return body.error ?? "Failed to save subscription";
    }
    await refresh();
    setShowForm(false);
  }

  async function handleEdit(values: SubscriptionFormValues) {
    if (!editing) return;
    const res = await fetch(`/api/subscriptions/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        monthlyCost: Number(values.monthlyCost),
        billingCycle: values.billingCycle,
        nextRenewalDate: values.nextRenewalDate,
        notes: values.notes || null,
        subscriberName: values.subscriberName || null,
        subscriberEmail: values.subscriberEmail || null,
        subscriberDivision: values.subscriberDivision || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return body.error ?? "Failed to save subscription";
    }
    await refresh();
    setEditing(null);
  }

  async function handleCancel(sub: Subscription) {
    if (!confirm(`Cancel "${sub.name}"? It will be marked cancelled and stop sending renewal reminders.`)) return;
    await fetch(`/api/subscriptions/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    await refresh();
  }

  async function handleReactivate(sub: Subscription) {
    await fetch(`/api/subscriptions/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    await refresh();
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAskError(body.error ?? "Failed to get an answer");
      } else {
        setAnswer({ answer: body.answer, table: body.table ?? null });
      }
    } catch {
      setAskError("Failed to get an answer — see server console.");
    } finally {
      setAsking(false);
    }
  }

  async function handleDelete(sub: Subscription) {
    if (!confirm(`Permanently delete "${sub.name}"? This can't be undone.`)) return;
    await fetch(`/api/subscriptions/${sub.id}`, { method: "DELETE" });
    await refresh();
  }

  async function handleCheckNow() {
    setChecking(true);
    setCheckMessage(null);
    try {
      const res = await fetch("/api/check-expiring", { method: "POST" });
      const body = await res.json();
      if (body.checked === 0) {
        setCheckMessage("No subscriptions currently need a reminder.");
      } else {
        const sent = body.results.filter((r: { skipped: boolean; error?: string }) => !r.skipped && !r.error).length;
        const skipped = body.results.filter((r: { skipped: boolean }) => r.skipped).length;
        setCheckMessage(
          `Checked ${body.checked}: ${sent} email(s) sent${skipped ? `, ${skipped} skipped (no RESEND_API_KEY set)` : ""}.`
        );
      }
      await refresh();
    } catch {
      setCheckMessage("Check failed — see server console.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 pb-24 dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            SubTrack
          </h1>
          <div className="flex gap-2">
            <a
              href="/report"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Report
            </a>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              + Add
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Active subscriptions
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {active.length}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Total monthly cost
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCost(totalMonthlyCost)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Renewing within 30 days
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {expiringSoon.length}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-zinc-600 dark:text-zinc-400">
            Reminder emails go to kirsten_yong@tech.gov.sg and wee_wern_chau@tech.gov.sg, 30 days before renewal.
          </span>
          <button
            onClick={handleCheckNow}
            disabled={checking}
            className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {checking ? "Checking…" : "Check now"}
          </button>
        </div>
        {checkMessage && (
          <p className="mt-2 text-xs text-zinc-500">{checkMessage}</p>
        )}

        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Ask about your subscriptions
          </h2>
          <form onSubmit={handleAsk} className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. How much am I spending on design tools?"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {asking ? "Asking…" : "Ask"}
            </button>
          </form>
          {askError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{askError}</p>
          )}
          {answer && (
            <div className="mt-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                {answer.answer}
              </p>
              {answer.table && answer.table.rows.length > 0 && (
                <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-white text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
                        {answer.table.columns.map((col, i) => (
                          <th key={i} className="px-3 py-2">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {answer.table.rows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-zinc-100 bg-white last:border-0 dark:border-zinc-800 dark:bg-zinc-900"
                        >
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-zinc-700 dark:text-zinc-200">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Active
          </h2>
          {active.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No subscriptions yet. Tap “+ Add” to track your first one.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {active.map((sub) => {
                const days = daysUntil(sub.nextRenewalDate);
                return (
                  <li
                    key={sub.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {sub.name}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-500">
                          {formatCost(sub.monthlyCost)} / mo ·{" "}
                          <span className="capitalize">{sub.billingCycle}</span>
                        </p>
                        {(sub.subscriberName || sub.subscriberDivision) && (
                          <p className="mt-1 text-xs text-zinc-500">
                            {sub.subscriberName}
                            {sub.subscriberName && sub.subscriberDivision && " · "}
                            {sub.subscriberDivision}
                          </p>
                        )}
                        {sub.subscriberEmail && (
                          <p className="text-xs text-zinc-400">{sub.subscriberEmail}</p>
                        )}
                        {sub.notes && (
                          <p className="mt-1 text-xs text-zinc-400">{sub.notes}</p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${urgencyClasses(days)}`}
                      >
                        {renewalLabel(days)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <button
                        onClick={() => setEditing(sub)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleCancel(sub)}
                        className="rounded-lg border border-amber-300 px-3 py-1.5 font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                      >
                        Cancel subscription
                      </button>
                      <button
                        onClick={() => handleDelete(sub)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {cancelled.length > 0 && (
          <section className="mt-8">
            <button
              onClick={() => setShowCancelled((v) => !v)}
              className="text-sm font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Cancelled ({cancelled.length}) {showCancelled ? "▲" : "▼"}
            </button>
            {showCancelled && (
              <ul className="mt-3 flex flex-col gap-3">
                {cancelled.map((sub) => (
                  <li
                    key={sub.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-100/60 p-4 opacity-75 dark:border-zinc-800 dark:bg-zinc-900/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-700 line-through dark:text-zinc-300">
                          {sub.name}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-500">
                          {formatCost(sub.monthlyCost)} / mo ·{" "}
                          <span className="capitalize">{sub.billingCycle}</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <button
                        onClick={() => handleReactivate(sub)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Reactivate
                      </button>
                      <button
                        onClick={() => handleDelete(sub)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {showForm && (
        <SubscriptionForm
          title="Add subscription"
          submitLabel="Add subscription"
          initialValues={emptyFormValues()}
          onCancel={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}

      {editing && (
        <SubscriptionForm
          title={`Edit ${editing.name}`}
          submitLabel="Save changes"
          initialValues={subscriptionToFormValues(editing)}
          onCancel={() => setEditing(null)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}
