import { NextResponse } from "next/server";
import { listSubscriptions } from "@/lib/subscriptions";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const subscriptions = await listSubscriptions();

  const header = [
    "Name",
    "Monthly Cost",
    "Billing Cycle",
    "Next Renewal",
    "Status",
    "Subscriber",
    "Subscriber Email",
    "Division",
    "Notes",
    "Added On",
  ];

  const rows = subscriptions.map((sub) =>
    [
      sub.name,
      String(sub.monthlyCost),
      sub.billingCycle,
      sub.nextRenewalDate,
      sub.status,
      sub.subscriberName ?? "",
      sub.subscriberEmail ?? "",
      sub.subscriberDivision ?? "",
      sub.notes ?? "",
      sub.createdAt.slice(0, 10),
    ]
      .map((v) => csvEscape(v))
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscriptions-report.csv"`,
    },
  });
}
