import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { listSubscriptions } from "@/lib/subscriptions";

const bodySchema = z.object({
  question: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not set" },
      { status: 500 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  }

  const subscriptions = await listSubscriptions();
  const currency = process.env.CURRENCY ?? "SGD";

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You answer questions about the user's software subscriptions using ONLY the data provided below. Each row is one person's subscription to one service — subscriberName/subscriberEmail/subscriberDivision identify who it's for (may be null for older entries). To count "how many people are subscribed to X", count the rows where name matches X. Be concise — a sentence or two, or a short list. Costs are in ${currency}, expressed as a monthly figure per subscription (monthlyCost). If a billing cycle isn't "monthly", monthlyCost is still the equivalent per-month amount. If the data doesn't answer the question, say so rather than guessing.

Subscriptions data (JSON):
${JSON.stringify(subscriptions, null, 2)}`,
        },
        { role: "user", content: parsed.data.question },
      ],
    });

    const answer = response.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ answer });
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status ?? 500 }
      );
    }
    throw err;
  }
}
