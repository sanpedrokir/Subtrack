import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { listSubscriptions } from "@/lib/subscriptions";

const bodySchema = z.object({
  question: z.string().min(1).max(500),
});

const answerJsonSchema = {
  name: "subscription_answer",
  strict: true,
  schema: {
    type: "object",
    properties: {
      answer: {
        type: "string",
        description: "A short natural-language summary (one sentence or two).",
      },
      table: {
        description:
          "Populate this when the answer lists two or more items (e.g. subscribers, subscriptions). Leave null for a single fact like a total or a yes/no.",
        anyOf: [
          {
            type: "object",
            properties: {
              columns: { type: "array", items: { type: "string" } },
              rows: {
                type: "array",
                items: { type: "array", items: { type: "string" } },
              },
            },
            required: ["columns", "rows"],
            additionalProperties: false,
          },
          { type: "null" },
        ],
      },
    },
    required: ["answer", "table"],
    additionalProperties: false,
  },
} as const;

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
      response_format: { type: "json_schema", json_schema: answerJsonSchema },
      messages: [
        {
          role: "system",
          content: `You answer questions about the user's software subscriptions using ONLY the data provided below. Each row is one person's subscription to one service — subscriberName/subscriberEmail/subscriberDivision identify who it's for (may be null for older entries). To count "how many people are subscribed to X", count the rows where name matches X.

Respond with JSON matching the schema: put a short summary in "answer", and whenever the question calls for listing two or more items (subscribers, subscriptions, etc.), fill "table" with appropriate columns and one row per item instead of listing them in "answer" — this keeps responses readable even if there are 100 rows. For a single fact (a total, a date, a yes/no), leave "table" null.

Costs are in ${currency}, expressed as a monthly figure per subscription (monthlyCost). If a billing cycle isn't "monthly", monthlyCost is still the equivalent per-month amount. If the data doesn't answer the question, say so in "answer" rather than guessing.

Subscriptions data (JSON):
${JSON.stringify(subscriptions, null, 2)}`,
        },
        { role: "user", content: parsed.data.question },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw) as {
      answer: string;
      table: { columns: string[]; rows: string[][] } | null;
    };

    return NextResponse.json(result);
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
