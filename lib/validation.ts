import { z } from "zod";

export const billingCycleSchema = z.enum([
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  monthlyCost: z.coerce.number().nonnegative("Monthly cost must be 0 or more"),
  billingCycle: billingCycleSchema,
  nextRenewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  monthlyCost: z.coerce.number().nonnegative().optional(),
  billingCycle: billingCycleSchema.optional(),
  nextRenewalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["active", "cancelled"]).optional(),
});
