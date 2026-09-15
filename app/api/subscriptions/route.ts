import { NextRequest, NextResponse } from "next/server";
import { createSubscription, listSubscriptions } from "@/lib/subscriptions";
import { createSubscriptionSchema } from "@/lib/validation";

export async function GET() {
  return NextResponse.json(await listSubscriptions());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSubscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const subscription = await createSubscription(parsed.data);
  return NextResponse.json(subscription, { status: 201 });
}
