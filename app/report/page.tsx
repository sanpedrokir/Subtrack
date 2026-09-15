import Link from "next/link";
import { listSubscriptions } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const subscriptions = await listSubscriptions();
  const currency = process.env.CURRENCY ?? "SGD";
  const formatCost = new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
  }).format;

  return (
    <div className="min-h-full bg-white pb-24">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold text-zinc-900">
            Subscriptions report
          </h1>
          <div className="flex gap-2">
            <a
              href="/api/report/csv"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Download CSV
            </a>
            <Link
              href="/"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <p className="text-sm text-zinc-500">
          {subscriptions.length} entr{subscriptions.length === 1 ? "y" : "ies"} total.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Billing cycle</th>
                <th className="px-4 py-3">Next renewal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Subscriber</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Division</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Added on</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-zinc-900">{sub.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatCost(sub.monthlyCost)}</td>
                  <td className="px-4 py-3 capitalize text-zinc-700">{sub.billingCycle}</td>
                  <td className="px-4 py-3 text-zinc-700">{sub.nextRenewalDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        sub.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{sub.subscriberName ?? ""}</td>
                  <td className="px-4 py-3 text-zinc-500">{sub.subscriberEmail ?? ""}</td>
                  <td className="px-4 py-3 text-zinc-700">{sub.subscriberDivision ?? ""}</td>
                  <td className="px-4 py-3 text-zinc-500">{sub.notes ?? ""}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {sub.createdAt.slice(0, 10)}
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-zinc-400">
                    No subscriptions entered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
