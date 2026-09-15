import { listSubscriptions } from "@/lib/subscriptions";
import Dashboard from "@/app/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const subscriptions = await listSubscriptions();
  const currency = process.env.CURRENCY ?? "SGD";
  return <Dashboard initialSubscriptions={subscriptions} currency={currency} />;
}
